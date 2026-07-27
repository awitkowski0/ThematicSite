import { createFileRoute } from '@tanstack/react-router'

import { SLUGS, getMarkdown } from '../lib/content'

export const Route = createFileRoute('/md/$slug')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const markdown = getMarkdown(params.slug)
        if (!markdown) {
          return new Response(`Not found. Available: ${SLUGS.join(', ')}`, { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
        }
        return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
      },
    },
  },
})
