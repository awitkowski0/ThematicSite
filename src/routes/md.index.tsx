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
      <h1>Markdown feeds</h1>
      <p className="text-neutral-400">
        Plain Markdown copies of these pages, for anywhere that wants text instead of a web page. The project listings, with previews and copy buttons, are at{' '}
        <Link to="/curseforge" className="text-blue-400 hover:underline">
          /curseforge
        </Link>{' '}
        and{' '}
        <Link to="/modrinth" className="text-blue-400 hover:underline">
          /modrinth
        </Link>
        .
      </p>
      <ul className="mt-6 space-y-2">
        {SLUGS.map((slug) => (
          <li key={slug}>
            <Link to="/md/$slug" params={{ slug }} className="font-mono text-sm text-blue-400 hover:underline">
              /md/{slug}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
