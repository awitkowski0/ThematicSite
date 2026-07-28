import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { Suit, accentForCollection, familiesByCollection, suits } from '../../lib/suits'

export const Route = createFileRoute('/suits/')({
  head: () => ({
    meta: [
      { title: 'Suits — Thematic' },
      { name: 'description', content: 'Every character in the Thematic Minecraft mod, with their abilities, stats, crafting recipes, and alternate versions.' },
    ],
  }),
  component: SuitsIndex,
})

function SuitLink({ suit, showTier = true }: { suit: Suit; showTier?: boolean }) {
  return (
    <Link
      to="/suits/$id"
      params={{ id: suit.id }}
      className="flex items-center gap-3 rounded-md border border-neutral-200 p-2 text-sm hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
    >
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentForCollection(suit.collection) }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{suit.name}</span>
        {showTier && <span className="block text-xs text-neutral-500">Tier {suit.tier}</span>}
      </span>
      {suit.wip && (
        <span className="ml-auto shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
          WIP
        </span>
      )}
    </Link>
  )
}

function SuitsIndex() {
  const [query, setQuery] = useState('')
  const [showWip, setShowWip] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => familiesByCollection(), [])
  const normalized = query.trim().toLowerCase()

  const characterCount = suits.filter((s) => !s.parent && !s.wip).length
  const variantCount = suits.filter((s) => s.parent && !s.wip).length

  const visible = (s: Suit) => (showWip || !s.wip) && (!normalized || s.name.toLowerCase().includes(normalized))

  return (
    <div>
      <h1 className="text-3xl font-bold">Suits</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        {characterCount} characters, each with their own abilities and recipe — plus {variantCount} alternate versions between them. Pick one to see what it
        does and how to craft it.
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
        {groups.map(({ collection, families }) => {
          // A character stays listed if it matches, or if any of its variants do.
          const shown = families
            .map((f) => ({ ...f, variants: f.variants.filter(visible) }))
            .filter((f) => visible(f.base) || f.variants.length > 0)
          if (shown.length === 0) return null

          return (
            <section key={collection.id}>
              <h2 className="text-lg font-semibold">
                {collection.name} <span className="font-normal text-neutral-500">({shown.length})</span>
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {shown.map((family) => {
                  const isOpen = expanded[family.base.id] || (normalized !== '' && family.variants.length > 0)
                  return (
                    <li key={family.base.id}>
                      <SuitLink suit={family.base} />
                      {family.variants.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setExpanded((prev) => ({ ...prev, [family.base.id]: !prev[family.base.id] }))}
                            className="mt-1 w-full px-2 text-left text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {isOpen ? 'Hide' : 'Show'} {family.variants.length} version{family.variants.length === 1 ? '' : 's'}
                          </button>
                          {isOpen && (
                            <ul className="mt-1 space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-800">
                              {family.variants.map((v) => (
                                <li key={v.id}>
                                  <SuitLink suit={v} showTier={false} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
