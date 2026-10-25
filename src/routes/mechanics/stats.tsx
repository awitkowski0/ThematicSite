import { createFileRoute, Link } from '@tanstack/react-router'

import { loadEntry } from '../../lib/book'
import { GuidePages } from '../../components/GuidePages'
import { DamageCalculator } from '../../components/DamageCalculator'

export const Route = createFileRoute('/mechanics/stats')({
  head: () => ({
    meta: [
      { title: 'Stats — Thematic' },
      { name: 'description', content: 'What the four suit stats in Thematic (Defense, Utility, Attack and Speed) do, with a calculator for real damage.' },
    ],
  }),
  loader: () => loadEntry('getting_started', 'stats'),
  component: StatsPage,
})

function StatsPage() {
  const entry = Route.useLoaderData()

  return (
    <div>
      <Link to="/mechanics" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Mechanics
      </Link>
      <h1>Stats</h1>
      <p className="text-neutral-400">
        What Defense, Utility, Attack and Speed actually do, and what a single hit lands for. For a whole fight, use the{' '}
        <Link to="/matchup" className="text-blue-600 hover:underline dark:text-blue-400">
          matchup simulator
        </Link>
        .
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Damage calculator</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">One ability, one hit. Pick a suit and a rarity to see what it does.</p>
        <DamageCalculator />
      </section>

      <section className="mt-10 space-y-6">
        <h2 className="text-lg font-semibold">How it works</h2>
        {entry && <GuidePages pages={entry.pages} />}
      </section>

      <p className="mt-8 text-xs text-neutral-500">
        These numbers follow the mod's code, not the in-game wiki, which is out of date in places. Abilities don't use the Attack stat at all (it
        applies to melee and arrows), and some stat ranges differ from the published ones.
      </p>
    </div>
  )
}
