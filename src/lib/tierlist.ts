import { Suit, collections, getSuit, releasedSuits } from './suits'

export interface TierDef {
  id: string
  label: string
  barClass: string
}

// Fixed S-F ladder — not user-editable. Renaming/adding tiers isn't part of the ask,
// and keeping this a constant (rather than state) keeps the shareable URL to just ids.
export const TIERS: readonly TierDef[] = [
  { id: 's', label: 'S', barClass: 'bg-rose-500' },
  { id: 'a', label: 'A', barClass: 'bg-orange-500' },
  { id: 'b', label: 'B', barClass: 'bg-amber-400' },
  { id: 'c', label: 'C', barClass: 'bg-lime-500' },
  { id: 'd', label: 'D', barClass: 'bg-sky-500' },
  { id: 'f', label: 'F', barClass: 'bg-neutral-500' },
]

export const ALL_SCOPE = 'all'

export interface TierListState {
  /** 'all' or a CollectionMeta id — a view filter, not a data mutation (see visibleTier). */
  scope: string
  /** Parallel to TIERS — tiers[i] is the ordered list of suit ids placed in TIERS[i]. */
  tiers: string[][]
  /** Suit ids currently displayed with their shiny texture. Display-only, not a ranking. */
  shinies: Record<string, true>
}

export function emptyTiers(): string[][] {
  return TIERS.map(() => [])
}

export function emptyTierList(scope: string = ALL_SCOPE): TierListState {
  return { scope, tiers: emptyTiers(), shinies: {} }
}

function inScope(suit: Suit, scope: string): boolean {
  return scope === ALL_SCOPE || suit.collection === scope
}

/** Suits not yet placed in any tier, restricted to `scope` and optionally a pool-only filter. */
export function poolSuits(state: TierListState, poolFilter?: string): Suit[] {
  const placed = new Set(state.tiers.flat())
  return releasedSuits((s) => !placed.has(s.id) && inScope(s, state.scope) && (!poolFilter || s.collection === poolFilter))
}

/**
 * A tier's ids filtered down to the current scope, resolved to Suit objects. Out-of-scope
 * placements are hidden, not deleted, from `state.tiers` — switching scope back to 'all'
 * (or to a different collection) brings them back into view.
 */
export function visibleTier(state: TierListState, tierIndex: number): Suit[] {
  return state.tiers[tierIndex]
    .map((id) => getSuit(id))
    .filter((s): s is Suit => Boolean(s) && !s!.wip && inScope(s!, state.scope))
}

/**
 * Moves a suit to `dest` (a tier id from TIERS, or 'pool' to unassign), removing it from
 * wherever it currently sits first so a suit is never in two tiers at once.
 */
export function moveSuit(tiers: string[][], suitId: string, dest: string, index?: number): string[][] {
  const next = tiers.map((t) => t.filter((id) => id !== suitId))
  if (dest === 'pool') return next

  const destIndex = TIERS.findIndex((t) => t.id === dest)
  if (destIndex === -1) return tiers // unknown destination — leave state untouched

  const at = index === undefined ? next[destIndex].length : Math.max(0, Math.min(index, next[destIndex].length))
  next[destIndex] = [...next[destIndex].slice(0, at), suitId, ...next[destIndex].slice(at)]
  return next
}

export function toggleShiny(shinies: Record<string, true>, suitId: string): Record<string, true> {
  const next = { ...shinies }
  if (next[suitId]) delete next[suitId]
  else next[suitId] = true
  return next
}

/** Collections in the same order the rest of the site presents them (starters last). */
const LAST_COLLECTIONS = new Set(['starters'])
export function orderedCollections() {
  return collections
    .slice()
    .sort((a, b) => {
      const aLast = LAST_COLLECTIONS.has(a.id) ? 1 : 0
      const bLast = LAST_COLLECTIONS.has(b.id) ? 1 : 0
      return aLast - bLast || a.importance - b.importance || a.name.localeCompare(b.name)
    })
}
