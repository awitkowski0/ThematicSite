import { createFileRoute, Link } from '@tanstack/react-router'

import { entriesFor } from '../../lib/book'
import { MarkdownContent } from '../../components/MarkdownContent'

export const Route = createFileRoute('/mechanics/stats')({
  head: () => ({
    meta: [{ title: 'Stats — Thematic Mechanics' }, { name: 'description', content: 'The 4 core suit stats in Thematic — Defense, Utility, Attack, Speed — and their exact formulas.' }],
  }),
  component: StatsPage,
})

function StatsPage() {
  const entry = entriesFor('getting_started').find((e) => e.id === 'stats')

  return (
    <div>
      <Link to="/mechanics" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Mechanics
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Stats</h1>
      <div className="mt-6 space-y-6">
        {entry?.textBlocks.map((block, i) => <MarkdownContent key={i} markdown={block} />) ?? (
          <p className="text-neutral-500 dark:text-neutral-400">Not available in this build.</p>
        )}
      </div>
    </div>
  )
}
