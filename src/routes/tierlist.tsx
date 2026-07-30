import { useEffect, useMemo, useState } from 'react'
import { ClientOnly, Link, createFileRoute } from '@tanstack/react-router'

import { ALL_SCOPE, TierListState, emptyTiers, moveSuit, orderedCollections, poolSuits, toggleShiny } from '../lib/tierlist'
import { decodeTierList, encodeTierList } from '../lib/shareTierList'
import { usePersistentState } from '../lib/usePersistentState'
import { TierBoard, TierBoardSkeleton } from '../components/TierBoard'
import { inputClass, selectClass } from '../components/controls'

export const Route = createFileRoute('/tierlist')({
  head: () => ({
    meta: [
      { title: 'Tier list — Thematic' },
      { name: 'description', content: 'Drag suits into S-F tiers, scope your ranking to one collection, and share the result with a link.' },
    ],
  }),
  component: TierListPage,
})

function TierListPage() {
  const [scope, setScope] = usePersistentState('tierlistScope', ALL_SCOPE)
  const [tiers, setTiers] = usePersistentState('tierlistTiers', emptyTiers())
  const [shinies, setShinies] = usePersistentState<Record<string, true>>('tierlistShinies', {})
  const [poolFilter, setPoolFilter] = usePersistentState('tierlistPoolFilter', '')
  const [search, setSearch] = useState('')

  // A shared link wins over stored settings, but only on first load.
  const [shareApplied, setShareApplied] = useState(false)
  useEffect(() => {
    if (shareApplied) return
    setShareApplied(true)
    const decoded = decodeTierList(window.location.search)
    if (decoded.scope !== undefined) setScope(decoded.scope)
    if (decoded.tiers !== undefined) setTiers(decoded.tiers)
    if (decoded.shinies !== undefined) setShinies(decoded.shinies)
  }, [shareApplied])

  const [copied, setCopied] = useState(false)
  const share = () => {
    const url = `${window.location.origin}${window.location.pathname}?${encodeTierList({ scope, tiers, shinies })}`
    window.history.replaceState(null, '', url)
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {},
    )
  }

  const reset = () => {
    setTiers(emptyTiers())
    setShinies({})
  }

  const state: TierListState = { scope, tiers, shinies }
  const pool = useMemo(
    () => poolSuits(state, scope === ALL_SCOPE ? poolFilter || undefined : undefined),
    [scope, tiers, shinies, poolFilter],
  )
  const visiblePool = useMemo(
    () => (search ? pool.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) : pool),
    [pool, search],
  )
  const poolEmptyMessage =
    pool.length === 0 ? 'Nothing left to place — every suit in scope has a tier.' : 'No suits match your search.'

  const handleMove = (suitId: string, dest: string, index?: number) => setTiers(moveSuit(tiers, suitId, dest, index))
  const handleToggleShiny = (suitId: string) => setShinies(toggleShiny(shinies, suitId))

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold">Tier list</h1>
        <button type="button" onClick={share} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
          {copied ? 'Link copied' : 'Share this list'}
        </button>
      </div>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Drag suits into S through F, scope it to one collection if you'd rather rank a single universe, and toggle the ✨ on a tile to
        show it off shiny. Nothing is saved anywhere but your browser and whatever link you share.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Ranking</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={selectClass}>
            <option value={ALL_SCOPE}>All suits</option>
            {orderedCollections().map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {scope === ALL_SCOPE && (
          <label className="block text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Limit pool to collection</span>
            <select value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)} className={selectClass}>
              <option value="">Every collection</option>
              {orderedCollections().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Search the pool</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suit name…" className={inputClass} />
        </label>
      </div>

      <div className="mt-2 flex justify-end">
        <button type="button" onClick={reset} className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
          Reset tiers
        </button>
      </div>

      <ClientOnly fallback={<TierBoardSkeleton />}>
        <TierBoard state={state} pool={visiblePool} poolEmptyMessage={poolEmptyMessage} onMove={handleMove} onToggleShiny={handleToggleShiny} />
      </ClientOnly>

      <p className="mt-8 text-xs text-neutral-500">
        Colour coding matches the{' '}
        <Link to="/suits" className="text-blue-600 hover:underline dark:text-blue-400">
          suits page
        </Link>
        's collection accents. This is one person's opinion, not an official ranking — the mod itself has no notion of "best".
      </p>
    </div>
  )
}
