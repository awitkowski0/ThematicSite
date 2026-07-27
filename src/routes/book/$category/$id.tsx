import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { getCategory, getEntry } from '../../../lib/book'
import { MarkdownContent } from '../../../components/MarkdownContent'

export const Route = createFileRoute('/book/$category/$id')({
  loader: ({ params }) => {
    const category = getCategory(params.category)
    const entry = category ? getEntry(params.category, params.id) : undefined
    if (!category || !entry) throw notFound()
    return { category, entry }
  },
  head: ({ loaderData }) =>
    loaderData
      ? { meta: [{ title: `${loaderData.entry.name} — Thematic Guidebook` }, { name: 'description', content: loaderData.entry.textBlocks[0] ?? loaderData.entry.name }] }
      : {},
  component: BookEntryDetail,
  notFoundComponent: () => (
    <div>
      <h1 className="text-2xl font-bold">Entry not found</h1>
      <Link to="/book" className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400">
        ← Guidebook
      </Link>
    </div>
  ),
})

function BookEntryDetail() {
  const { category, entry } = Route.useLoaderData()

  return (
    <div>
      <Link to="/book/$category" params={{ category: category.id }} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← {category.name}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{entry.name}</h1>

      <div className="mt-6 space-y-6">
        {entry.textBlocks.map((block, i) => (
          <MarkdownContent key={i} markdown={block} />
        ))}
      </div>
    </div>
  )
}
