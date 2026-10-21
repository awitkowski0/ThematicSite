import { createFileRoute } from '@tanstack/react-router'

// Proxy for Serv's territory-event API (GET /api/events/v1/territory on prod's leaderboard listener).
// Read at request time. Self-hosted, the site reaches prod container-to-container.
const TERRITORY_API_BASE = (process.env.TERRITORY_API_BASE ?? process.env.GOTHAM_API_BASE ?? 'http://mc-prod:25547').replace(/\/+$/, '')
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

export const Route = createFileRoute('/api/events/v1/territory')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const upstream = await fetch(`${TERRITORY_API_BASE}/api/events/v1/territory`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000),
          })
          return new Response(await upstream.text(), {
            status: upstream.status,
            headers: { ...JSON_HEADERS, 'Cache-Control': upstream.ok ? 'public, max-age=5' : 'no-store' },
          })
        } catch {
          return new Response(JSON.stringify({ error: 'unavailable', message: 'The territory event is not reachable right now.' }), {
            status: 502,
            headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' },
          })
        }
      },
    },
  },
})
