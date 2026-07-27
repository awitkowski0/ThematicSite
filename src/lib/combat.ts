// Combat maths, traced from the mod's SOURCE rather than the in-game guidebook — the
// guidebook's "Stats Explained" page is structurally right but its constants are stale and
// it omits the terms that actually dominate. Verified against:
//   StatUtils.scale / ThematicModifier.getModifier  -> the generic scaling form
//   Stats.java:16-49                                -> the real min/max per stat
//   DefenseStatMixin.java:29-59                     -> defense is a flat divisor
//   ThematicAbility.java:576-605                    -> ability damage has NO attack term
//   ThematicHelper.getAttack:809-823                -> melee only, /8 when off-type
//   InGameHudThematicUIMixin.java:133               -> health shown as actual x50
import { Suit } from './suits'

// Generic form behind every stat: (max - min) * (value - 1) / 98 + min.
const scale = (value: number, min: number, max: number) => ((max - min) * (value - 1)) / 98 + min

// Real ranges from Stats.java — these are gamerule-tunable per server, so a given world can
// differ, but these are the shipped defaults.
export const ATTACK_MIN = 6.5
export const ATTACK_MAX = 8.0
export const DEFENSE_MIN = 70
export const DEFENSE_MAX = 78
export const UTILITY_MIN = 19
export const UTILITY_MAX = 21

/** Melee/arrow attack power. NOT used by abilities — see abilityDamage(). */
export const attackOutput = (value: number) => scale(value, ATTACK_MIN, ATTACK_MAX)
/** Incoming damage is DIVIDED by this (DefenseStatMixin: `amount /= defense`). */
export const defenseReduction = (value: number) => scale(value, DEFENSE_MIN, DEFENSE_MAX)
/** Utility is a REVERSE stat: higher value -> lower output -> shorter cooldown. */
export const utilityOutput = (value: number) => UTILITY_MAX + UTILITY_MIN - scale(value, UTILITY_MIN, UTILITY_MAX)

// Wrong fighting type for the situation (bare hands = BRAWLER, weapon = DUELIST) divides
// melee attack by 8 — undocumented, and the biggest single swing in the melee formula.
export const OFF_TYPE_PENALTY = 8

// The HUD renders health as actual × 50, so a 20-heart player reads as 1000.
export const HEALTH_DISPLAY_SCALE = 50
export const VANILLA_MAX_HEALTH = 20

export const RARITIES = [
  { name: 'Common', iv: 1 },
  { name: 'Uncommon', iv: 2 },
  { name: 'Rare', iv: 3 },
  { name: 'Epic', iv: 4 },
  { name: 'Legendary', iv: 5 },
]

export const MAX_SYNERGY = 10
export const FIST_BASE_DAMAGE = 1
export const DEFAULT_CPS = 6

/** Base + (IV*2) + Synergy. StatUtils.modifiedStat clamps at >= 0 only — no upper clamp. */
export function statValue(suit: Suit | undefined, label: string, iv: number, synergy = 0): number | undefined {
  const range = suit?.stats.find((s) => s.label === label)
  if (!range) return undefined
  return Math.max(0, Math.min(range.maximum, range.minimum) + iv * 2 + synergy)
}

// The sheet's `damage` column doubles as a generic numeric parameter for non-attacks
// (flight = 0.006 for speed, acrobatics = 0.8 for a jump multiplier), so a damage value
// alone doesn't mean an ability hurts anyone. The guidebook's name prefixes are the
// reliable signal.
const NON_DAMAGING_PREFIXES = ['[PASSIVE]', '[EQUIP]', '[COSMETIC]']

export function isDamagingAbility(name: string, damage: number | undefined): boolean {
  if (damage === undefined || damage <= 0) return false
  return !NON_DAMAGING_PREFIXES.some((p) => name.startsWith(p))
}

export const isUltimate = (name: string) => name.startsWith('[ULT]')

// Hits landed per activation are hardcoded per ability in Java, not in any data file, so
// they can only be filled in as each one is traced. Everything else assumes a single hit,
// which is right for most but badly wrong for the few multi-hit ones.
export const ABILITY_HITS: Record<string, number> = {
  speed_punches: 10, // SpeedPunchesAbility.java:42 — fixed 10-hit loop, ignores duration
  heat_vision: 70, // HeatVisionAbility.java:75-97 — one beam per tick for ~70 ticks
}

export function hitsPerUse(abilityId: string): number {
  return ABILITY_HITS[abilityId] ?? 1
}

export interface DamageResult {
  actual: number
  displayed: number
  perHitActual: number
  hits: number
  hitsToKill: number
  percentOfHealth: number
}

/**
 * Ability damage. Deliberately has NO attack term: ThematicAbility.damage() returns a flat
 * value straight from suit JSON / server scoreboard, and the hit is dealt with that number
 * raw. Only defense divides it.
 */
export function abilityDamage(baseDamage: number, defense: number, hits = 1): DamageResult {
  const perHitActual = baseDamage / defenseReduction(defense)
  const actual = perHitActual * hits
  return {
    actual,
    displayed: actual * HEALTH_DISPLAY_SCALE,
    perHitActual,
    hits,
    hitsToKill: actual > 0 ? Math.ceil(VANILLA_MAX_HEALTH / actual) : Infinity,
    percentOfHealth: (actual / VANILLA_MAX_HEALTH) * 100,
  }
}

/** Melee, which DOES use the Attack stat (ThematicHelper.getAttack). */
export function meleeDamage(attack: number, defense: number, onFightingType = true): DamageResult {
  const raw = attackOutput(attack) / (onFightingType ? 1 : OFF_TYPE_PENALTY)
  const perHitActual = raw / defenseReduction(defense)
  return {
    actual: perHitActual,
    displayed: perHitActual * HEALTH_DISPLAY_SCALE,
    perHitActual,
    hits: 1,
    hitsToKill: perHitActual > 0 ? Math.ceil(VANILLA_MAX_HEALTH / perHitActual) : Infinity,
    percentOfHealth: (perHitActual / VANILLA_MAX_HEALTH) * 100,
  }
}

/**
 * Ultimates bypass Utility entirely (ThematicAbility.java:465-469 pins utilityFactor to 20),
 * so their cooldown is literally the base value in seconds.
 */
export function actualCooldown(baseCooldownSeconds: number, utility: number, ultimate = false): number {
  return ultimate ? baseCooldownSeconds : (baseCooldownSeconds * utilityOutput(utility)) / 20
}

export function timeToKill(hitsToKill: number, cooldownSeconds: number): number | undefined {
  if (!Number.isFinite(hitsToKill) || hitsToKill <= 0) return undefined
  if (!Number.isFinite(cooldownSeconds) || cooldownSeconds <= 0) return undefined
  return (hitsToKill - 1) * cooldownSeconds
}

export interface FightSource {
  label: string
  dps: number
  detail: string
}

export interface FightEvent {
  /** Seconds into the fight. */
  t: number
  kind: 'ability' | 'melee' | 'kill' | 'idle'
  label: string
  /** Actual health removed by this entry. */
  damage: number
  /** Target health remaining afterwards, in actual units. */
  hpAfter: number
}

export interface FightResult {
  sources: FightSource[]
  totalDps: number
  ttk?: number
  events: FightEvent[]
  /** True when the log was cut short to keep it readable. */
  eventsTruncated: boolean
}

/** Keeps a long stalemate from producing thousands of log lines. */
const MAX_EVENTS = 120

export interface FightOptions {
  abilities: { id: string; name: string; damage?: number; cooldown?: number; duration?: number; range?: number }[]
  attack: number
  defense: number
  utility: number
  cps: number
  includeMelee: boolean
  onFightingType: boolean
  /** Seconds between ability presses. You can only drive one ability at a time. */
  inputDelay: number
  /** 0-1. A missed ability still burns its cooldown. */
  abilityMissRate: number
  /** 0-1. Separate from abilities — melee is generally easier to land. */
  meleeMissRate: number
  /** Model the real ultimate lockout: using an ult parks your other abilities. */
  ultimateLockout: boolean
  /**
   * 0-1. Fraction of the fight you're actually close enough to swing, given the other
   * player strafing and keeping distance. Separate from miss rate: this is "could you
   * reach them at all", not "did the swing connect". Applies to melee only — abilities
   * are assumed usable whenever they're off cooldown, whatever their range.
   */
  meleeUptime: number
}

const SIM_STEP = 0.05 // seconds
const SIM_CAP = 900 // give up after 15 simulated minutes

/**
 * Time-stepped rotation model rather than a sum of independent DPS numbers — a player can
 * only drive one ability at a time, so abilities compete for the same input budget instead
 * of all firing in parallel the instant they come off cooldown. Each decision point the
 * player fires the hardest-hitting ability that's actually ready; melee fills the rest.
 *
 * Still optimistic (perfect target tracking, no movement, no blocking), so treat it as a
 * floor rather than a prediction.
 */
export function simulateFight(o: FightOptions): FightResult {
  const abilityHit = Math.max(0, Math.min(1, 1 - o.abilityMissRate))
  const meleeHit = Math.max(0, Math.min(1, 1 - o.meleeMissRate))
  const reach = Math.max(0, Math.min(1, o.meleeUptime))

  const usable = o.abilities
    .filter((a) => isDamagingAbility(a.name, a.damage) && a.damage !== undefined && a.cooldown && a.cooldown > 0)
    .map((a) => {
      const ult = isUltimate(a.name)
      const hits = hitsPerUse(a.id)
      return {
        id: a.id,
        name: a.name,
        ult,
        hits,
        perUse: abilityDamage(a.damage!, o.defense, hits),
        cooldown: actualCooldown(a.cooldown!, o.utility, ult),
        duration: a.duration ?? 0,
      }
    })
    // Fire the biggest hit available first — a rough stand-in for how people actually play.
    .sort((a, b) => b.perUse.actual - a.perUse.actual)

  const meleePerHit = o.includeMelee && o.cps > 0 ? meleeDamage(o.attack, o.defense, o.onFightingType) : undefined

  const dealt = new Map<string, number>()
  const uses = new Map<string, number>()
  const readyAt = new Map<string, number>(usable.map((a) => [a.id, 0]))

  let hp = VANILLA_MAX_HEALTH
  let nextPress = 0
  let lockedUntil = 0
  let t = 0

  const events: FightEvent[] = []
  let eventsTruncated = false
  // Melee lands continuously; logging every 50ms step would bury the log, so it's rolled
  // up and flushed as one entry whenever something noteworthy happens.
  let pendingMelee = 0
  let pendingMeleeSince = 0

  const push = (e: FightEvent) => {
    if (events.length < MAX_EVENTS) events.push(e)
    else eventsTruncated = true
  }

  const flushMelee = (now: number) => {
    if (pendingMelee <= 0) return
    const swings = Math.round((now - pendingMeleeSince) * o.cps * reach)
    push({
      t: pendingMeleeSince,
      kind: 'melee',
      label: swings > 0 ? `Melee × ${swings}` : 'Melee',
      damage: pendingMelee,
      hpAfter: hp,
    })
    pendingMelee = 0
    pendingMeleeSince = now
  }

  for (; t < SIM_CAP && hp > 0; t += SIM_STEP) {
    if (meleePerHit) {
      const chunk = meleePerHit.actual * o.cps * meleeHit * reach * SIM_STEP
      hp -= chunk
      dealt.set('Melee', (dealt.get('Melee') ?? 0) + chunk)
      pendingMelee += chunk
    }

    if (t >= nextPress && t >= lockedUntil) {
      const choice = usable.find((a) => (readyAt.get(a.id) ?? 0) <= t)
      if (choice) {
        const landed = choice.perUse.actual * abilityHit
        hp -= landed
        dealt.set(choice.name, (dealt.get(choice.name) ?? 0) + landed)
        uses.set(choice.name, (uses.get(choice.name) ?? 0) + 1)
        readyAt.set(choice.id, t + choice.cooldown)
        nextPress = t + o.inputDelay
        flushMelee(t)
        push({ t, kind: 'ability', label: choice.name, damage: landed, hpAfter: Math.max(0, hp) })
        // AbilityEventDispatcher.java:167-199 — an ultimate parks your other abilities for
        // its duration.
        if (choice.ult && o.ultimateLockout) lockedUntil = t + choice.duration
      }
    }
  }

  const killed = hp <= 0
  const elapsed = Math.max(t, SIM_STEP)
  flushMelee(elapsed)
  push(
    killed
      ? { t: elapsed, kind: 'kill', label: 'Target down', damage: 0, hpAfter: 0 }
      : { t: elapsed, kind: 'idle', label: 'Still standing', damage: 0, hpAfter: Math.max(0, hp) },
  )

  const sources: FightSource[] = [...dealt.entries()]
    .map(([label, total]) => {
      const count = uses.get(label)
      return {
        label,
        dps: total / elapsed,
        detail: count
          ? `${count} use${count === 1 ? '' : 's'} · ${((total / elapsed) * HEALTH_DISPLAY_SCALE).toFixed(1)}/s`
          : `${o.cps} CPS · ${Math.round(reach * 100)}% in range`,
      }
    })
    .sort((a, b) => b.dps - a.dps)

  const totalDps = sources.reduce((s, x) => s + x.dps, 0)
  return { sources, totalDps, ttk: killed ? elapsed : undefined, events, eventsTruncated }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`
  const mins = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  if (mins < 60) return rest ? `${mins}m ${rest}s` : `${mins}m`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m`
}
