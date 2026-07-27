import { createFileRoute, Link } from '@tanstack/react-router'

import { MatchupSimulator } from '../components/MatchupSimulator'

export const Route = createFileRoute('/matchup')({
  head: () => ({
    meta: [
      { title: 'Matchup — Thematic' },
      { name: 'description', content: 'Simulate one Thematic suit fighting another: every ability on cooldown, melee, miss rates, and time to kill.' },
    ],
  }),
  component: MatchupPage,
})

function MatchupPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Matchup</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Put two suits against each other and see how the fight actually plays out — every ability fired as it comes up, melee in between, and how long it takes
        to drop them.
      </p>

      <div className="mt-6">
        <MatchupSimulator />
      </div>

      <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
        Checking a single hit instead of a whole fight? The{' '}
        <Link to="/mechanics/stats" className="text-blue-600 hover:underline dark:text-blue-400">
          damage calculator
        </Link>{' '}
        does one ability at a time, and explains the formulas behind all of this. Per-ability numbers live on the{' '}
        <Link to="/abilities" className="text-blue-600 hover:underline dark:text-blue-400">
          abilities list
        </Link>
        .
      </p>
    </div>
  )
}
