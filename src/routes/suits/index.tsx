import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { Suit, familiesByCollection, suits } from '../../lib/suits'
import { SuitStill } from '../../components/SuitStill'

export const Route = createFileRoute('/suits/')({
  head: () => ({
    meta: [
      { title: 'Suits — Thematic' },
      { name: 'description', content: 'Every character in the Thematic Minecraft mod, with their abilities, stats, crafting recipes, and alternate versions.' },
    ],
  }),
  component: SuitsIndex,
})

/** A suit as a figure card: its inked still, name, and tier or the version count. */
function SuitCard({ suit, versions }: { suit: Suit; versions?: number }) {
  return (
    <li>
      <Link to="/suits/$id" params={{ id: suit.id }} className="group block">
        {suit.geoPath && suit.texturePath ? (
          <div className="tb-panel">
            <SuitStill geoPath={suit.geoPath} texturePath={suit.texturePath} hiddenBones={suit.hiddenBones} cape={suit.cape} name={suit.name} />
          </div>
        ) : (
          <div className="tb-inset aspect-[3/4]" />
        )}
        <span className="mt-1.5 block text-sm font-semibold leading-tight text-white group-hover:underline">{suit.name}</span>
        <span className="block text-xs text-neutral-500">
          Tier {suit.tier}
          {versions ? ` · ${versions} version${versions === 1 ? '' : 's'}` : ''}
          {suit.wip && ' · WIP'}
        </span>
      </Link>
    </li>
  )
}

const grid = 'mt-3 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6'

function SuitsIndex() {
  const [query, setQuery] = useState('')
  const [showWip, setShowWip] = useState(false)

  const groups = useMemo(() => familiesByCollection(), [])
  const normalized = query.trim().toLowerCase()

  const characterCount = suits.filter((s) => !s.parent && !s.wip).length
  const variantCount = suits.filter((s) => s.parent && !s.wip).length

  const visible = (s: Suit) => (showWip || !s.wip) && (!normalized || s.name.toLowerCase().includes(normalized))
  const matches = normalized ? suits.filter(visible).sort((a, b) => Number(!!a.parent) - Number(!!b.parent) || a.name.localeCompare(b.name)) : []

  return (
    <div>
      <h1>Suits</h1>
      <p className="text-neutral-400">
        {characterCount} characters and {variantCount} alternate versions, each with its own abilities and recipe.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter suits…"
          className="tb-inset w-full max-w-sm rounded-md px-3 py-2 text-sm outline-none focus:!border-blue-400"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input type="checkbox" checked={showWip} onChange={(e) => setShowWip(e.target.checked)} className="h-4 w-4 accent-accent" />
          Show WIP suits
        </label>
      </div>

      {normalized ? (
        <section className="mt-8">
          <h2>
            {matches.length} match{matches.length === 1 ? '' : 'es'}
          </h2>
          <ul className={grid}>
            {matches.map((suit) => (
              <SuitCard key={suit.id} suit={suit} />
            ))}
          </ul>
        </section>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map(({ collection, families }) => {
            const shown = families.filter((f) => visible(f.base))
            if (shown.length === 0) return null
            return (
              <section key={collection.id}>
                <h2>
                  {collection.name} <span className="font-normal text-neutral-500">{shown.length}</span>
                </h2>
                <ul className={grid}>
                  {shown.map((f) => (
                    <SuitCard key={f.base.id} suit={f.base} versions={f.variants.filter((v) => showWip || !v.wip).length} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
