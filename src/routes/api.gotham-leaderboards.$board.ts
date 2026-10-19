import { createFileRoute } from '@tanstack/react-router'

// The mod's embedded leaderboard API lives on the game host over plain HTTP. This route proxies
// it server-side so the browser only ever talks to thematic.bond over HTTPS - calling the mod
// directly from client-side JS would be blocked as mixed content once the site is served over
// HTTPS (see src/lib/gotham.ts).
//
// Read at request time, not build time. Self-hosted, the site runs on the same box as the
// server and sets this to reach it container-to-container (http://mc-prod:25547), so the API
// needs no public port at all.
const GOTHAM_API_BASE = process.env.GOTHAM_API_BASE ?? 'http://208.92.233.96:25547'
const VALID_BOARDS = new Set(['index', 'elo', 'guilds', 'guild-contributions', 'economy', 'crafting-event'])

// The mod's usercache lacks many players, so it reports "Unknown". Fill those in from Mojang's
// public profile API by uuid. Cached in memory (hits 24h, misses 1h), a few lookups at a time,
// short timeout; any failure leaves the name as it was and never fails the response.
const HIT_MS = 24 * 3600_000
const MISS_MS = 3600_000
const MAX_CACHE = 5000
const MAX_CONCURRENT = 10
const nameCache = new Map<string, { name: string | null; until: number }>()
const pending = new Map<string, Promise<string | null>>()
let active = 0
const waiters: (() => void)[] = []

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiters.push(r))
  active++
  try {
    return await fn()
  } finally {
    active--
    waiters.shift()?.()
  }
}

function lookupName(uuid: string): Promise<string | null> {
  const key = uuid.replace(/-/g, '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(key)) return Promise.resolve(null)
  const hit = nameCache.get(key)
  if (hit && hit.until > Date.now()) {
    nameCache.delete(key) // refresh LRU position
    nameCache.set(key, hit)
    return Promise.resolve(hit.name)
  }
  let p = pending.get(key)
  if (!p) {
    p = slot(async () => {
      let name: string | null = null
      try {
        const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${key}`, { signal: AbortSignal.timeout(2500) })
        if (res.ok) {
          const j = (await res.json()) as { name?: unknown }
          if (typeof j.name === 'string') name = j.name

        }
      } catch {
        // unreachable or slow: negative-cache briefly so a dead Mojang isn't hammered
      }
      nameCache.set(key, { name, until: Date.now() + (name ? HIT_MS : MISS_MS) })
      if (nameCache.size > MAX_CACHE) nameCache.delete(nameCache.keys().next().value as string)
      return name
    }).finally(() => pending.delete(key))
    pending.set(key, p)
  }
  return p
}

const missing = (n: unknown) => typeof n !== 'string' || n === '' || n === 'Unknown'

// Fills `username` on rows that have a uuid. Guild rows only have an owner name, no owner uuid, so
// ownerUsername cannot be resolved unless the row carries an `ownerUuid`.
async function resolveNames(body: string): Promise<string> {
  try {
    const json = JSON.parse(body)
    const rows: Record<string, unknown>[] = Array.isArray(json) ? json : Array.isArray(json?.entries) ? json.entries : []
    await Promise.all(
      rows.map(async (row) => {
        if (!row || typeof row !== 'object') return
        if (typeof row.uuid === 'string' && missing(row.username)) {
          const n = await lookupName(row.uuid)
          if (n) row.username = n
        }
        if (typeof row.ownerUuid === 'string' && missing(row.ownerUsername)) {
          const n = await lookupName(row.ownerUuid)
          if (n) row.ownerUsername = n
        }
      }),
    )
    return JSON.stringify(json)
  } catch {
    return body
  }
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}

export const Route = createFileRoute('/api/gotham-leaderboards/$board')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!VALID_BOARDS.has(params.board)) {
          return jsonError(`unknown leaderboard: ${params.board}`, 404)
        }

        const search = new URL(request.url).search
        try {
          const upstream = await fetch(`${GOTHAM_API_BASE}/api/leaderboards${params.board === 'index' ? '' : `/${params.board}`}${search}`, {
            signal: AbortSignal.timeout(5000),
          })
          let body = await upstream.text()
          if (upstream.ok && params.board !== 'index') body = await resolveNames(body)
          return new Response(body, {
            status: upstream.status,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=15' },
          })
        } catch {
          return jsonError('gotham server unreachable', 502)
        }
      },
    },
  },
})
