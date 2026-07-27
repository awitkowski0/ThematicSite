import { createFileRoute, Link } from '@tanstack/react-router'

import { entriesFor } from '../../lib/book'
import { MarkdownContent } from '../../components/MarkdownContent'
import { DamageCalculator } from '../../components/DamageCalculator'
import { MatchupSimulator } from '../../components/MatchupSimulator'

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

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Calculator</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Pick two suits and a rarity to see what an ability actually lands for. Uses the same formulas as the mod. Ability base damage is set per-server, so
          enter the one you're checking — <code>/thematic ability viewer &lt;id&gt;</code> in game will tell you.
        </p>
        <DamageCalculator />
        <div className="mt-8">
          <MatchupSimulator />
        </div>
      </section>

      <section className="mt-10 space-y-6">
        <h2 className="text-lg font-semibold">How it works</h2>
        {entry?.textBlocks.map((block, i) => <MarkdownContent key={i} markdown={block} />)}
      </section>
    </div>
  )
}
