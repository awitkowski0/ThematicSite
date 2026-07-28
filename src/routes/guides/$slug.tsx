import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { getGuide } from '../../lib/guides'
import { MarkdownContent } from '../../components/MarkdownContent'

export const Route = createFileRoute('/guides/$slug')({
  loader: ({ params }) => {
    const guide = getGuide(params.slug)
    if (!guide) throw notFound()
    return guide
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.title} — Thematic` }, { name: 'description', content: loaderData.summary || loaderData.title }] : [],
  }),
  component: GuidePage,
  notFoundComponent: () => (
    <div>
      <h1 className="text-2xl font-bold">Guide not found</h1>
      <Link to="/guides" className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400">
        ← All guides
      </Link>
    </div>
  ),
})

function GuidePage() {
  const guide = Route.useLoaderData()
  return (
    <div>
      <Link to="/guides" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Guides
      </Link>
      <div className="mt-4">
        <MarkdownContent markdown={guide.markdown} />
      </div>
    </div>
  )
}
