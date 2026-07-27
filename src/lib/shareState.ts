// Encodes the matchup settings into the URL so a specific scenario can be linked.
// Short keys keep the link readable; unknown/missing keys just fall back to defaults.

export interface ShareableMatchup {
  atkSuit: string
  defSuit: string
  atkIv: number
  defIv: number
  cps: number
  melee: boolean
  onType: boolean
  inputDelay: number
  abilityMiss: number
  meleeMiss: number
  ultLock: boolean
  meleeUptime: number
}

const KEYS: Record<keyof ShareableMatchup, string> = {
  atkSuit: 'a',
  defSuit: 'd',
  atkIv: 'ai',
  defIv: 'di',
  cps: 'c',
  melee: 'm',
  onType: 'ft',
  inputDelay: 'id',
  abilityMiss: 'am',
  meleeMiss: 'mm',
  ultLock: 'ul',
  meleeUptime: 'mu',
}

export function encodeMatchup(state: ShareableMatchup): string {
  const params = new URLSearchParams()
  for (const [field, short] of Object.entries(KEYS) as [keyof ShareableMatchup, string][]) {
    const value = state[field]
    params.set(short, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
  }
  return params.toString()
}

/** Returns only the fields actually present in the URL, so callers can layer over defaults. */
export function decodeMatchup(search: string): Partial<ShareableMatchup> {
  const params = new URLSearchParams(search)
  const out: Partial<ShareableMatchup> = {}
  const num = (raw: string | null) => {
    if (raw === null) return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }
  const bool = (raw: string | null) => (raw === null ? undefined : raw === '1')

  const atkSuit = params.get(KEYS.atkSuit)
  const defSuit = params.get(KEYS.defSuit)
  if (atkSuit) out.atkSuit = atkSuit
  if (defSuit) out.defSuit = defSuit

  const assignNum = (field: keyof ShareableMatchup) => {
    const v = num(params.get(KEYS[field]))
    if (v !== undefined) (out as Record<string, unknown>)[field] = v
  }
  const assignBool = (field: keyof ShareableMatchup) => {
    const v = bool(params.get(KEYS[field]))
    if (v !== undefined) (out as Record<string, unknown>)[field] = v
  }

  ;(['atkIv', 'defIv', 'cps', 'inputDelay', 'abilityMiss', 'meleeMiss', 'meleeUptime'] as const).forEach(assignNum)
  ;(['melee', 'onType', 'ultLock'] as const).forEach(assignBool)

  return out
}
