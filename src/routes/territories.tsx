import { Link, createFileRoute } from '@tanstack/react-router'

import { Territories } from '../components/Territories'

export const Route = createFileRoute('/territories')({
  head: () => ({
    meta: [
      { title: 'Territories — Thematic' },
      { name: 'description', content: 'The weekly territory event live: which guild holds each Gotham zone, the standings, the clock and the prizes.' },
    ],
  }),
  component: TerritoriesPage,
})

function TerritoriesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Territories</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Every week, guilds fight over the looting zones of Gotham. Stand on a zone to capture it; hold it at the top of the hour to score. To take part, join the{' '}
        <Link to="/server" className="text-blue-600 hover:underline dark:text-blue-400">
          server
        </Link>
        .
      </p>
      <div className="mt-6">
        <Territories />
      </div>
    </div>
  )
}
