import { useMemo, useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { entriesFor, getCategory } from '../../../lib/book'

export const Route = createFileRoute('/book/$category/')({
  loader: ({ params }) => {
    const category = getCategory(params.category)
    // Categories still exist in the data even when all their entries were picture-only
    // (their descriptions get reused elsewhere, e.g. /mechanics/shiny) — but there's
    // nothing to browse here, so treat them as not found.
    if (!category || category.entryCount === 0) throw notFound()
    return category
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.name} — Thematic Guidebook` }, { name: 'description', content: loaderData.description ?? loaderData.name }] : [],
  }),
  component: CategoryEntries,
  notFoundComponent: () => (
    <div>
      <h1 className="text-2xl font-bold">Category not found</h1>
      <Link to="/book" className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400">
        ← Guidebook
      </Link>
    </div>
  ),
})

function CategoryEntries() {
  const category = Route.useLoaderData()
  const entries = entriesFor(category.id)
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()

  const filtered = useMemo(() => (normalized ? entries.filter((e) => e.name.toLowerCase().includes(normalized)) : entries), [entries, normalized])

  // "suit" isn't linked here from anywhere (see /book's index), but handle it gracefully
  // if someone lands on this URL directly — its entries have a real home at /suits/$id.
  const entryHref = (id: string) => (category.id === 'suit' ? `/suits/${id}` : `/book/${category.id}/${id}`)

  return (
    <div>
      <Link to="/book" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Guidebook
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{category.name}</h1>
      {category.description && <p className="mt-2 text-neutral-600 dark:text-neutral-400">{category.description}</p>}

      {entries.length > 8 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${category.name.toLowerCase()}…`}
          className="mt-6 w-full max-w-sm rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
      )}

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((entry) => (
          <li key={entry.id}>
            <a
              href={entryHref(entry.id)}
              className="block rounded-md border border-neutral-200 p-3 text-sm hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
            >
              {entry.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
