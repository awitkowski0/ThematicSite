import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { abilityBalances } from '../lib/abilityStats'
import { AbilitySlot, getSuit, releasedSuits } from '../lib/suits'
import { RaritySelect, SuitSelect } from '../components/controls'
import { abilityDamage, actualCooldown, formatDuration, hitsPerUse, isDamagingAbility, statValue, timeToKill } from '../lib/combat'

export const Route = createFileRoute('/abilities')({
  head: () => ({
    meta: [
      { title: 'Abilities — Thematic' },
      { name: 'description', content: 'Every Thematic ability with its damage, cooldown, duration, and range, plus what it actually does to a real suit.' },
    ],
  }),
  component: AbilitiesPage,
})

interface Row {
  id: string
  name: string
  description?: string
  damage?: number
  cooldown?: number
  duration?: number
  range?: number
  slot: AbilitySlot
  /** Every released suit with this ability. */
  suitNames: string[]
  /** Just the base characters, ignoring alts — usually the more useful count. */
  characterNames: string[]
  /** Typical Attack of the suits that actually carry this ability. */
  typicalAttack?: number
}

function buildRows(): Row[] {
  // Ability display names/descriptions come from the guidebook (via suits), balance numbers
  // from the team's sheet — join them on the ability id.
  const meta = new Map<string, { name: string; slot: AbilitySlot; description?: string }>()
  const usedBy = new Map<string, string[]>()
  const usedByCharacter = new Map<string, string[]>()
  const attacks = new Map<string, number[]>()

  for (const suit of releasedSuits()) {
    const suitAttack = statValue(suit, 'attack', 0)
    for (const ability of suit.abilities) {
      if (!meta.has(ability.id)) meta.set(ability.id, { name: ability.name, slot: ability.slot, description: ability.description })
      const list = usedBy.get(ability.id) ?? []
      list.push(suit.name)
      usedBy.set(ability.id, list)
      if (!suit.parent) {
        const chars = usedByCharacter.get(ability.id) ?? []
        chars.push(suit.name)
        usedByCharacter.set(ability.id, chars)
      }
      if (suitAttack !== undefined) {
        const arr = attacks.get(ability.id) ?? []
        arr.push(suitAttack)
        attacks.set(ability.id, arr)
      }
    }
  }

  return [...meta.entries()]
    .map(([id, m]) => {
      const balance = abilityBalances[id]
      const atk = attacks.get(id)
      return {
        id,
        name: m.name,
        slot: m.slot,
        description: m.description,
        damage: balance?.damage,
        cooldown: balance?.cooldown,
        duration: balance?.duration,
        range: balance?.range,
        suitNames: usedBy.get(id) ?? [],
        characterNames: usedByCharacter.get(id) ?? [],
        typicalAttack: atk?.length ? Math.round(atk.reduce((a, b) => a + b, 0) / atk.length) : undefined,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function Num({ value, suffix }: { value?: number; suffix?: string }) {
  if (value === undefined) return <span className="text-neutral-400 dark:text-neutral-600">—</span>
  return (
    <span className="tabular-nums">
      {value}
      {suffix}
    </span>
  )
}

function AbilitiesPage() {
  const rows = useMemo(buildRows, [])
  const defenders = useMemo(() => releasedSuits((s) => statValue(s, 'defense', 0) !== undefined), [])

  const [query, setQuery] = useState('')
  const [damageOnly, setDamageOnly] = useState(false)
  const [ignoreAlts, setIgnoreAlts] = useState(true)
  const [defenderId, setDefenderId] = useState('batman')
  const [defenderIv, setDefenderIv] = useState(1)

  const defender = getSuit(defenderId)
  const defense = statValue(defender, 'defense', defenderIv) ?? 70
  // Utility only shifts cooldowns a little; use a mid roll so TTK is representative
  // rather than best- or worst-case.
  const assumedUtility = 50

  const normalized = query.trim().toLowerCase()
  const filtered = rows.filter((r) => {
    if (damageOnly && !isDamagingAbility(r.slot, r.damage, r.name)) return false
    if (!normalized) return true
    const names = ignoreAlts ? r.characterNames : r.suitNames
    return r.name.toLowerCase().includes(normalized) || names.some((s) => s.toLowerCase().includes(normalized))
  })

  return (
    <div>
      <h1 className="text-3xl font-bold">Abilities</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Every ability in Thematic, what it does, and what it actually lands for against a real suit. To pit two suits against each other, use the{' '}
        <Link to="/matchup" className="text-blue-600 hover:underline dark:text-blue-400">
          matchup simulator
        </Link>
        ; for a single hit, the{' '}
        <Link to="/mechanics/stats" className="text-blue-600 hover:underline dark:text-blue-400">
          damage calculator
        </Link>
        .
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ability or suit…"
            className="mt-1 block w-56 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
          />
        </label>
        <div className="w-48">
          <SuitSelect label="Damage against" value={defenderId} options={defenders} onChange={setDefenderId} />
        </div>
        <div className="w-36">
          <RaritySelect label="Their rarity" iv={defenderIv} onChange={setDefenderIv} />
        </div>
        <div className="flex flex-col gap-1 pb-1">
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <input type="checkbox" checked={damageOnly} onChange={(e) => setDamageOnly(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700" />
            Only ones that deal damage
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <input type="checkbox" checked={ignoreAlts} onChange={(e) => setIgnoreAlts(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700" />
            Count characters, not alts
          </label>
        </div>
      </div>

      <p className="mt-3 text-sm text-neutral-500">
        {filtered.length} of {rows.length} abilities · vs {defender?.name ?? 'suit'} at Defense {defense}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
              <th className="py-2 pr-4 font-medium">Ability</th>
              <th className="py-2 pr-4 font-medium">Base dmg</th>
              <th className="py-2 pr-4 font-medium">
                Hit on {defender?.name ?? 'target'}
              </th>
              <th className="py-2 pr-4 font-medium">Cooldown</th>
              <th className="py-2 pr-4 font-medium">Time to kill</th>
              <th className="py-2 font-medium">Range</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const hits = hitsPerUse(row.id)
              const result = isDamagingAbility(row.slot, row.damage, row.name) ? abilityDamage(row.damage!, defense, hits) : undefined
              const cd = row.cooldown !== undefined ? actualCooldown(row.cooldown, assumedUtility, row.slot === 'ultimate') : undefined
              const ttk = result && cd !== undefined ? timeToKill(result.hitsToKill, cd) : undefined
              return (
                <tr key={row.id} className="border-b border-neutral-100 align-top dark:border-neutral-900">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{row.name}</div>
                    {row.description && <div className="mt-0.5 max-w-prose text-xs text-neutral-600 dark:text-neutral-400">{row.description}</div>}
                    {(() => {
                      const names = ignoreAlts ? row.characterNames : row.suitNames
                      if (names.length === 0) return null
                      const noun = ignoreAlts ? 'character' : 'suit'
                      return (
                        <div className="mt-1 text-xs text-neutral-500" title={names.slice(0, 30).join(', ')}>
                          {names.length === 1 ? names[0] : `${names.length} ${noun}s`}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="py-3 pr-4">
                    <Num value={row.damage} />
                  </td>
                  <td className="py-3 pr-4">
                    {result ? (
                      <>
                        <div className="font-medium tabular-nums">{result.displayed.toFixed(0)}</div>
                        <div className="text-xs text-neutral-500">{result.hitsToKill} uses{hits > 1 ? ` · ${hits} hits each` : ''}</div>
                      </>
                    ) : (
                      <span className="text-neutral-400 dark:text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">{cd !== undefined ? <span className="tabular-nums">{cd.toFixed(1)}s</span> : <Num />}</td>
                  <td className="py-3 pr-4">{ttk !== undefined ? <span className="tabular-nums">{formatDuration(ttk)}</span> : <Num />}</td>
                  <td className="py-3">
                    <Num value={row.range} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-1 text-xs text-neutral-500">
        <p>A dash means the value doesn't apply — a passive has no cooldown, a buff deals no damage.</p>
        <p>
          "Hit on {defender?.name ?? 'target'}" uses the average Attack of the suits that carry each ability, on the same scale the in-game health bar shows
          (a full bar reads 1000).
        </p>
        <p>
          Time to kill assumes every hit lands and you re-use the ability the moment it's off cooldown, at a middling Utility roll — a floor, not what a real
          fight looks like.
        </p>
      </div>
    </div>
  )
}
