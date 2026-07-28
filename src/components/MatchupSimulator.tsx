import { useEffect, useMemo, useState } from 'react'

import { abilityBalances } from '../lib/abilityStats'
import { getSuit, releasedSuits } from '../lib/suits'
import { DEFAULT_CPS, HEALTH_DISPLAY_SCALE, formatDuration, simulateFight, statValue } from '../lib/combat'
import { clearPersistedState, usePersistentState } from '../lib/usePersistentState'
import { decodeMatchup, encodeMatchup } from '../lib/shareState'
import { BigStat, Range, RaritySelect, SuitSelect } from './controls'

export function MatchupSimulator() {
  const pickable = useMemo(() => releasedSuits((s) => s.stats.length > 0), [])

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

  // A shared link wins over whatever this device had stored, but only on first load —
  // after that the user's edits take over as normal.
  const [shareApplied, setShareApplied] = useState(false)
  useEffect(() => {
    if (shareApplied) return
    setShareApplied(true)
    const shared = decodeMatchup(window.location.search)
    if (Object.keys(shared).length === 0) return
    if (shared.atkSuit) setAttackerId(shared.atkSuit)
    if (shared.defSuit) setDefenderId(shared.defSuit)
    if (shared.atkIv !== undefined) setAttackerIv(shared.atkIv)
    if (shared.defIv !== undefined) setDefenderIv(shared.defIv)
    if (shared.cps !== undefined) setCps(shared.cps)
    if (shared.melee !== undefined) setIncludeMelee(shared.melee)
    if (shared.onType !== undefined) setOnFightingType(shared.onType)
    if (shared.inputDelay !== undefined) setInputDelay(shared.inputDelay)
    if (shared.abilityMiss !== undefined) setAbilityMissRate(shared.abilityMiss)
    if (shared.meleeMiss !== undefined) setMeleeMissRate(shared.meleeMiss)
    if (shared.ultLock !== undefined) setUltimateLockout(shared.ultLock)
    if (shared.meleeUptime !== undefined) setMeleeUptime(shared.meleeUptime)
  }, [shareApplied])

  const [copied, setCopied] = useState(false)
  const shareLink = () => {
    const qs = encodeMatchup({
      atkSuit: attackerId,
      defSuit: defenderId,
      atkIv: attackerIv,
      defIv: defenderIv,
      cps,
      melee: includeMelee,
      onType: onFightingType,
      inputDelay,
      abilityMiss: abilityMissRate,
      meleeMiss: meleeMissRate,
      ultLock: ultimateLockout,
      meleeUptime,
    })
    const url = `${window.location.origin}${window.location.pathname}?${qs}`
    window.history.replaceState(null, '', url)
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {},
    )
  }

  const attacker = getSuit(attackerId)
  const defender = getSuit(defenderId)

  const attack = statValue(attacker, 'attack', attackerIv) ?? 50
  const defense = statValue(defender, 'defense', defenderIv) ?? 50
  const utility = statValue(attacker, 'utility', attackerIv) ?? 50

  const result = useMemo(
    () =>
      simulateFight({
        abilities: (attacker?.abilities ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          slot: a.slot,
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
        <div className="flex items-center gap-3">
          <button type="button" onClick={shareLink} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
            {copied ? 'Link copied' : 'Share this matchup'}
          </button>
          <button
            type="button"
            onClick={() => {
              clearPersistedState()
              window.location.href = window.location.pathname
            }}
            className="text-xs text-neutral-500 hover:underline"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Everything one suit can throw at another, with the friction of an actual fight. Your settings are remembered on this device.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <SuitSelect label="Attacker" value={attackerId} options={pickable} onChange={setAttackerId} />
          <RaritySelect label="Attacker rarity" iv={attackerIv} onChange={setAttackerIv} />
        </div>
        <div className="space-y-2">
          <SuitSelect label="Defender" value={defenderId} options={pickable} onChange={setDefenderId} />
          <RaritySelect label="Defender rarity" iv={defenderIv} onChange={setDefenderIv} />
        </div>
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
            hint="They strafe and keep distance, so you can't always reach them"
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

        {result.events.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
              Fight log ({result.events.length} events{result.eventsTruncated ? ', truncated' : ''})
            </summary>
            <ol className="mt-3 max-h-80 overflow-y-auto rounded-md border border-neutral-200 text-sm dark:border-neutral-800">
              {result.events.map((e, i) => (
                <li
                  key={i}
                  className={
                    'flex items-baseline gap-3 border-b border-neutral-100 px-3 py-1.5 last:border-b-0 dark:border-neutral-900 ' +
                    (e.kind === 'kill' ? 'bg-green-50 font-medium dark:bg-green-950/30' : e.kind === 'idle' ? 'bg-amber-50 dark:bg-amber-950/20' : '')
                  }
                >
                  <span className="w-14 shrink-0 tabular-nums text-xs text-neutral-500">{formatDuration(e.t)}</span>
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  {e.damage > 0 && <span className="shrink-0 tabular-nums text-xs text-neutral-500">-{(e.damage * HEALTH_DISPLAY_SCALE).toFixed(0)}</span>}
                  <span className="w-16 shrink-0 text-right tabular-nums text-xs text-neutral-500">
                    {(e.hpAfter * HEALTH_DISPLAY_SCALE).toFixed(0)} hp
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-neutral-500">
              Melee is rolled up between ability presses rather than logged per swing. Health is shown the way the in-game bar shows it.
            </p>
          </details>
        )}
      </div>
    </div>
  )
}
