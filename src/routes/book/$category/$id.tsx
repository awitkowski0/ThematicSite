import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { getCategory, loadEntry } from '../../../lib/book'
import { plain } from '../../../lib/guideMarkup'
import { GuidePages } from '../../../components/GuidePages'
import { GuideInline } from '../../../components/GuideText'

export const Route = createFileRoute('/book/$category/$id')({
  loader: async ({ params }) => {
    const category = getCategory(params.category)
    const entry = category ? await loadEntry(params.category, params.id) : undefined
    if (!category || !entry) throw notFound()
    return { category, entry }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const first = loaderData.entry.pages.find((p) => typeof p.text === 'string' || typeof p.description === 'string')
    const blurb = plain(first?.text ?? first?.description)
    return { meta: [{ title: `${loaderData.entry.name} — Thematic Guidebook` }, { name: 'description', content: blurb || loaderData.entry.name }] }
  },
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
        ← <GuideInline markup={category.name} />
      </Link>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold">
        {entry.icon && <img src={entry.icon} alt="" className="h-9 w-9 [image-rendering:pixelated]" />}
        {entry.name}
      </h1>
      <GuidePages pages={entry.pages} />
    </div>
  )
}
