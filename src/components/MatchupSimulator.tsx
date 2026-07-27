import { useMemo } from 'react'

import { abilityBalances } from '../lib/abilityStats'
import { suits } from '../lib/suits'
import { DEFAULT_CPS, HEALTH_DISPLAY_SCALE, RARITIES, formatDuration, simulateFight, statValue } from '../lib/combat'
import { clearPersistedState, usePersistentState } from '../lib/usePersistentState'

const selectClass =
  'mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950'

function Range({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-medium tabular-nums">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-blue-600" />
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  )
}

export function MatchupSimulator() {
  const pickable = useMemo(() => suits.filter((s) => !s.wip && s.stats.length > 0).sort((a, b) => a.name.localeCompare(b.name)), [])

  const [attackerId, setAttackerId] = usePersistentState('atkSuit', 'superman')
  const [defenderId, setDefenderId] = usePersistentState('defSuit', 'batman')
  const [attackerIv, setAttackerIv] = usePersistentState('atkIv', 5)
  const [defenderIv, setDefenderIv] = usePersistentState('defIv', 5)

  const [cps, setCps] = usePersistentState('cps', DEFAULT_CPS)
  const [includeMelee, setIncludeMelee] = usePersistentState('melee', true)
  const [onFightingType, setOnFightingType] = usePersistentState('onType', true)
  const [inputDelay, setInputDelay] = usePersistentState('inputDelay', 1.5)
  const [abilityMissRate, setAbilityMissRate] = usePersistentState('abilityMiss', 0.25)
  const [meleeMissRate, setMeleeMissRate] = usePersistentState('meleeMiss', 0.15)
  const [ultimateLockout, setUltimateLockout] = usePersistentState('ultLock', true)
  const [meleeUptime, setMeleeUptime] = usePersistentState('meleeUptime', 0.45)

  const attacker = suits.find((s) => s.id === attackerId)
  const defender = suits.find((s) => s.id === defenderId)

  const attack = statValue(attacker, 'Attack', attackerIv) ?? 50
  const defense = statValue(defender, 'Defense', defenderIv) ?? 50
  const utility = statValue(attacker, 'Utility', attackerIv) ?? 50

  const result = useMemo(
    () =>
      simulateFight({
        abilities: (attacker?.abilities ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          damage: abilityBalances[a.id]?.damage,
          cooldown: abilityBalances[a.id]?.cooldown,
          duration: abilityBalances[a.id]?.duration,
          range: abilityBalances[a.id]?.range,
        })),
        attack,
        defense,
        utility,
        cps,
        includeMelee,
        onFightingType,
        inputDelay,
        abilityMissRate,
        meleeMissRate,
        ultimateLockout,
        meleeUptime,
      }),
    [attacker, attack, defense, utility, cps, includeMelee, onFightingType, inputDelay, abilityMissRate, meleeMissRate, ultimateLockout, meleeUptime],
  )

  return (
    <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-semibold">Matchup</h3>
        <button
          type="button"
          onClick={() => {
            clearPersistedState()
            window.location.reload()
          }}
          className="text-xs text-neutral-500 hover:underline"
        >
          Reset
        </button>
      </div>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Everything one suit can throw at another, with the friction of an actual fight. Your settings are remembered on this device.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Attacker</span>
          <select value={attackerId} onChange={(e) => setAttackerId(e.target.value)} className={selectClass}>
            {pickable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={attackerIv} onChange={(e) => setAttackerIv(Number(e.target.value))} className={selectClass}>
            {RARITIES.map((r) => (
              <option key={r.name} value={r.iv}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Defender</span>
          <select value={defenderId} onChange={(e) => setDefenderId(e.target.value)} className={selectClass}>
            {pickable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={defenderIv} onChange={(e) => setDefenderIv(Number(e.target.value))} className={selectClass}>
            {RARITIES.map((r) => (
              <option key={r.name} value={r.iv}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-md bg-neutral-50 p-4 dark:bg-neutral-900/50">
        <div className="text-sm font-medium">Fight conditions</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Range label="Ability miss rate" value={abilityMissRate} onChange={setAbilityMissRate} min={0} max={0.9} step={0.05} format={(v) => `${Math.round(v * 100)}%`} hint="A miss still burns the cooldown" />
          <Range label="Melee miss rate" value={meleeMissRate} onChange={setMeleeMissRate} min={0} max={0.9} step={0.05} format={(v) => `${Math.round(v * 100)}%`} hint="Usually easier to land than abilities" />
          <Range label="Time between ability presses" value={inputDelay} onChange={setInputDelay} min={0} max={8} step={0.1} format={(v) => `${v.toFixed(1)}s`} hint="You can only drive one ability at a time" />
          <Range label="Clicks per second" value={cps} onChange={setCps} min={0} max={20} hint="Melee swing rate" />
          <Range
            label="Time in melee range"
            value={meleeUptime}
            onChange={setMeleeUptime}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            hint="They strafe and keep distance — also gates abilities under 5 blocks"
          />
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <input type="checkbox" checked={includeMelee} onChange={(e) => setIncludeMelee(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700" />
              Include melee
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <input type="checkbox" checked={onFightingType} onChange={(e) => setOnFightingType(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700" />
              Matching fighting type
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <input type="checkbox" checked={ultimateLockout} onChange={(e) => setUltimateLockout(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700" />
              Ultimates lock out other abilities
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <div className="text-3xl font-bold tabular-nums">{result.ttk !== undefined ? formatDuration(result.ttk) : '—'}</div>
            <div className="text-xs text-neutral-500">to drop {defender?.name ?? 'them'} from full health</div>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {(result.totalDps * HEALTH_DISPLAY_SCALE).toFixed(0)} damage per second · Attack {attack} vs Defense {defense}
          </div>
        </div>

        {result.sources.length > 0 ? (
          <ul className="mt-4 space-y-1.5">
            {result.sources.map((s) => {
              const share = result.totalDps > 0 ? (s.dps / result.totalDps) * 100 : 0
              return (
                <li key={s.label} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 truncate">{s.label}</span>
                  <span className="h-1.5 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-900">
                    <span className="block h-1.5 rounded-full bg-blue-500" style={{ width: `${share}%` }} />
                  </span>
                  <span className="w-52 shrink-0 text-right text-xs text-neutral-500">{s.detail}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">{attacker?.name ?? 'This suit'} has no cooldown-gated damaging abilities. Turn on melee to see what fists alone do.</p>
        )}
      </div>
    </div>
  )
}
