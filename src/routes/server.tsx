import { Link, createFileRoute } from '@tanstack/react-router'

import { JoinHero, ServerStatus } from '../components/ServerStatus'
import { ServerLeaderboards } from '../components/ServerLeaderboards'

export const Route = createFileRoute('/server')({
  head: () => ({
    meta: [
      { title: 'Server — Thematic' },
      { name: 'description', content: 'Join the official Thematic server: live status, who is online, and the ELO, guild, economy, and crafting event leaderboards.' },
    ],
  }),
  component: ServerPage,
})

function ServerPage() {
  return (
    <div>
      <h1>Server</h1>
      <p className="text-neutral-400">
        The official Thematic server. New here? The{' '}
        <Link to="/play" className="text-blue-600 hover:underline dark:text-blue-400">
          play guide
        </Link>{' '}
        covers installing the mod.
      </p>
      <JoinHero />

      <h2 className="mt-10 text-xl font-semibold">Status</h2>
      <div className="mt-4">
        <ServerStatus />
      </div>

      <h2 className="mt-10 text-xl font-semibold">Leaderboards</h2>
      <div className="mt-4">
        <ServerLeaderboards />
      </div>
    </div>
  )
}
