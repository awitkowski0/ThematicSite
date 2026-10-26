import { createFileRoute } from '@tanstack/react-router'

import { badgeSvg } from '../lib/pixelBadge'
import { stats } from '../lib/content'

// Images for the mod listings: the live buttons, at /badge/<name> (no extension: the dev server keeps .svg paths for static files).
// Listings cannot run code, so the numbers live in the image.
const DISCORD_WIDGET = 'https://discord.com/api/guilds/705669454943486034/widget.json'
const LIVE = 'public, max-age=120'

async function json<T>(url: string): Promise<T | undefined> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    return res.ok ? ((await res.json()) as T) : undefined
  } catch {
    return undefined
  }
}

const IMAGES: Record<string, (request: Request) => Promise<{ svg: string; cache: string }>> = {
  packs: async () => ({ svg: badgeSvg('Make your own pack', 'pack'), cache: 'public, max-age=86400' }),
  armors: async () => ({ svg: badgeSvg(`${stats.craftableCount} Craftable Armors`, 'suit'), cache: LIVE }),
  // a count of one or none reads as an empty server, so it then just names the address
  players: async (request) => {
    const status = await json<{ total?: number; server?: { online?: boolean } }>(new URL('/api/server-status', request.url).toString())
    const n = status?.server?.online ? (status.total ?? 0) : 0
    return { svg: n > 1 ? badgeSvg(`${n} playing now`, 'online') : badgeSvg('Play on thematic.bond'), cache: LIVE }
  },
  discord: async () => {
    const widget = await json<{ presence_count?: number }>(DISCORD_WIDGET)
    const n = widget?.presence_count ?? 0
    return { svg: n > 1 ? badgeSvg(`${n} online on Discord`, 'discord') : badgeSvg('Join the Discord', 'discord'), cache: LIVE }
  },
}

// the old address of the armors button, kept for listings pasted before it moved
IMAGES.suits = IMAGES.armors

export const Route = createFileRoute('/badge/$name')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const make = IMAGES[params.name.replace(/\.svg$/, '')]
        if (!make) return new Response(`Not found. Available: ${Object.keys(IMAGES).join(', ')}`, { status: 404 })
        const { svg, cache } = await make(request)
        return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': cache } })
      },
    },
  },
})
