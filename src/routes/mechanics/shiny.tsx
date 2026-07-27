import { createFileRoute, Link } from '@tanstack/react-router'

import { getCategory } from '../../lib/book'
import { MarkdownContent } from '../../components/MarkdownContent'

export const Route = createFileRoute('/mechanics/shiny')({
  head: () => ({
    meta: [{ title: 'Shiny System — Thematic Mechanics' }, { name: 'description', content: 'How the shiny suit variant system works in Thematic.' }],
  }),
  component: ShinyPage,
})

function ShinyPage() {
  const category = getCategory('shiny')

  return (
    <div>
      <Link to="/mechanics" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Mechanics
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Shiny System</h1>
      <div className="mt-6">
        <MarkdownContent markdown={category?.description ?? 'Not available in this build.'} />
      </div>
      <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
        Server admins can tune the odds with the <code>shinyChance</code> gamerule (default 0.03 — 3%).
      </p>
    </div>
  )
}
