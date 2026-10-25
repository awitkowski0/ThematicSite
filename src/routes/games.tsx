import { Link, createFileRoute } from '@tanstack/react-router'

import { GameLeaderboards, PlayerSearch, QueuesAndMatches } from '../components/Games'

export const Route = createFileRoute('/games')({
  head: () => ({
    meta: [
      { title: 'Games — Thematic' },
      { name: 'description', content: 'Thematic game modes: who is queued, matches in progress, and the leaderboards.' },
    ],
  }),
  component: GamesPage,
})

function GamesPage() {
  return (
    <div>
      <h1>Games</h1>
      <p className="text-neutral-400">
        Queues, live matches and leaderboards for the Thematic game modes. Updates every 10 seconds. To play, join the{' '}
        <Link to="/server" className="text-blue-600 hover:underline dark:text-blue-400">
          server
        </Link>
        .
      </p>

      <div className="mt-6 max-w-md">
        <PlayerSearch />
      </div>

      <div className="mt-8">
        <QueuesAndMatches />
      </div>

      <h2 className="mt-10 text-xl font-semibold">Leaderboards</h2>
      <div className="mt-4">
        <GameLeaderboards />
      </div>
    </div>
  )
}
