import { createFileRoute, Link } from '@tanstack/react-router'

import { MarkdownContent } from '../components/MarkdownContent'
import { DiscordPanel } from '../components/DiscordPanel'
import { Credits } from '../components/Credits'
import { SiteIndex } from '../components/SiteIndex'
import { getMarkdown, stats } from '../lib/content'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const markdown = getMarkdown('mod-description') ?? ''
  // Keep the title and opening pitch at the very top; everything from the first "##"
  // onwards is detail that reads better after the index of what's on the site.
  const firstSection = markdown.indexOf('\n## ')
  // the title becomes the wordmark, so the intro starts after it
  const intro = (firstSection === -1 ? markdown : markdown.slice(0, firstSection)).replace(/^# .*\n/, '')
  const rest = firstSection === -1 ? '' : markdown.slice(firstSection)

  return (
    <div>
      <h1 className="tb-plain tb-logo">Thematic</h1>
      <MarkdownContent markdown={intro} />
      <div className="tb-inset mt-6 flex flex-wrap gap-x-8 gap-y-3 rounded-md px-5 py-4 text-sm">
        <Stat label="Characters" value={stats.characterCount} />
        <Stat label="Total suits" value={stats.suitCount} />
        <Stat label="Collections" value={stats.collectionCount} />
        <Link to="/suits" className="ml-auto self-center font-medium text-blue-400 hover:underline">
          Browse all suits →
        </Link>
      </div>

      <div className="mb-8 mt-8 grid gap-4 sm:grid-cols-2">
        <div className="tb-raised flex flex-col justify-between rounded-md p-5">
          <div>
            <div className="font-semibold">Ready to play?</div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Install the modpack and join the official server.</p>
          </div>
          <Link
            to="/play"
            className="tb-button mt-4 w-fit px-4 py-2 text-sm"
          >
            Play Now →
          </Link>
        </div>
        <DiscordPanel />
      </div>

      <SiteIndex />

      {rest && (
        <div className="mt-10 border-t border-neutral-800 pt-6">
          <MarkdownContent markdown={rest} />
        </div>
      )}


      <Credits />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  )
}
