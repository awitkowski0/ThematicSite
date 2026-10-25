import { Link, createFileRoute } from '@tanstack/react-router'

import { PlayerSearch, PlayerStatsView } from '../components/Games'

export const Route = createFileRoute('/games_/player/$name')({
  head: ({ params }) => ({
    meta: [{ title: `${params.name} — Games — Thematic` }, { name: 'description', content: `Game stats and recent matches for ${params.name}.` }],
  }),
  component: PlayerPage,
})

function PlayerPage() {
  const { name } = Route.useParams()
  return (
    <div>
      <p className="text-sm">
        <Link to="/games" className="text-blue-600 hover:underline dark:text-blue-400">
          Games
        </Link>
      </p>
      <h1>{name}</h1>
      <div className="mt-4 max-w-md">
        <PlayerSearch />
      </div>
      <div className="mt-8">
        <PlayerStatsView name={name} />
      </div>
    </div>
  )
}
