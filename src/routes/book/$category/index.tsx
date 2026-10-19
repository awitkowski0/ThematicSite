import { useMemo, useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { childCategories, getCategory } from '../../../lib/book'
import type { BookEntrySummary } from '../../../lib/book'
import { GuideInline, GuideText } from '../../../components/GuideText'
import { plain } from '../../../lib/guideMarkup'

export const Route = createFileRoute('/book/$category/')({
  loader: ({ params }) => {
    const category = getCategory(params.category)
    if (!category) throw notFound()
    return category
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.name} — Thematic Guidebook` }, { name: 'description', content: plain(loaderData.description) || loaderData.name }] : [],
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

// A long list is folded into groups the way the game folds it (GuideGroups.java): by the [TAG] a name
// starts with, the untagged rest by first letter when that is still long, and suits by collection.
const GROUP_FROM = 40
const LETTERS_FROM = 60

interface Group {
  key: string
  label: string
  entries: BookEntrySummary[]
}

function groupEntries(entries: BookEntrySummary[]): Group[] {
  if (entries.length < GROUP_FROM) return [{ key: '', label: '', entries }]
  if (entries.every((e) => e.collection)) {
    const by = new Map<string, BookEntrySummary[]>()
    for (const e of entries) by.set(e.collection!, [...(by.get(e.collection!) ?? []), e])
    return [...by.entries()].sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase())).map(([c, list]) => ({ key: `collection:${c}`, label: c, entries: list }))
  }
  const tagged = new Map<string, BookEntrySummary[]>()
  const untagged: BookEntrySummary[] = []
  for (const e of entries) {
    if (e.tag) tagged.set(e.tag, [...(tagged.get(e.tag) ?? []), e])
    else untagged.push(e)
  }
  const groups: Group[] = [...tagged.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([t, list]) => ({ key: `tag:${t}`, label: t.charAt(0) + t.slice(1).toLowerCase(), entries: list }))
  if (untagged.length > LETTERS_FROM) {
    const letters = new Map<string, BookEntrySummary[]>()
    for (const e of untagged) {
      const first = e.name.trim().charAt(0)
      const l = /\p{L}/u.test(first) ? first.toUpperCase() : '#'
      letters.set(l, [...(letters.get(l) ?? []), e])
    }
    ;[...letters.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).forEach(([l, list]) => groups.push({ key: `letter:${l}`, label: l, entries: list }))
  } else if (untagged.length > 0) {
    groups.push({ key: 'general', label: tagged.size ? 'General' : '', entries: untagged })
  }
  return groups
}

function EntryCard({ entry }: { entry: BookEntrySummary }) {
  return (
    <li>
      <a
        href={entry.href}
        className="flex h-full items-center gap-2 rounded-md border border-neutral-200 p-3 text-sm hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
      >
        {entry.icon && <img src={entry.icon} alt="" loading="lazy" className="h-6 w-6 shrink-0 [image-rendering:pixelated]" />}
        <span>{entry.name}</span>
      </a>
    </li>
  )
}

function CategoryEntries() {
  const category = Route.useLoaderData()
  const children = childCategories(category.id)
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()

  const filtered = useMemo(
    () => (normalized ? category.entries.filter((e) => e.name.toLowerCase().includes(normalized)) : category.entries),
    [category, normalized],
  )
  const groups = useMemo(() => (normalized ? [{ key: '', label: '', entries: filtered }] : groupEntries(filtered)), [filtered, normalized])

  return (
    <div>
      <Link to="/book" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Guidebook
      </Link>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold">
        {category.icon && <img src={category.icon} alt="" className="h-9 w-9 [image-rendering:pixelated]" />}
        {category.name}
      </h1>
      {category.description && (
        <div className="mt-2 text-neutral-600 dark:text-neutral-400">
          <GuideText markup={category.description} />
        </div>
      )}

      {children.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                to="/book/$category"
                params={{ category: child.id }}
                className="flex h-full items-center gap-2 rounded-md border border-neutral-300 p-3 text-sm font-medium hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
              >
                {child.icon && <img src={child.icon} alt="" className="h-6 w-6 shrink-0 [image-rendering:pixelated]" />}
                <span>
                  <GuideInline markup={child.name} /> <span className="font-normal text-neutral-500">({child.entryCount})</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {category.entries.length > 8 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${category.name.toLowerCase()}…`}
          className="mt-6 w-full max-w-sm rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
      )}

      <div className="mt-6 space-y-4">
        {groups.map((group) =>
          group.label ? (
            <details key={group.key} className="group" open={groups.length === 1 || !!normalized}>
              <summary className="cursor-pointer text-sm font-semibold">
                {group.label} <span className="font-normal text-neutral-500">({group.entries.length})</span>
              </summary>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {group.entries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </ul>
            </details>
          ) : (
            <ul key={group.key} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {group.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </ul>
          ),
        )}
        {category.entries.length === 0 && children.length === 0 && <p className="text-sm text-neutral-500">Nothing in this chapter yet.</p>}
      </div>
    </div>
  )
}
