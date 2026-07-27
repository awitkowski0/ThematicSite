import { createFileRoute } from '@tanstack/react-router'

import { getMarkdown } from '../lib/content'
import { MarkdownContent } from '../components/MarkdownContent'
import { DiscordPanel } from '../components/DiscordPanel'

export const Route = createFileRoute('/play')({
  head: () => ({
    meta: [
      { title: 'Play Thematic' },
      { name: 'description', content: 'Install Thematic via the official Modrinth modpack and join the official server at thematic.bond.' },
    ],
  }),
  component: PlayPage,
})

function PlayPage() {
  const markdown = getMarkdown('play') ?? ''

  return (
    <div>
      <MarkdownContent markdown={markdown} />
      <div className="mt-8">
        <DiscordPanel />
      </div>
    </div>
  )
}
