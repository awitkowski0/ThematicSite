import { createFileRoute, Link } from '@tanstack/react-router'

import { entriesFor } from '../../lib/book'
import { MarkdownContent } from '../../components/MarkdownContent'
import { DamageCalculator } from '../../components/DamageCalculator'

export const Route = createFileRoute('/mechanics/stats')({
  head: () => ({
    meta: [
      { title: 'Stats — Thematic' },
      { name: 'description', content: 'The four suit stats in Thematic — Defense, Utility, Attack, Speed — what they do, and a calculator for working out real damage.' },
    ],
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
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        What Defense, Utility, Attack and Speed actually do, and what a single hit lands for. For a whole fight, use the{' '}
        <Link to="/matchup" className="text-blue-600 hover:underline dark:text-blue-400">
          matchup simulator
        </Link>
        .
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Damage calculator</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">One ability, one hit — pick a suit and a rarity to see what it does.</p>
        <DamageCalculator />
      </section>

      <section className="mt-10 space-y-6">
        <h2 className="text-lg font-semibold">How it works</h2>
        {entry?.textBlocks.map((block, i) => <MarkdownContent key={i} markdown={block} />)}
      </section>

      <p className="mt-8 text-xs text-neutral-500">
        The numbers here follow the mod's code rather than the in-game guidebook, which is out of date in places — notably, abilities don't use the Attack stat
        at all (it applies to melee and arrows), and stat ranges differ from the published ones.
      </p>
    </div>
  )
}
