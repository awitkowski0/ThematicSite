import { createFileRoute } from '@tanstack/react-router'

import { suits } from '../lib/suits'
import { bookCategories, entriesFor } from '../lib/book'
import { blogPosts } from '../lib/blog'

const SITE_URL = 'https://thematic.bond'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const staticPaths = ['/', '/suits', '/faq', '/play', '/book', '/blog', '/mechanics', '/mechanics/stats', '/mechanics/rarities', '/mechanics/shiny', '/mechanics/keybinds', '/mechanics/ores', '/abilities', '/matchup', '/planner', '/tierlist', '/structures']
        const suitPaths = suits.filter((s) => !s.wip).map((s) => `/suits/${s.id}`)
        // "suit" entries live at /suits/$id (already covered above), not a separate /book/suit/$id page.
        const bookPaths = bookCategories.filter((c) => c.id !== 'suit').flatMap((c) => [`/book/${c.id}`, ...entriesFor(c.id).map((e) => `/book/${c.id}/${e.id}`)])
        const blogPaths = blogPosts.map((p) => `/blog/${p.version}`)
        const urls = [...staticPaths, ...suitPaths, ...bookPaths, ...blogPaths]
          .map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`)
          .join('\n')
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
        return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
      },
    },
  },
})
