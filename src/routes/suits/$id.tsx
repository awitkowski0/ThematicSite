import { useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { Suit, SuitAbility, accentForCollection, getSuit, variantsOf } from '../../lib/suits'
import { getCategory } from '../../lib/book'
import { RecipeTree } from '../../components/RecipeTree'
import SuitFigure from '../../components/SuitFigure'
import { SuitStill } from '../../components/SuitStill'

export const Route = createFileRoute('/suits/$id')({
  loader: ({ params }) => {
    const suit = getSuit(params.id)
    if (!suit) throw notFound()
    return suit
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Thematic` },
          {
            name: 'description',
            content: `${loaderData.name} is a ${loaderData.collectionName} suit in the Thematic Minecraft mod (tier ${loaderData.tier}), with ${loaderData.abilities.length} abilities.`,
          },
        ]
      : [],
  }),
  component: SuitDetail,
  notFoundComponent: () => (
    <div>
      <h1>Suit not found</h1>
      <p className="text-neutral-400">
        It might be work-in-progress and not released yet.{' '}
        <Link to="/suits" className="text-blue-600 hover:underline dark:text-blue-400">
          Browse all suits
        </Link>
        .
      </p>
    </div>
  ),
})

/** Weakness and immunity "abilities" read as facts on the dossier, not as moves. */
const factPrefixes = ['weakness_', 'immunity_'] as const

const SLOT_GROUPS: { label: string; slots: SuitAbility['slot'][] }[] = [
  { label: 'Ultimate', slots: ['ultimate'] },
  { label: 'Moves', slots: ['active', 'equip', 'unknown'] },
  { label: 'Passives', slots: ['passive'] },
  { label: 'Utility and cosmetic', slots: ['utility', 'cosmetic'] },
]

/** Alts shown before "Show all". */
const VERSIONS_SHOWN = 12

const bookAbilities = new Set(getCategory('ability')?.entries.map((e) => e.id) ?? [])

function humanize(path: string) {
  return path
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

/** "Superman (1997)" under Superman reads "1997"; a differently named version keeps its name. */
function versionName(name: string, base: string) {
  const prefix = `${base} (`
  return name.startsWith(prefix) && name.endsWith(')') ? name.slice(prefix.length, -1) : name
}

function plainName(name: string) {
  return name.replace(/^\[[A-Z]+\]\s*/, '')
}

function Figure({ suit }: { suit: Suit }) {
  const [failed, setFailed] = useState(false)
  if (!suit.geoPath || !suit.texturePath || failed) return null
  return (
    <div className="tb-panel">
      <SuitFigure geoPath={suit.geoPath} texturePath={suit.texturePath} shinyTexturePath={suit.shinyTexturePath} hiddenBones={suit.hiddenBones} cape={suit.cape} textureAnimation={suit.textureAnimation} shinyTextureAnimation={suit.shinyTextureAnimation} name={suit.name} onError={() => setFailed(true)} />
    </div>
  )
}

function Stats({ suit }: { suit: Suit }) {
  if (suit.stats.length === 0) return null
  return (
    <section>
      <h2>Stats</h2>
      <ul className="mt-3 space-y-2">
        {suit.stats.map((stat) => (
          <li key={stat.id} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3 text-sm">
            <span className="text-neutral-400">{stat.label}</span>
            <span className="tb-inset relative h-2.5">
              <span
                className="absolute inset-y-0"
                style={{ left: `${stat.minimum}%`, width: `${Math.max(stat.maximum - stat.minimum, 1)}%`, backgroundColor: accentForCollection(suit.collection) }}
              />
            </span>
            <span className="text-right tabular-nums text-neutral-400">
              {stat.minimum}–{stat.maximum}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-neutral-500">
        The range each stat rolls in; a higher{' '}
        <Link to="/mechanics/rarities" className="text-blue-400 hover:underline">
          rarity
        </Link>{' '}
        rolls nearer the top.{' '}
        <Link to="/mechanics/stats" className="text-blue-400 hover:underline">
          How stats work
        </Link>
      </p>
    </section>
  )
}

function Facts({ suit, base }: { suit: Suit; base?: Suit }) {
  const weak = suit.abilities.filter((a) => a.id.startsWith('weakness_')).map((a) => humanize(a.id.slice(9)))
  const immune = suit.abilities.filter((a) => a.id.startsWith('immunity_')).map((a) => humanize(a.id.slice(9)))
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="tb-label">Affiliation</dt>
        <dd className="mt-0.5">{suit.collectionName}</dd>
      </div>
      {base && (
        <div>
          <dt className="tb-label">Version of</dt>
          <dd className="mt-0.5">
            <Link to="/suits/$id" params={{ id: base.id }} className="text-blue-400 hover:underline">
              {base.name}
            </Link>
          </dd>
        </div>
      )}
      {weak.length > 0 && (
        <div>
          <dt className="tb-label !text-[#ff6b6b]">Weaknesses</dt>
          <dd className="mt-0.5">{weak.join(', ')}</dd>
        </div>
      )}
      {immune.length > 0 && (
        <div>
          <dt className="tb-label">Immune to</dt>
          <dd className="mt-0.5">{immune.join(', ')}</dd>
        </div>
      )}
    </dl>
  )
}

function Abilities({ suit }: { suit: Suit }) {
  const moves = suit.abilities.filter((a) => !factPrefixes.some((p) => a.id.startsWith(p)))
  if (moves.length === 0) return null
  return (
    <section className="space-y-6">
      {SLOT_GROUPS.map((g) => {
        const list = moves.filter((a) => g.slots.includes(a.slot))
        if (list.length === 0) return null
        return (
          <div key={g.label}>
            <h2>{g.label}</h2>
            <ul className="mt-2 divide-y divide-neutral-800">
              {list.map((ability) => (
                <li key={ability.id} className="py-2.5">
                  {bookAbilities.has(ability.id) ? (
                    <a href={`/wiki/ability/${ability.id}`} className="font-semibold text-white hover:underline">
                      {plainName(ability.name)}
                    </a>
                  ) : (
                    <span className="font-semibold text-white">{plainName(ability.name)}</span>
                  )}
                  {ability.description && <p className="mt-0.5 text-sm text-neutral-400">{ability.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

function Versions({ suit }: { suit: Suit }) {
  const variants = variantsOf(suit.id)
  const [all, setAll] = useState(false)
  if (variants.length === 0) return null
  const shown = all ? variants : variants.slice(0, VERSIONS_SHOWN)
  return (
    <section className="mt-12 border-t border-neutral-800 pt-8">
      <h2>Other versions</h2>
      <p className="mt-1 text-sm text-neutral-400">
        {variants.length} suit{variants.length === 1 ? '' : 's'} built from {suit.name}; each also costs a full {suit.name} at the bench.
      </p>
      <ul className="mt-4 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
        {shown.map((v) => (
          <li key={v.id}>
            <Link to="/suits/$id" params={{ id: v.id }} className="group block">
              {v.geoPath && v.texturePath ? (
                <div className="tb-panel">
                  <SuitStill geoPath={v.geoPath} texturePath={v.texturePath} hiddenBones={v.hiddenBones} cape={v.cape} name={v.name} />
                </div>
              ) : (
                <div className="tb-inset aspect-[3/4]" />
              )}
              <span className="mt-1.5 block text-sm leading-tight text-white group-hover:underline">{versionName(v.name, suit.name)}</span>
              {v.wip && <span className="tb-chip mt-1">WIP</span>}
            </Link>
          </li>
        ))}
      </ul>
      {variants.length > VERSIONS_SHOWN && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-2 text-sm text-blue-400 hover:underline">
          {all ? 'Show fewer' : `Show all ${variants.length}`}
        </button>
      )}
    </section>
  )
}

function SuitDetail() {
  const suit = Route.useLoaderData()
  const base = suit.parent ? getSuit(suit.parent) : undefined

  return (
    <div key={suit.id}>
      <h1>
        <span className="min-w-0 flex-1">{suit.name}</span>
        {suit.wip && <span className="tb-chip">WIP</span>}
        <span className="tb-chip">Tier {suit.tier}</span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          <div className="mx-auto max-w-[18rem]">
            <Figure suit={suit} />
          </div>
          <Stats suit={suit} />
        </aside>
        <div className="min-w-0 space-y-8">
          <Facts suit={suit} base={base} />
          <Abilities suit={suit} />
        </div>
      </div>

      {suit.recipe && suit.recipe.length > 0 && (
        <section className="mt-12 border-t border-neutral-800 pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2>Suit Bench recipe</h2>
            <a href={`/planner?s=${suit.id}&q=30&x=1`} className="text-sm text-blue-400 hover:underline">
              Plan a shiny grind →
            </a>
          </div>
          <p className="mt-1 text-sm text-neutral-400">
            {base ? `Also takes a full ${base.name}. ` : ''}Open an ingredient to see how it is made.
          </p>
          <div className="mt-3">
            <RecipeTree ingredients={suit.recipe} />
          </div>
        </section>
      )}

      <Versions suit={suit} />
    </div>
  )
}
