import { createFileRoute, Link } from '@tanstack/react-router'

import { MarkdownContent } from '../components/MarkdownContent'
import { DiscordPanel } from '../components/DiscordPanel'
import { Credits } from '../components/Credits'
import { ReferenceIndex, SiteIndex } from '../components/SiteIndex'
import { getMarkdown, stats } from '../lib/content'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const markdown = getMarkdown('mod-description') ?? ''
  // Keep the title and opening pitch at the very top; everything from the first "##"
  // onwards is detail that reads better after the index of what's on the site.
  const firstSection = markdown.indexOf('\n## ')
  const intro = firstSection === -1 ? markdown : markdown.slice(0, firstSection)
  const rest = firstSection === -1 ? '' : markdown.slice(firstSection)

  return (
    <div>
      <MarkdownContent markdown={intro} />

      <div className="mb-8 mt-8 grid gap-4 sm:grid-cols-2">
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

      <SiteIndex />

      {rest && (
        <div className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <MarkdownContent markdown={rest} />
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-6 rounded-lg border border-neutral-200 px-6 py-4 text-sm dark:border-neutral-800">
        <Stat label="Characters" value={stats.characterCount} />
        <Stat label="Total suits" value={stats.suitCount} />
        <Stat label="Collections" value={stats.collectionCount} />
        <Link to="/suits" className="ml-auto self-center font-medium text-blue-600 hover:underline dark:text-blue-400">
          Browse all suits →
        </Link>
      </div>

      <ReferenceIndex />
      <Credits />
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
