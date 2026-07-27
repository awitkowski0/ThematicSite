import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        const body = 'User-agent: *\nAllow: /\nSitemap: https://thematic.bond/sitemap.xml\n'
        return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      },
    },
  },
})
