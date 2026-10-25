import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { abilityBalances } from '../lib/abilityStats'
import { releasedSuits } from '../lib/suits'
import { SuitStill } from './SuitStill'

/** Suits drawn before the rest are listed by name. */
const DRAWN = 6
/** Names listed before the rest fold away. */
const NAMED = 10

/** An ability entry's numbers and the suits that carry it, under the book's own pages. */
export function AbilityFacts({ id, name, hasNumbers }: { id: string; name: string; hasNumbers: boolean }) {
  const balance = abilityBalances[id]
  const users = releasedSuits((s) => s.abilities.some((a) => a.id === id))
  // the characters most tied to the ability first: the ones whose own versions carry it most
  const family = (id: string) => users.filter((u) => u.id === id || u.parent === id).length
  const bases = users.filter((s) => !s.parent).sort((a, b) => family(b.id) - family(a.id) || a.name.localeCompare(b.name))
  const drawn = (bases.length ? bases : users).slice(0, DRAWN)
  const [allNames, setAllNames] = useState(false)
  const rest = users.filter((s) => !drawn.includes(s))
  const numbers = !hasNumbers && balance
    ? ([
        ['Damage', balance.damage],
        ['Cooldown', balance.cooldown !== undefined ? `${balance.cooldown}s` : undefined],
        ['Duration', balance.duration !== undefined ? `${balance.duration}s` : undefined],
        ['Range', balance.range],
      ].filter(([, v]) => v !== undefined) as [string, string | number][])
    : []
  if (users.length === 0 && numbers.length === 0) return null

  return (
    <div className="mt-8 space-y-6 border-t border-neutral-800 pt-6">
      {numbers.length > 0 && (
        <dl className="tb-inset flex flex-wrap gap-x-8 gap-y-2 rounded-md px-4 py-3 text-sm">
          {numbers.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-neutral-500">{label}</dt>
              <dd className="font-semibold tabular-nums text-white">{value}</dd>
            </div>
          ))}
          <div className="ml-auto self-center">
            <Link to="/abilities" search={{ q: name }} className="text-blue-400 hover:underline">
              Against a real suit →
            </Link>
          </div>
        </dl>
      )}
      {users.length > 0 && (
        <section>
          <h2>Used by</h2>
          <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-6">
            {drawn.map((s) => (
              <li key={s.id}>
                <Link to="/suits/$id" params={{ id: s.id }} className="group block">
                  {s.geoPath && s.texturePath ? (
                    <div className="tb-panel">
                      <SuitStill geoPath={s.geoPath} texturePath={s.texturePath} hiddenBones={s.hiddenBones} name={s.name} />
                    </div>
                  ) : (
                    <div className="tb-inset aspect-[3/4]" />
                  )}
                  <span className="mt-1.5 block text-sm leading-tight text-white group-hover:underline">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          {rest.length > 0 && (
            <p className="mt-3 text-sm text-neutral-400">
              Also:{' '}
              {(allNames ? rest : rest.slice(0, NAMED)).map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ', '}
                  <Link to="/suits/$id" params={{ id: s.id }} className="text-blue-400 hover:underline">
                    {s.name}
                  </Link>
                </span>
              ))}
              {rest.length > NAMED && (
                <button type="button" onClick={() => setAllNames((a) => !a)} className="ml-1 text-blue-400 hover:underline">
                  {allNames ? 'show fewer' : `and ${rest.length - NAMED} more`}
                </button>
              )}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
