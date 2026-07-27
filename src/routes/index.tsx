import { createFileRoute, Link } from '@tanstack/react-router'

import { MarkdownContent } from '../components/MarkdownContent'
import { DiscordPanel } from '../components/DiscordPanel'
import { getMarkdown, stats } from '../lib/content'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const markdown = getMarkdown('mod-description') ?? ''

  return (
    <div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <div>
            <div className="font-semibold">Ready to play?</div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Install the modpack and join the official server.</p>
          </div>
          <Link
            to="/play"
            className="mt-4 inline-block w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Play Now →
          </Link>
        </div>
        <DiscordPanel />
      </div>

      <div className="mb-8 flex flex-wrap gap-6 rounded-lg border border-neutral-200 px-6 py-4 text-sm dark:border-neutral-800">
        <Stat label="Suits" value={stats.suitCount} />
        <Stat label="Collections" value={stats.collectionCount} />
        <Link to="/suits" className="ml-auto self-center font-medium text-blue-600 hover:underline dark:text-blue-400">
          Browse all suits →
        </Link>
      </div>
      <MarkdownContent markdown={markdown} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  )
}
