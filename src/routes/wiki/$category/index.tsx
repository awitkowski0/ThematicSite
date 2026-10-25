import { useMemo, useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { childCategories, getCategory } from '../../../lib/book'
import type { BookEntrySummary } from '../../../lib/book'
import { GuideInline, GuideText } from '../../../components/GuideText'
import { plain } from '../../../lib/guideMarkup'

export const Route = createFileRoute('/wiki/$category/')({
  loader: ({ params }) => {
    const category = getCategory(params.category)
    if (!category) throw notFound()
    return category
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.name} — Thematic Wiki` }, { name: 'description', content: plain(loaderData.description) || loaderData.name }] : [],
  }),
  component: CategoryEntries,
  notFoundComponent: () => (
    <div>
      <h1>Category not found</h1>
      <Link to="/wiki" className="text-blue-400 hover:underline">
        ← Wiki
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

function EntryRow({ entry }: { entry: BookEntrySummary }) {
  return (
    <li className="break-inside-avoid">
      <a href={entry.href} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-hover-row">
        {entry.icon ? <img src={entry.icon} alt="" loading="lazy" className="h-5 w-5 shrink-0 [image-rendering:pixelated]" /> : <span className="h-5 w-5 shrink-0" />}
        <span className="truncate">{entry.tag ? entry.name.replace(`[${entry.tag}] `, '') : entry.name}</span>
      </a>
    </li>
  )
}

/** The book's own "Index of …" lines say nothing the title does not. */
const saysSomething = (markup: string) => !!markup && !/^index of\b/i.test(plain(markup))

function CategoryEntries() {
  const category = Route.useLoaderData()
  const children = childCategories(category.id)
  const parent = category.parent ? getCategory(category.parent) : undefined
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()

  const filtered = useMemo(
    () => (normalized ? category.entries.filter((e) => e.name.toLowerCase().includes(normalized)) : category.entries),
    [category, normalized],
  )
  const groups = useMemo(() => (normalized ? [{ key: '', label: '', entries: filtered }] : groupEntries(filtered)), [filtered, normalized])

  return (
    <div>
      {parent && (
        <Link to="/wiki/$category" params={{ category: parent.id }} className="text-sm text-blue-400 hover:underline">
          ← <GuideInline markup={parent.name} />
        </Link>
      )}
      <h1>
        {category.icon && <img src={category.icon} alt="" className="h-7 w-7 [image-rendering:pixelated] [filter:drop-shadow(1px_1px_0_#0a0a0c)]" />}
        <GuideInline markup={category.name} />
      </h1>
      {saysSomething(category.description) && (
        <div className="text-neutral-400">
          <GuideText markup={category.description} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {category.entries.length > 8 && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${category.entries.length} entries…`}
            className="tb-inset w-full max-w-xs rounded-md px-3 py-1.5 text-sm outline-none focus:!border-blue-400"
          />
        )}
        {children.map((child) => (
          <Link key={child.id} to="/wiki/$category" params={{ category: child.id }} className="tb-raised inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm">
            {child.icon && <img src={child.icon} alt="" className="h-4 w-4 [image-rendering:pixelated]" />}
            <GuideInline markup={child.name} /> <span className="text-neutral-500">{child.entryCount}</span>
          </Link>
        ))}
      </div>

      {groups.length > 5 && (
        <nav aria-label="Groups" className="mt-6 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {groups.map((g) => (
            <a key={g.key} href={`#${g.key}`} className="text-blue-400 hover:underline">
              {g.label}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-6 space-y-6">
        {groups.map((group) => (
          <section key={group.key} id={group.key || undefined} className="scroll-mt-20">
            {group.label && (
              <h2 className="mb-2">
                {group.label} <span className="font-normal text-neutral-500">{group.entries.length}</span>
              </h2>
            )}
            <ul className="columns-2 gap-x-4 sm:columns-3 lg:columns-4">
              {group.entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 && category.entries.length > 0 && <p className="tb-note">Nothing matches “{query}”.</p>}
        {category.entries.length === 0 && children.length === 0 && <p className="tb-note">Nothing in this chapter yet.</p>}
      </div>
    </div>
  )
}
