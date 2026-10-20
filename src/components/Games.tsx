import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'

import { ago, timeSince, useGames, type GamesStatus, type PlayerStats, type Stat, type TopEntry } from '../lib/games'

const muted = 'text-sm text-neutral-500 dark:text-neutral-400'
const box = 'rounded-lg border border-neutral-200 p-4 dark:border-neutral-800'

export function ApiDown({ what }: { what: string }) {
  return <p className={`${box} ${muted}`}>{what} are not reachable right now. This page retries every few seconds.</p>
}

// A clock that ticks once a second, for "time since started".
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  return now
}

export function PlayerSearch() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (n) navigate({ to: '/games/player/$name', params: { name: n } })
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Player name"
        aria-label="Player name"
        maxLength={36}
        className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
      />
      <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
        Look up
      </button>
    </form>
  )
}

export function PlayerLink({ name }: { name: string }) {
  return (
    <Link to="/games/player/$name" params={{ name }} className="text-blue-600 hover:underline dark:text-blue-400">
      {name}
    </Link>
  )
}

const SERVER_TEXT = { up: 'Games server is up.', starting: 'Games server is starting.', down: 'Games server is down. Queues open when it is back.' }

export function QueuesAndMatches() {
  const { data, error, loading } = useGames<GamesStatus>('/status')
  const now = useNow()

  if (!data) {
    if (loading) return <p className={muted}>Loading…</p>
    return <ApiDown what="Queues and matches" />
  }

  return (
    <div className="space-y-8">
      {error && <p className={muted}>Could not refresh just now. Showing the last update.</p>}
      <section>
        <h2 className="text-xl font-semibold">Queues</h2>
        <p className={`mt-1 ${muted}`}>
          {SERVER_TEXT[data.games_server] ?? ''} {data.online} online.
        </p>
        {data.modes.length === 0 ? (
          <p className={`mt-3 ${muted}`}>No game modes are open yet. Each mode will show here with how many players are waiting.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.modes.map((m) => (
              <li key={m.id} className={box}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{m.name}</h3>
                  {!m.queueable && <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">Closed</span>}
                </div>
                <p className="mt-1 text-sm tabular-nums">
                  {m.waiting} / {m.players_needed} waiting
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900" aria-hidden>
                  <div className="h-full bg-blue-600 dark:bg-blue-400" style={{ width: `${Math.min(100, (m.waiting / Math.max(1, m.players_needed)) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Live matches</h2>
        {data.live.length === 0 ? (
          <p className={`mt-3 ${muted}`}>No matches right now. A running match will show here with its players, phase and score.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.live.map((m) => (
              <li key={m.match_id} className={box}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{m.mode_name}</h3>
                  <span className="text-xs capitalize text-neutral-500 dark:text-neutral-400">{m.phase}</span>
                </div>
                <p className="mt-1 text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                  {m.started_at ? `Started ${timeSince(m.started_at, now)} ago` : 'Not started'}
                  {m.score_line ? ` · ${m.score_line}` : ''}
                </p>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {m.players.map((p) => (
                    <PlayerLink key={p.uuid} name={p.name} />
                  ))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

const SORTS = [
  { id: 'wins', label: 'Wins' },
  { id: 'elo', label: 'ELO' },
  { id: 'kills', label: 'Kills' },
] as const

export function GameLeaderboards() {
  const status = useGames<GamesStatus>('/status')
  const [mode, setMode] = useState('all')
  const [by, setBy] = useState<(typeof SORTS)[number]['id']>('wins')
  const { data, error, loading } = useGames<TopEntry[]>(`/top/${encodeURIComponent(mode)}?by=${by}&limit=10`)
  const modes = status.data?.modes ?? []

  const tab = (active: boolean) =>
    `rounded-md px-3 py-1 text-sm ${active ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'}`

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Mode">
          {[{ id: 'all', name: 'All' }, ...modes].map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} className={tab(mode === m.id)} onClick={() => setMode(m.id)}>
              {m.name}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          Sort by
          <select
            value={by}
            onChange={(e) => setBy(e.target.value as typeof by)}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 overflow-x-auto">
        {!data ? (
          loading ? (
            <p className={muted}>Loading…</p>
          ) : (
            <ApiDown what="Leaderboards" />
          )
        ) : data.length === 0 ? (
          <p className={muted}>No finished matches in this mode yet. Ranked players will show here once matches are played.</p>
        ) : (
          <>
            {error && <p className={`mb-2 ${muted}`}>Could not refresh just now. Showing the last update.</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-500 dark:text-neutral-400">
                  <th className="py-1 pr-4 font-medium">#</th>
                  <th className="py-1 pr-4 font-medium">Player</th>
                  <th className="py-1 pr-4 text-right font-medium">Played</th>
                  <th className="py-1 text-right font-medium">{SORTS.find((s) => s.id === by)?.label}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.uuid} className="border-t border-neutral-100 dark:border-neutral-900">
                    <td className="py-1.5 pr-4">{r.rank}</td>
                    <td className="py-1.5 pr-4">
                      <PlayerLink name={r.name} />
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{r.played.toLocaleString()}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}

function StatGrid({ s }: { s: Stat }) {
  const items: [string, string | number][] = [
    ['Played', s.played],
    ['Wins', s.wins],
    ['Losses', s.losses],
    ['Draws', s.draws],
    ['Kills', s.kills],
    ['Deaths', s.deaths],
    ['ELO', s.elo],
    ['Streak', `${s.streak} (best ${s.best_streak})`],
    ['Last played', ago(s.last_played)],
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs uppercase text-neutral-500 dark:text-neutral-400">{k}</dt>
          <dd className="tabular-nums">{typeof v === 'number' ? v.toLocaleString() : v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PlayerStatsView({ name }: { name: string }) {
  const { data, error, loading } = useGames<PlayerStats>(`/stats/${encodeURIComponent(name)}`)

  if (!data) {
    if (loading) return <p className={muted}>Loading…</p>
    if (error?.status === 404) return <p className={`${box} ${muted}`}>No games recorded for "{name}". Check the spelling, or play a match and come back.</p>
    return <ApiDown what="Player stats" />
  }

  const modes = Object.entries(data.modes)
  return (
    <div className="space-y-8">
      <section className={box}>
        <h2 className="text-lg font-semibold">Overall</h2>
        <div className="mt-3">
          <StatGrid s={data.all} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">By mode</h2>
        {modes.length === 0 ? (
          <p className={`mt-2 ${muted}`}>Stats for each mode will show here after this player's first match.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {modes.map(([id, s]) => (
              <div key={id} className={box}>
                <h3 className="mb-2 font-semibold">{data.recent.find((r) => r.mode === id)?.mode_name ?? id}</h3>
                <StatGrid s={s} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Last 10 matches</h2>
        {data.recent.length === 0 ? (
          <p className={`mt-2 ${muted}`}>Recent matches will show here with the mode, result and ELO change.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-500 dark:text-neutral-400">
                  <th className="py-1 pr-4 font-medium">Mode</th>
                  <th className="py-1 pr-4 font-medium">Result</th>
                  <th className="py-1 pr-4 text-right font-medium">K/D</th>
                  <th className="py-1 pr-4 text-right font-medium">ELO</th>
                  <th className="py-1 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.match_id} className="border-t border-neutral-100 dark:border-neutral-900">
                    <td className="py-1.5 pr-4">{r.mode_name}</td>
                    <td className="py-1.5 pr-4 capitalize">
                      {r.outcome}
                      {r.place ? ` (#${r.place})` : ''}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {r.kills}/{r.deaths}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{r.elo_delta == null ? '—' : r.elo_delta > 0 ? `+${r.elo_delta}` : r.elo_delta}</td>
                    <td className="py-1.5 text-right text-neutral-500 dark:text-neutral-400">{ago(r.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
