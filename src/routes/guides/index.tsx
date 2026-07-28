import { createFileRoute, Link } from '@tanstack/react-router'

import { cardLinkClass } from '../../components/controls'

import { guides } from '../../lib/guides'

export const Route = createFileRoute('/guides/')({
  head: () => ({
    meta: [{ title: 'Guides — Thematic' }, { name: 'description', content: 'Community-written guides for playing Thematic.' }],
  }),
  component: GuidesIndex,
})

function GuidesIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Guides</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">Written by the community. Anyone can add one.</p>

      {guides.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className={cardLinkClass}
              >
                <div className="font-medium">{g.title}</div>
                {g.summary && <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{g.summary}</div>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-md border border-dashed border-neutral-300 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          No guides yet — yours could be the first.
        </p>
      )}

      <div className="mt-8 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">Write one</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Guides are plain Markdown files. Add a <code>.md</code> file to <code>src/content/guides/</code> in the{' '}
          <a href="https://github.com/awitkowski0/ThematicSite" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
            site repo
          </a>{' '}
          and open a pull request — the filename becomes the URL and the first heading becomes the title. No code changes needed.
        </p>
      </div>
    </div>
  )
}
