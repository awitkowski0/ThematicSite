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
      <h1>Guides</h1>
      <p className="text-neutral-400">Written by the community. Anyone can add one.</p>

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
        <p className="tb-note mt-6">No guides yet.</p>
      )}

      <div className="tb-raised mt-8 rounded-md p-5">
        <h2>Write one</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Guides are plain Markdown files. Add a <code>.md</code> file to <code>src/content/guides/</code> in the{' '}
          <a href="https://github.com/awitkowski0/ThematicSite" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
            site repo
          </a>{' '}
          and open a pull request. The file name becomes the address and the first heading becomes the title.
        </p>
      </div>
    </div>
  )
}
