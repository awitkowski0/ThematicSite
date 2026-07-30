// Encodes a tier list into the URL so a specific ranking can be linked. Suit/collection ids
// are already URL-safe (lowercase, digits, underscore), so plain delimiters beat base64 for
// both size and debuggability. Only placed suits are ever encoded — the pool stays local.
import { ALL_SCOPE, TierListState, emptyTiers } from './tierlist'
import { getSuit } from './suits'

export function encodeTierList(state: TierListState): string {
  const params = new URLSearchParams()
  if (state.scope !== ALL_SCOPE) params.set('x', state.scope)
  if (state.tiers.some((t) => t.length)) params.set('t', state.tiers.map((t) => t.join(',')).join('.'))
  const shiny = Object.keys(state.shinies)
  if (shiny.length) params.set('z', shiny.join(','))
  return params.toString()
}

/** Returns only the fields actually present in the URL, so callers can layer over defaults. */
export function decodeTierList(search: string): Partial<TierListState> {
  const params = new URLSearchParams(search)
  const out: Partial<TierListState> = {}

  const x = params.get('x')
  if (x) out.scope = x

  const t = params.get('t')
  if (t !== null) {
    const tiers = emptyTiers()
    const groups = t.split('.')
    groups.forEach((group, i) => {
      if (i >= tiers.length || !group) return
      tiers[i] = group.split(',').filter((id) => {
        const suit = getSuit(id)
        return suit && !suit.wip
      })
    })
    out.tiers = tiers
  }

  const z = params.get('z')
  if (z) {
    out.shinies = Object.fromEntries(
      z
        .split(',')
        .filter((id) => getSuit(id))
        .map((id) => [id, true as const]),
    )
  }

  return out
}
