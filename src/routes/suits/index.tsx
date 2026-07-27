import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { accentForCollection, suitsByCollection } from '../../lib/suits'
import { stats } from '../../lib/content'

export const Route = createFileRoute('/suits/')({
  head: () => ({
    meta: [
      { title: `Suits — Thematic (${stats.suitCount} suits)` },
      { name: 'description', content: `Browse all ${stats.suitCount} playable superhero and supervillain suits in the Thematic Minecraft mod.` },
    ],
  }),
  component: SuitsIndex,
})

function SuitsIndex() {
  const [query, setQuery] = useState('')
  const [showWip, setShowWip] = useState(false)
  const groups = useMemo(() => suitsByCollection(), [])
  const normalizedQuery = query.trim().toLowerCase()

  return (
    <div>
      <h1 className="text-3xl font-bold">Suits</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        {stats.suitCount} suits across {stats.collectionCount} collections. Generated from the mod's own data — always current.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search suits…"
          className="w-full max-w-sm rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <input type="checkbox" checked={showWip} onChange={(e) => setShowWip(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700" />
          Show WIP suits
        </label>
      </div>

      <div className="mt-8 space-y-10">
        {groups.map(({ collection, suits: collectionSuits }) => {
          const filtered = collectionSuits.filter((s) => {
            if (!showWip && s.wip) return false
            if (normalizedQuery && !s.name.toLowerCase().includes(normalizedQuery)) return false
            return true
          })
          if (filtered.length === 0) return null
          return (
            <section key={collection.id}>
              <h2 className="text-lg font-semibold">
                {collection.name} <span className="font-normal text-neutral-500">({filtered.length})</span>
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filtered.map((suit) => (
                  <li key={suit.id}>
                    <Link
                      to="/suits/$id"
                      params={{ id: suit.id }}
                      className="flex items-center gap-3 rounded-md border border-neutral-200 p-2 text-sm hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                    >
                      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentForCollection(suit.collection) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{suit.name}</span>
                        <span className="block text-xs text-neutral-500">Tier {suit.tier}</span>
                      </span>
                      {suit.wip && (
                        <span className="ml-auto shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                          WIP
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
