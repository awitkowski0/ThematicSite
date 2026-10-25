import { createFileRoute, Link } from '@tanstack/react-router'

import { DocMarkdown } from '../../components/DocMarkdown'
import { cardLinkClass } from '../../components/controls'
import { getPackReadme, packDocs } from '../../lib/packs'

export const Route = createFileRoute('/packs/')({
  loader: () => getPackReadme(),
  head: () => ({
    meta: [
      { title: 'Pack development — Thematic' },
      { name: 'description', content: 'Make your own Thematic content pack: a starter pack to download, the format reference, the script API and examples.' },
    ],
  }),
  component: PacksIndex,
})

function PacksIndex() {
  const readme = Route.useLoaderData()
  return (
    <div>
      <h1>Pack development</h1>
      <p className="max-w-3xl text-neutral-300">
        A pack adds suits, abilities, items, blocks and more to Thematic. Most of it is JSON and art, with a little JavaScript for abilities that
        need behaviour of their own. Start from the working pack below, rename it, and change what you need.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <a href="/packs/thematic-pack-template.zip" download className="tb-button px-4 py-2 text-sm">Download starter pack</a>
        <a href="/packs/thematic.d.ts" download className="text-sm text-blue-400 hover:underline">thematic.d.ts</a>
        <a href="/packs/thematic-examples.zip" download className="text-sm text-blue-400 hover:underline">Examples (zip)</a>
      </div>

      <h2 className="mt-10">Reference</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {packDocs.map((d) => (
          <li key={d.slug}>
            <Link to="/packs/$doc" params={{ doc: d.slug }} className={`${cardLinkClass} h-full`}>
              <div className="font-semibold">{d.title}</div>
              <div className="mt-1 text-sm text-neutral-400">{d.description}</div>
            </Link>
          </li>
        ))}
      </ul>

      {readme && (
        <div className="mt-10">
          <DocMarkdown markdown={readme.markdown.replace(/^[\s\S]*?(?=^## What's here)/m, '')} />
        </div>
      )}
    </div>
  )
}
