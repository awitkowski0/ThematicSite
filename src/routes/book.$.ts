import { createFileRoute } from '@tanstack/react-router'

// The wiki used to live at /book; keep old links working. Images under /book/ are static files and never reach this.
export const Route = createFileRoute('/book/$')({
  server: {
    handlers: {
      GET: ({ params, request }) => {
        const { search } = new URL(request.url)
        return new Response(null, { status: 301, headers: { Location: `/wiki${params._splat ? `/${params._splat}` : ''}${search}` } })
      },
    },
  },
})
