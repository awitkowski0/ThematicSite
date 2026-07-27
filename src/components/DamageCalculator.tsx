import { useEffect, useMemo, useState } from 'react'

import { Suit, suits } from '../lib/suits'
import { DEFAULT_BASE_DAMAGE, statsForAbility } from '../lib/abilityStats'
import {
  HEALTH_DISPLAY_SCALE,
  MAX_SYNERGY,
  RARITIES,
  VANILLA_MAX_HEALTH,
  FIST_BASE_DAMAGE,
  abilityDamage,
  actualCooldown,
  statValue,
} from '../lib/combat'

const pickableSuits = () => suits.filter((s) => !s.wip && s.stats.length > 0).sort((a, b) => a.name.localeCompare(b.name))

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  )
}

const selectClass =
  'mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950'
const inputClass =
  'mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neutral-500 dark:border-neutral-700'

function SuitSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const options = useMemo(pickableSuits, [])
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">Custom…</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

function RaritySelect({ label, iv, onChange }: { label: string; iv: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <select value={iv} onChange={(e) => onChange(Number(e.target.value))} className={selectClass}>
        {RARITIES.map((r) => (
          <option key={r.name} value={r.iv}>
            {r.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Always editable — picking a suit seeds it, but you can still drag from there. */
function Slider({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-medium tabular-nums">{Math.round(value)}</span>
      </span>
      <input type="range" min={1} max={99} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-blue-600" />
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  )
}

function AbilitySelect({ suit, value, onChange }: { suit: Suit | undefined; value: string; onChange: (id: string) => void }) {
  return (
    <Field label="Ability">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass} disabled={!suit}>
        <option value="">{suit ? 'Custom…' : 'Pick a suit first'}</option>
        {suit?.abilities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function DamageCalculator() {
  const [attackerId, setAttackerId] = useState('superman')
  const [defenderId, setDefenderId] = useState('batman')
  const [attackerIv, setAttackerIv] = useState(1)
  const [defenderIv, setDefenderIv] = useState(1)
  const [synergy, setSynergy] = useState(0)
  const [abilityId, setAbilityId] = useState('')

  const [attack, setAttack] = useState(75)
  const [defense, setDefense] = useState(60)
  const [baseDamage, setBaseDamage] = useState(5)

  const [cooldownSuitId, setCooldownSuitId] = useState('superman')
  const [cooldownIv, setCooldownIv] = useState(1)
  const [utility, setUtility] = useState(50)
  const [baseCooldown, setBaseCooldown] = useState(15)

  const attacker = suits.find((s) => s.id === attackerId)
  const defender = suits.find((s) => s.id === defenderId)
  const cooldownSuit = suits.find((s) => s.id === cooldownSuitId)

  // Selecting a suit/rarity seeds the sliders; they stay editable afterwards.
  useEffect(() => {
    const v = statValue(attacker, 'Attack', attackerIv, synergy)
    if (v !== undefined) setAttack(v)
  }, [attacker, attackerIv, synergy])

  useEffect(() => {
    const v = statValue(defender, 'Defense', defenderIv, 0)
    if (v !== undefined) setDefense(v)
  }, [defender, defenderIv])

  useEffect(() => {
    const v = statValue(cooldownSuit, 'Utility', cooldownIv, 0)
    if (v !== undefined) setUtility(v)
  }, [cooldownSuit, cooldownIv])

  // Picking an ability seeds damage/cooldown; both remain overridable.
  const abilityStats = abilityId ? statsForAbility(abilityId) : undefined
  useEffect(() => {
    if (!abilityId) return
    const s = statsForAbility(abilityId)
    setBaseDamage(s.damage)
    setBaseCooldown(s.cooldown)
  }, [abilityId])

  // Clear the ability if it isn't on the newly-picked attacker.
  useEffect(() => {
    if (abilityId && !attacker?.abilities.some((a) => a.id === abilityId)) setAbilityId('')
  }, [attacker, abilityId])

  const result = abilityDamage(baseDamage, defense)
  const { percentOfHealth, hitsToKill } = result
  const damage = result.actual
  const shownDamage = result.displayed
  const unmitigated = baseDamage
  const reducedBy = baseDamage > 0 ? (1 - damage / baseDamage) * 100 : 0
  const cooldown = actualCooldown(baseCooldown, utility)

  return (
    <div className="mt-4 space-y-8">
      <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h3 className="font-semibold">Damage</h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <SuitSelect label="Attacker" value={attackerId} onChange={setAttackerId} />
            <RaritySelect label="Attacker rarity" iv={attackerIv} onChange={setAttackerIv} />
            <Slider label="Attack" value={attack} onChange={setAttack} hint={attacker ? `${attacker.name}'s roll, adjustable` : undefined} />
          </div>
          <div className="space-y-3">
            <SuitSelect label="Defender" value={defenderId} onChange={setDefenderId} />
            <RaritySelect label="Defender rarity" iv={defenderIv} onChange={setDefenderIv} />
            <Slider label="Defense" value={defense} onChange={setDefense} hint={defender ? `${defender.name}'s roll, adjustable` : undefined} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AbilitySelect suit={attacker} value={abilityId} onChange={setAbilityId} />
          <Field label="Base damage">
            <input type="number" min={0} step="0.5" value={baseDamage} onChange={(e) => setBaseDamage(Math.max(0, Number(e.target.value)))} className={inputClass} />
            <button
              type="button"
              onClick={() => {
                setAbilityId('')
                setBaseDamage(FIST_BASE_DAMAGE)
              }}
              className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Use a bare fist ({FIST_BASE_DAMAGE})
            </button>
          </Field>
        </div>

        {abilityId && !abilityStats?.known && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">
            This ability has no damage value set, so it probably doesn't deal damage directly. Showing the mod's fallback of {DEFAULT_BASE_DAMAGE}.
          </p>
        )}

        <label className="mt-4 block">
          <span className="flex items-baseline justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Attacker's synergy bonus</span>
            <span className="font-medium tabular-nums">+{synergy}</span>
          </span>
          <input type="range" min={0} max={MAX_SYNERGY} step={2} value={synergy} onChange={(e) => setSynergy(Number(e.target.value))} className="mt-1 w-full accent-blue-600" />
          <span className="text-xs text-neutral-500">{synergy / 2} teammate(s) in the same collection within 64 blocks</span>
        </label>

        <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <div className="text-3xl font-bold tabular-nums">{shownDamage.toFixed(0)}</div>
              <div className="text-xs text-neutral-500">damage, as the health bar shows it</div>
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {percentOfHealth.toFixed(1)}% of a full bar · {Number.isFinite(hitsToKill) ? `${hitsToKill} hits to kill` : 'never kills'}
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            {damage.toFixed(3)} actual health ({unmitigated.toFixed(2)} before defense, reduced {reducedBy.toFixed(1)}%). A full bar reads{' '}
            {VANILLA_MAX_HEALTH * HEALTH_DISPLAY_SCALE} in game but is {VANILLA_MAX_HEALTH} actual health.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h3 className="font-semibold">Cooldown</h3>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">How long you actually wait between uses, after Utility.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SuitSelect label="Suit" value={cooldownSuitId} onChange={setCooldownSuitId} />
          <RaritySelect label="Rarity" iv={cooldownIv} onChange={setCooldownIv} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Slider label="Utility" value={utility} onChange={setUtility} hint={cooldownSuit ? `${cooldownSuit.name}'s roll, adjustable` : undefined} />
          <Field label="Base cooldown (seconds)">
            <input type="number" min={0} value={baseCooldown} onChange={(e) => setBaseCooldown(Math.max(0, Number(e.target.value)))} className={inputClass} />
          </Field>
        </div>

        <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="text-3xl font-bold tabular-nums">{cooldown.toFixed(2)}s</div>
          <div className="text-xs text-neutral-500">actual cooldown · {baseCooldown}s base</div>
        </div>
      </div>
    </div>
  )
}
