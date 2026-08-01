import { createFileRoute } from '@tanstack/react-router'

import { GOTHAM_MAP_URL } from '../lib/gotham'
import { GothamLeaderboards } from '../components/GothamLeaderboards'

export const Route = createFileRoute('/gotham')({
  head: () => ({
    meta: [
      { title: 'Gotham — Thematic' },
      { name: 'description', content: 'Live map and leaderboards for the Gotham server — raids, guilds, economy, and crafting event standings.' },
    ],
  }),
  component: GothamPage,
})

function GothamPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Gotham</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Live map and leaderboards for the Gotham server.{' '}
        <a href={GOTHAM_MAP_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
          Open the map in a new tab ↗
        </a>{' '}
        if it doesn't load below (some browsers block embedding it directly on an HTTPS page).
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <iframe src={GOTHAM_MAP_URL} title="Gotham live map" className="h-[480px] w-full" loading="lazy" />
      </div>

      <h2 className="mt-10 text-xl font-semibold">Leaderboards</h2>
      <div className="mt-4">
        <GothamLeaderboards />
      </div>
    </div>
  )
}
