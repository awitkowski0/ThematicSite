import { createFileRoute } from '@tanstack/react-router'

// Proxy for Serv's games API (see the Public HTTP API section of the games contract). The
// browser talks to thematic.bond over HTTPS; this forwards to the game host server-side.
// Read at request time. Self-hosted, the site reaches prod container-to-container.
const GAMES_API_BASE = (process.env.GAMES_API_BASE ?? 'http://mc-prod:25547/api/games/v1').replace(/\/+$/, '')
const TIMEOUT_MS = 5000
const MAX_BODY = 8 * 1024
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

function jsonError(error: string, message: string, status: number) {
  return new Response(JSON.stringify({ error, message }), { status, headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } })
}

const unavailable = () => jsonError('unavailable', 'Games are not reachable right now.', 502)

async function forward(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const rest = url.pathname.replace(/^\/api\/games\/v1/, '')
  if (rest.split('/').some((seg) => seg === '..' || seg === '.')) return jsonError('bad_request', 'That address is not valid.', 400)

  const headers: Record<string, string> = { Accept: 'application/json' }
  const auth = request.headers.get('authorization')
  if (auth) headers.Authorization = auth
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
  if (ip) headers['X-Forwarded-For'] = ip

  let body: string | undefined
  if (request.method === 'POST') {
    const declared = Number(request.headers.get('content-length') ?? 0)
    if (declared > MAX_BODY) return jsonError('too_large', 'That request is too large.', 413)
    body = await request.text()
    if (new TextEncoder().encode(body).length > MAX_BODY) return jsonError('too_large', 'That request is too large.', 413)
    headers['Content-Type'] = request.headers.get('content-type') ?? 'application/json'
  }

  try {
    const upstream = await fetch(`${GAMES_API_BASE}${rest}${url.search}`, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const text = await upstream.text()
    const cacheable = request.method === 'GET' && !auth && upstream.ok
    return new Response(upstream.status === 204 ? null : text, {
      status: upstream.status,
      headers: { ...JSON_HEADERS, 'Cache-Control': cacheable ? 'public, max-age=5' : 'no-store' },
    })
  } catch {
    return unavailable()
  }
}

export const Route = createFileRoute('/api/games/v1/$')({
  server: {
    handlers: {
      GET: ({ request }) => forward(request),
      POST: ({ request }) => forward(request),
    },
  },
})
