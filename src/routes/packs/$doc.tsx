import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { DocMarkdown } from '../../components/DocMarkdown'
import { PackApi } from '../../components/PackApi'
import { PackToc } from '../../components/PackToc'
import { getPackDoc } from '../../lib/packs'

export const Route = createFileRoute('/packs/$doc')({
  loader: async ({ params }) => {
    const doc = await getPackDoc(params.doc)
    if (!doc) throw notFound()
    return doc
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.title} — Thematic Packs` }, { name: 'description', content: loaderData.description }] : [],
  }),
  component: PackDocPage,
  notFoundComponent: () => (
    <div>
      <h1>Doc not found</h1>
      <Link to="/packs" className="text-blue-400 hover:underline">Pack development</Link>
    </div>
  ),
})

function PackDocPage() {
  const doc = Route.useLoaderData()
  return (
    <div>
      <h1>{doc.title}</h1>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-8">
        <div className="lg:col-start-2 lg:row-start-1">
          <PackToc headings={doc.headings} />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {doc.kind === 'md' ? (
            <DocMarkdown markdown={doc.markdown} />
          ) : (
            <>
              <p className="mb-4 text-sm text-neutral-400">
                {doc.about} The same API as TypeScript declarations is in{' '}
                <a href="/packs/thematic.d.ts" className="text-blue-400 hover:underline">thematic.d.ts</a>; the full data is{' '}
                <a href="/packs/script-api.json" className="text-blue-400 hover:underline">script-api.json</a>.
              </p>
              <PackApi globals={doc.globals} types={doc.types} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
