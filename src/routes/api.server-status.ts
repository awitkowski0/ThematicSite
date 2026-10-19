import { createFileRoute } from '@tanstack/react-router'
import { resolveSrv } from 'node:dns/promises'
import net from 'node:net'

import type { PingResult, ServerStatus } from '../lib/serverStatus'

// Live status for the /server page. There is no status source on the game side, so this speaks
// the Minecraft Server List Ping (handshake + status request, 1.20.1 / protocol 763) over plain
// TCP. It never sends a login packet.
//
// Primary: the PUBLIC join address (SERVER_STATUS_ADDRESS, default thematic.bond), resolved the
// way a Minecraft client does (SRV _minecraft._tcp.<address>, else <address>:25565), so it stays
// right after a migration when only DNS changes.
// Optional: SERVER_STATUS_TARGETS names internal backends for a per-realm breakdown:
// `main=mc-prod:25565,gotham=host:25565`. Unset by default. Hostnames never reach the response.
const PROTOCOL = 763
const TIMEOUT_MS = 3000
const CACHE_MS = 15_000

const LABELS: Record<string, string> = { main: 'Main', gotham: 'Gotham', resource: 'Resource world' }

type Target = { id: string; host: string; port: number }

function parseTargets(raw: string | undefined): Target[] {
  const out: Target[] = []
  for (const part of (raw ?? '').split(',')) {
    const m = /^\s*([\w-]+)\s*=\s*([^:\s]+):(\d{1,5})\s*$/.exec(part)
    if (m) out.push({ id: m[1], host: m[2], port: Number(m[3]) })
  }
  return out
}

function varInt(n: number): Buffer {
  const bytes: number[] = []
  do {
    let b = n & 0x7f
    n >>>= 7
    if (n) b |= 0x80
    bytes.push(b)
  } while (n)
  return Buffer.from(bytes)
}

const packet = (body: Buffer) => Buffer.concat([varInt(body.length), body])

/** Reads a varint at `offset`; null if the buffer ends first. */
function readVarInt(buf: Buffer, offset: number): { value: number; next: number } | null {
  let value = 0
  for (let i = 0; i < 5; i++) {
    const b = buf[offset + i]
    if (b === undefined) return null
    value |= (b & 0x7f) << (7 * i)
    if (!(b & 0x80)) return { value, next: offset + i + 1 }
  }
  return null
}

// A chat component (string, or object with text + extra) flattened to plain text, colour codes dropped.
function flattenText(c: unknown): string {
  if (typeof c === 'string') return c
  if (!c || typeof c !== 'object') return ''
  const o = c as { text?: unknown; extra?: unknown[] }
  return (typeof o.text === 'string' ? o.text : '') + (Array.isArray(o.extra) ? o.extra.map(flattenText).join('') : '')
}

function ping(t: Target): Promise<PingResult> {
  const offline = { online: false, players: 0, max: 0, motd: '', version: '', latencyMs: null, sample: [] as string[] }
  return new Promise((resolve) => {
    const started = Date.now()
    const host = Buffer.from(t.host)
    const handshake = Buffer.concat([varInt(0), varInt(PROTOCOL), varInt(host.length), host, Buffer.from([t.port >> 8, t.port & 0xff]), varInt(1)])
    const socket = net.connect(t.port, t.host)
    let buf = Buffer.alloc(0)
    let done = false
    const finish = (r: PingResult) => {
      if (done) return
      done = true
      socket.destroy()
      resolve(r)
    }
    socket.setTimeout(TIMEOUT_MS, () => finish(offline))
    socket.on('error', () => finish(offline))
    socket.on('close', () => finish(offline))
    socket.on('connect', () => socket.write(Buffer.concat([packet(handshake), packet(varInt(0))])))
    socket.on('data', (d) => {
      buf = Buffer.concat([buf, d])
      if (buf.length > 1_000_000) return finish(offline)
      const len = readVarInt(buf, 0)
      if (!len || buf.length < len.next + len.value) return
      const id = readVarInt(buf, len.next)
      const strLen = id && readVarInt(buf, id.next)
      if (!id || !strLen || buf.length < strLen.next + strLen.value) return
      try {
        const j = JSON.parse(buf.subarray(strLen.next, strLen.next + strLen.value).toString('utf8'))
        const sample: unknown[] = Array.isArray(j.players?.sample) ? j.players.sample : []
        finish({
          online: true,
          players: Number(j.players?.online) || 0,
          max: Number(j.players?.max) || 0,
          motd: flattenText(j.description).replace(/§./g, '').trim(),
          version: typeof j.version?.name === 'string' ? j.version.name : '',
          latencyMs: Date.now() - started,
          sample: sample.map((p) => (p as { name?: unknown }).name).filter((n): n is string => typeof n === 'string').slice(0, 20),
        })
      } catch {
        finish(offline)
      }
    })
  })
}

async function resolvePublic(address: string): Promise<Target> {
  try {
    const srv = (await resolveSrv(`_minecraft._tcp.${address}`)).sort((a, b) => a.priority - b.priority || b.weight - a.weight)[0]
    if (srv) return { id: 'public', host: srv.name, port: srv.port }
  } catch {
    // no SRV record: fall through to the plain address
  }
  return { id: 'public', host: address, port: 25565 }
}

let cache: { at: number; body: ServerStatus } | null = null
let inflight: Promise<ServerStatus> | null = null

async function collect(): Promise<ServerStatus> {
  const address = process.env.SERVER_STATUS_ADDRESS ?? 'thematic.bond'
  const targets = parseTargets(process.env.SERVER_STATUS_TARGETS)
  const [server, realms] = await Promise.all([
    resolvePublic(address).then(ping),
    Promise.all(targets.map(async (t) => ({ id: t.id, label: LABELS[t.id] ?? t.id, ...(await ping(t)) }))),
  ])
  // Without a public answer, fall back to the sum of whatever the backends report.
  const total = server.online ? server.players : realms.reduce((n, r) => n + r.players, 0)
  return { at: Date.now(), address, server, total, realms }
}

export const Route = createFileRoute('/api/server-status')({
  server: {
    handlers: {
      GET: async () => {
        if (!cache || Date.now() - cache.at > CACHE_MS) {
          inflight ??= collect().finally(() => {
            inflight = null
          })
          cache = { at: Date.now(), body: await inflight }
        }
        return new Response(JSON.stringify(cache.body), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=10' },
        })
      },
    },
  },
})
