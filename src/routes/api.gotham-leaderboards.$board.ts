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
          const body = await upstream.text()
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
