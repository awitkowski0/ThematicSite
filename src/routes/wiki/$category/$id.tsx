import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { getCategory, loadEntry } from '../../../lib/book'
import { plain } from '../../../lib/guideMarkup'
import { GuidePages } from '../../../components/GuidePages'
import { AbilityFacts } from '../../../components/AbilityFacts'
import { GuideInline } from '../../../components/GuideText'

export const Route = createFileRoute('/wiki/$category/$id')({
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
    return { meta: [{ title: `${loaderData.entry.name} — Thematic Wiki` }, { name: 'description', content: blurb || loaderData.entry.name }] }
  },
  component: BookEntryDetail,
  notFoundComponent: () => (
    <div>
      <h1>Entry not found</h1>
      <Link to="/wiki" className="text-blue-400 hover:underline">
        ← Wiki
      </Link>
    </div>
  ),
})

function BookEntryDetail() {
  const { category, entry } = Route.useLoaderData()

  return (
    <div>
      <Link to="/wiki/$category" params={{ category: category.id }} className="text-sm text-blue-400 hover:underline">
        ← <GuideInline markup={category.name} />
      </Link>
      <h1>
        {entry.icon && <img src={entry.icon} alt="" className="h-7 w-7 [image-rendering:pixelated] [filter:drop-shadow(1px_1px_0_#0a0a0c)]" />}
        {entry.name}
      </h1>
      <GuidePages pages={entry.pages} shinies={category.id === 'shiny'} />
      {(category.id === 'ability' || category.parent === 'ability') && (
        <AbilityFacts id={entry.id} name={plain(entry.name).replace(/^\[[A-Z]+\]\s*/, '')} hasNumbers={entry.pages.some((p) => p.type === 'ability_data' && p.stats?.length)} />
      )}
    </div>
  )
}
