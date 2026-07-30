import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { getSuit, releasedSuits } from '../lib/suits'
import { MaterialNeed, SHINY_CHANCE, planSuit, rollsPerUnit, shinyOdds } from '../lib/planner'
import { usePersistentState } from '../lib/usePersistentState'
import { ItemIcon, SuitSelect, inputClass } from '../components/controls'

export const Route = createFileRoute('/planner')({
  head: () => ({
    meta: [
      { title: 'Craft planner — Thematic' },
      { name: 'description', content: 'Work out every material you need to craft a batch of Thematic suits, where to mine them, and your odds of rolling a shiny.' },
    ],
  }),
  component: PlannerPage,
})

const selectClass =
  'mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950'

const SOURCE_STYLES: Record<string, string> = {
  ore: 'text-amber-700 dark:text-amber-500',
  structure: 'text-purple-700 dark:text-purple-400',
  mob: 'text-rose-700 dark:text-rose-400',
  crafted: 'text-blue-600 dark:text-blue-400',
  vanilla: 'text-neutral-500',
  unknown: 'text-neutral-500',
}

function MaterialRow({ need }: { need: MaterialNeed }) {
  return (
    <li className="flex items-center gap-3 border-b border-neutral-100 py-2 last:border-b-0 dark:border-neutral-900">
      <ItemIcon path={need.iconPath} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{need.name}</span>
        {need.options?.length ? (
          <span className="block text-xs text-neutral-500">{need.options.slice(0, 8).join(', ')}{need.options.length > 8 ? `, +${need.options.length - 8} more` : ''}</span>
        ) : (
          need.source && <span className={`block text-xs ${SOURCE_STYLES[need.source.kind] ?? 'text-neutral-500'}`}>{need.source.detail}</span>
        )}
      </span>
      <span className="shrink-0 tabular-nums font-medium">×{need.total.toLocaleString()}</span>
    </li>
  )
}

function PlannerPage() {
  const pickable = useMemo(() => releasedSuits((s) => Boolean(s.recipe?.length)), [])

  const [suitId, setSuitId] = usePersistentState('plannerSuit', 'clark_kent')
  const [quantity, setQuantity] = usePersistentState('plannerQty', 30)
  const [expand, setExpand] = usePersistentState('plannerExpand', true)

  // A shared link wins over stored settings, but only on first load.
  const [shareApplied, setShareApplied] = useState(false)
  useEffect(() => {
    if (shareApplied) return
    setShareApplied(true)
    const params = new URLSearchParams(window.location.search)
    const s = params.get('s')
    const q = Number(params.get('q'))
    const x = params.get('x')
    if (s) setSuitId(s)
    if (Number.isFinite(q) && q > 0) setQuantity(Math.max(1, Math.min(999, q)))
    if (x !== null) setExpand(x === '1')
  }, [shareApplied])

  const [copied, setCopied] = useState(false)
  const share = () => {
    const url = `${window.location.origin}${window.location.pathname}?s=${encodeURIComponent(suitId)}&q=${quantity}&x=${expand ? 1 : 0}`
    window.history.replaceState(null, '', url)
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {},
    )
  }

  const suit = getSuit(suitId) ?? pickable[0]
  const qty = Math.max(1, Math.min(999, quantity))

  const plan = useMemo(() => (suit ? planSuit(suit, qty, expand) : undefined), [suit, qty, expand])
  const rolls = plan ? rollsPerUnit(plan.chain) : 1
  const totalRolls = qty * rolls
  const odds = useMemo(() => shinyOdds(totalRolls), [totalRolls])

  const stackCount = (n: number) => `${Math.floor(n / 64)}×64 + ${n % 64}`

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold">Craft planner</h1>
        <button type="button" onClick={share} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
          {copied ? 'Link copied' : 'Share this plan'}
        </button>
      </div>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Planning a shiny grind, or just a batch? Pick a suit and how many you want, and this works out every material — including the base suit if you're
        making an alt — and where to go get it.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SuitSelect label="Suit" value={suit?.id ?? ''} options={pickable} onChange={setSuitId} />
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">How many</span>
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
            className={inputClass}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-neutral-600 dark:text-neutral-400">
          <input type="checkbox" checked={expand} onChange={(e) => setExpand(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700" />
          Break down to raw materials
        </label>
      </div>

      {suit && plan && (
        <>
          <div className="mt-6 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="font-semibold">Shiny odds</h2>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <div>
                <div className="text-3xl font-bold tabular-nums">{(odds.atLeastOne * 100).toFixed(1)}%</div>
                <div className="text-xs text-neutral-500">
                  chance of at least one shiny from {qty} {qty === 1 ? 'suit' : 'suits'}
                  {rolls > 1 ? ` (${totalRolls} rolls)` : ''}
                </div>
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                {odds.expected} crafts per shiny on average · {odds.for50} rolls for a coin flip · {odds.for90} for 90% · {odds.for99} for 99%
              </div>
            </div>
            {rolls > 1 && (
              <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950/30 dark:text-green-300">
                Alts roll twice: once when you craft {plan?.chain[0].name}, again when you alt it into {suit.name}. That's {rolls} chances per finished suit,
                which makes an alt a better shiny grind than crafting a base suit over and over.
              </p>
            )}
            <p className="mt-3 text-xs text-neutral-500">
              Every craft is an independent {(SHINY_CHANCE * 100).toFixed(0)}% roll — no pity, and past failures don't improve your next one. Server admins can
              change the rate with the <code>shinyChance</code> gamerule.{' '}
              <Link to="/mechanics/shiny" className="text-blue-600 hover:underline dark:text-blue-400">
                How shinies work
              </Link>
            </p>
          </div>

          {plan.chain.length > 1 && (
            <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              {suit.name} is an alt of {plan.chain[0].name}, so each one also costs a full {plan.chain[0].name}. Both recipes are included below —{' '}
              {qty} × ({plan.chain.map((c) => c.name).join(' + ')}).
            </p>
          )}

          {plan.suitsConsumed.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Suits you'll need</h2>
              <ul className="mt-2">
                {plan.suitsConsumed.map((need) => (
                  <MaterialRow key={need.id} need={need} />
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-lg font-semibold">{expand ? 'Raw materials' : 'Direct ingredients'}</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {expand
                ? 'Everything broken down as far as recipes go, for all ' + qty + ' suits.'
                : 'Just the top-level ingredients — tick the box above to break these down further.'}
            </p>
            <ul className="mt-3">
              {(expand ? plan.raw : plan.direct).map((need) => (
                <MaterialRow key={need.id} need={need} />
              ))}
            </ul>
          </section>

          {expand && plan.raw.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Where to get it</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {plan.raw
                  .filter((n) => n.source && n.source.kind !== 'crafted')
                  .map((n) => (
                    <li key={n.id} className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-medium">{n.name}</span>
                      <span className="text-neutral-600 dark:text-neutral-400">{n.source?.detail}</span>
                      <span className="text-xs text-neutral-500">need {n.total.toLocaleString()} ({stackCount(n.total)})</span>
                    </li>
                  ))}
              </ul>
              <p className="mt-3 text-xs text-neutral-500">
                Ore depths come from the mod's own worldgen; structure and mob drops are from the in-game guidebook.{' '}
                <Link to="/mechanics/ores" className="text-blue-600 hover:underline dark:text-blue-400">
                  Full ore table
                </Link>
              </p>
            </section>
          )}

          <p className="mt-8 text-xs text-neutral-500">
            Counts assume nothing is wasted and every craft succeeds. Recipes come from the mod itself — see{' '}
            <Link to="/suits/$id" params={{ id: suit.id }} className="text-blue-600 hover:underline dark:text-blue-400">
              {suit.name}'s page
            </Link>{' '}
            for the single-suit version.
          </p>
        </>
      )}
    </div>
  )
}
