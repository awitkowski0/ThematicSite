import { createFileRoute, Link } from '@tanstack/react-router'

import { SLUGS } from '../lib/content'

export const Route = createFileRoute('/md/')({
  head: () => ({
    meta: [
      { title: 'Markdown feeds — Thematic' },
      { name: 'description', content: 'Raw Markdown versions of Thematic pages, for pasting into CurseForge/Modrinth or other mod listings.' },
    ],
  }),
  component: MdIndex,
})

function MdIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Markdown feeds</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Plain Markdown copies of these pages, for pasting into CurseForge, Modrinth, or anywhere else that wants text instead of a web page.
      </p>
      <ul className="mt-6 space-y-2">
        {SLUGS.map((slug) => (
          <li key={slug}>
            <Link to="/md/$slug" params={{ slug }} className="font-mono text-sm text-blue-600 hover:underline dark:text-blue-400">
              /md/{slug}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
