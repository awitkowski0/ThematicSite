import data from '../data/abilities.generated.json'

export interface AbilityBalance {
  id: string
  damage?: number
  /** Seconds, not ticks. */
  cooldown?: number
  duration?: number
  range?: number
  amplifier?: number
  type?: string
}

interface AbilityData {
  abilities: Record<string, AbilityBalance>
  projectiles: Record<string, AbilityBalance>
}

const { abilities, projectiles } = data as AbilityData

// What the mod falls back to when nothing supplies a value (ThematicAbility.damage()).
export const DEFAULT_BASE_DAMAGE = 5
export const DEFAULT_BASE_COOLDOWN = 5

export const abilityBalances = abilities
export const projectileBalances = projectiles

export function balanceFor(abilityId: string): AbilityBalance | undefined {
  return abilities[abilityId]
}

export function statsForAbility(abilityId: string): { damage: number; cooldown: number; known: boolean } {
  const entry = abilities[abilityId]
  return {
    damage: entry?.damage ?? DEFAULT_BASE_DAMAGE,
    cooldown: entry?.cooldown ?? DEFAULT_BASE_COOLDOWN,
    known: entry?.damage !== undefined,
  }
}
