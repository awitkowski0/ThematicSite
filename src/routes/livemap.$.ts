import http from 'node:http'
import { Readable } from 'node:stream'
import { createFileRoute } from '@tanstack/react-router'

// BlueMap's web app (the live 3D map, with the Territories marker set), proxied from the game host.
// BlueMap's webserver is only reachable container-to-container (mc-prod, port 25578), so this is the
// only public way to it. It speaks plain HTTP, GET/HEAD only, and serves public map data: tiles, the
// web app's own files and live/markers.json. Players are not shown (plugin.conf live-player-markers).
//
// Uses node:http instead of fetch on purpose: BlueMap's tiles are gzip files sent with
// Content-Encoding: gzip and the browser has to be the one to unpack them; fetch would unpack them here and
// leave headers that no longer match the body.
const BASE = new URL(process.env.BLUEMAP_BASE ?? 'http://mc-prod:25578')
const TIMEOUT_MS = 15_000
const PATH_OK = /^[A-Za-z0-9_\-./%+@:~]*$/
const FORWARD_REQUEST = ['accept', 'accept-encoding', 'accept-language', 'if-none-match', 'if-modified-since', 'range', 'user-agent']
const DROP_RESPONSE = new Set(['connection', 'keep-alive', 'transfer-encoding', 'set-cookie', 'upgrade', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer'])

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })

function forward(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname === '/livemap') return Promise.resolve(Response.redirect(`${url.origin}/livemap/${url.search}`, 301))
  const rest = url.pathname.replace(/^\/livemap\//, '')
  if (!PATH_OK.test(rest) || rest.split('/').some((seg) => seg === '..' || seg === '.')) return Promise.resolve(text('Not found.', 404))

  const headers: Record<string, string> = {}
  for (const name of FORWARD_REQUEST) {
    const v = request.headers.get(name)
    if (v) headers[name] = v
  }

  return new Promise((resolve) => {
    const upstream = http.request(
      { protocol: BASE.protocol, hostname: BASE.hostname, port: BASE.port || 80, method: request.method, path: `/${rest}${url.search}`, headers, timeout: TIMEOUT_MS },
      (res) => {
        const out = new Headers()
        for (const [k, v] of Object.entries(res.headers)) {
          if (v === undefined || DROP_RESPONSE.has(k)) continue
          for (const one of Array.isArray(v) ? v : [v]) out.append(k, one)
        }
        const status = res.statusCode ?? 502
        const body = request.method === 'HEAD' || status === 204 || status === 304 ? null : (Readable.toWeb(res) as unknown as ReadableStream)
        if (!body) res.resume()
        resolve(new Response(body, { status, headers: out }))
      },
    )
    upstream.on('timeout', () => upstream.destroy(new Error('timeout')))
    upstream.on('error', () => resolve(text('The live map is not reachable right now.', 502)))
    upstream.end()
  })
}

export const Route = createFileRoute('/livemap/$')({
  server: {
    handlers: {
      GET: ({ request }) => forward(request),
      HEAD: ({ request }) => forward(request),
    },
  },
})
