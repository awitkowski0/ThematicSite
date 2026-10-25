import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { abilityBalances } from '../lib/abilityStats'
import { AbilitySlot, getSuit, releasedSuits } from '../lib/suits'
import { getCategory } from '../lib/book'
import { RaritySelect, SuitSelect } from '../components/controls'
import { abilityDamage, actualCooldown, formatDuration, hitsPerUse, isDamagingAbility, statValue, timeToKill } from '../lib/combat'

export const Route = createFileRoute('/abilities')({
  head: () => ({
    meta: [
      { title: 'Abilities — Thematic' },
      { name: 'description', content: 'Every Thematic ability with its damage, cooldown, duration, and range, plus what it actually does to a real suit.' },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { q?: string } => (typeof search.q === 'string' && search.q ? { q: search.q } : {}),
  component: AbilitiesPage,
})

const bookAbilities = new Set(getCategory('ability')?.entries.map((e) => e.id) ?? [])

/** The slot filters, in the order a suit lists its moves. */
const SLOT_FILTERS: { label: string; slots?: AbilitySlot[] }[] = [
  { label: 'All' },
  { label: 'Moves', slots: ['active', 'equip', 'unknown'] },
  { label: 'Ultimates', slots: ['ultimate'] },
  { label: 'Passives', slots: ['passive'] },
  { label: 'Utility', slots: ['utility', 'cosmetic'] },
]

const plainName = (name: string) => name.replace(/^\[[A-Z]+\]\s*/, '')

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
        name: plainName(m.name),
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
  if (value === undefined) return <span className="text-neutral-600">—</span>
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

  const { q } = Route.useSearch()
  const [query, setQuery] = useState(q ?? '')
  const [slotFilter, setSlotFilter] = useState(0)
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
  const slots = SLOT_FILTERS[slotFilter].slots
  const filtered = rows.filter((r) => {
    if (slots && !slots.includes(r.slot)) return false
    if (damageOnly && !isDamagingAbility(r.slot, r.damage, r.name)) return false
    if (!normalized) return true
    const names = ignoreAlts ? r.characterNames : r.suitNames
    return r.name.toLowerCase().includes(normalized) || names.some((s) => s.toLowerCase().includes(normalized))
  })

  return (
    <div>
      <h1>Abilities</h1>
      <p className="text-neutral-400">
        What every ability does, and what it lands for against a real suit. For a whole fight, use the{' '}
        <Link to="/matchup" className="text-blue-400 hover:underline">
          matchup
        </Link>
        ; for one hit, the{' '}
        <Link to="/mechanics/stats" className="text-blue-400 hover:underline">
          damage calculator
        </Link>
        .
      </p>

      <div className="tb-raised mt-6 flex flex-wrap items-end gap-x-5 gap-y-3 rounded-md p-4">
        <label className="block">
          <span className="text-sm text-neutral-400">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ability or suit…"
            className="tb-inset mt-1 block w-56 rounded-md px-3 py-1.5 text-sm outline-none focus:!border-blue-400"
          />
        </label>
        <div className="w-48">
          <SuitSelect label="Damage against" value={defenderId} options={defenders} onChange={setDefenderId} />
        </div>
        <div className="w-36">
          <RaritySelect label="Their rarity" iv={defenderIv} onChange={setDefenderIv} />
        </div>
        <div className="flex flex-col gap-1 pb-1 text-sm text-neutral-400">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={damageOnly} onChange={(e) => setDamageOnly(e.target.checked)} className="h-4 w-4 accent-accent" />
            Only ones that deal damage
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ignoreAlts} onChange={(e) => setIgnoreAlts(e.target.checked)} className="h-4 w-4 accent-accent" />
            Count characters, not alts
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {SLOT_FILTERS.map((f, i) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={i === slotFilter}
            onClick={() => setSlotFilter(i)}
            className={`rounded-md px-2.5 py-1 ${i === slotFilter ? 'bg-pressed text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-neutral-500">
          {filtered.length} of {rows.length} · vs {defender?.name ?? 'suit'} at Defense {defense}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="tb-table">
          <thead>
            <tr>
              <th>Ability</th>
              <th>Base dmg</th>
              <th>Hit on {defender?.name ?? 'target'}</th>
              <th>Cooldown</th>
              <th>Time to kill</th>
              <th>Range</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const hits = hitsPerUse(row.id)
              const result = isDamagingAbility(row.slot, row.damage, row.name) ? abilityDamage(row.damage!, defense, hits) : undefined
              const cd = row.cooldown !== undefined ? actualCooldown(row.cooldown, assumedUtility, row.slot === 'ultimate') : undefined
              const ttk = result && cd !== undefined ? timeToKill(result.hitsToKill, cd) : undefined
              return (
                <tr key={row.id}>
                  <td className="py-3">
                    <div className="flex items-baseline gap-2">
                      {bookAbilities.has(row.id) ? (
                        <a href={`/wiki/ability/${row.id}`} className="font-semibold text-white hover:underline">
                          {row.name}
                        </a>
                      ) : (
                        <span className="font-semibold text-white">{row.name}</span>
                      )}
                      <span className="text-[11px] uppercase tracking-wider text-neutral-500">{row.slot}</span>
                    </div>
                    {row.description && <div className="mt-0.5 max-w-prose text-xs text-neutral-400">{row.description}</div>}
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
                  <td className="py-3">
                    <Num value={row.damage} />
                  </td>
                  <td className="py-3">
                    {result ? (
                      <>
                        <div className="font-semibold text-white">{result.displayed.toFixed(0)}</div>
                        <div className="text-xs text-neutral-500">{result.hitsToKill} uses{hits > 1 ? ` · ${hits} hits each` : ''}</div>
                      </>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-3">{cd !== undefined ? <span className="tabular-nums">{cd.toFixed(1)}s</span> : <Num />}</td>
                  <td className="py-3">{ttk !== undefined ? <span className="tabular-nums">{formatDuration(ttk)}</span> : <Num />}</td>
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
        <p>A dash means the value doesn't apply: a passive has no cooldown, and a buff deals no damage.</p>
        <p>
          "Hit on {defender?.name ?? 'target'}" uses the average Attack of the suits that carry each ability, on the same scale the in-game health bar shows
          (a full bar reads 1000).
        </p>
        <p>
          Time to kill assumes every hit lands and you re-use the ability the moment it's off cooldown, at a middling Utility roll. Treat it as a floor;
          real fights take longer.
        </p>
      </div>
    </div>
  )
}
