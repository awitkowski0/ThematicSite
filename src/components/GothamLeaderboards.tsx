import { useEffect, useState, type ReactNode } from 'react'

import {
  DIVISION_COLORS,
  MINECRAFT_COLORS,
  useLeaderboard,
  type ContributionEntry,
  type CraftingGuildEntry,
  type CraftingPlayerEntry,
  type EconomyEntry,
  type GuildEntry,
  type RaidsEntry,
} from '../lib/gotham'

function GuildTag({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: MINECRAFT_COLORS[color] ?? '#AAAAAA' }} />
      {name}
    </span>
  )
}

type Column<T> = { header: string; align?: 'right'; cell: (row: T) => ReactNode }

function LeaderboardTable<T>({
  data,
  error,
  loading,
  columns,
  rowKey,
}: {
  data: { entries: T[] } | null
  error: string | null
  loading: boolean
  columns: Column<T>[]
  rowKey: (row: T) => string
}) {
  if (loading && !data) return <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">Couldn't load this leaderboard ({error}).</p>
  if (!data || data.entries.length === 0) return <p className="text-sm text-neutral-500 dark:text-neutral-400">No data yet.</p>

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase text-neutral-500 dark:text-neutral-400">
          {columns.map((c) => (
            <th key={c.header} className={`py-1 pr-4 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.entries.map((row) => (
          <tr key={rowKey(row)} className="border-t border-neutral-100 dark:border-neutral-900">
            {columns.map((c) => (
              <td key={c.header} className={`py-1.5 pr-4 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                {c.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LeaderboardCard<T>({
  title,
  description,
  board,
  params,
  columns,
  rowKey,
  extra,
}: {
  title: string
  description?: string
  board: string
  params?: Record<string, string>
  columns: Column<T>[]
  rowKey: (row: T) => string
  extra?: ReactNode
}) {
  const { data, error, loading } = useLeaderboard<{ entries: T[] }>(board, params)

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {extra}
      </div>
      {description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
      <div className="mt-3 overflow-x-auto">
        <LeaderboardTable data={data} error={error} loading={loading} columns={columns} rowKey={rowKey} />
      </div>
    </div>
  )
}

const selectClass = 'rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900'

function GuildContributionsSection() {
  const { data: guildsData } = useLeaderboard<{ entries: GuildEntry[] }>('guilds', { limit: '50' })
  const [guild, setGuild] = useState('')

  useEffect(() => {
    if (!guild && guildsData?.entries.length) setGuild(guildsData.entries[0].name)
  }, [guildsData, guild])

  if (!guildsData?.entries.length || !guild) return null

  return (
    <LeaderboardCard<ContributionEntry>
      title="Top Guild Contributors"
      description="Lifetime points a member has brought into their guild's bank."
      board="guild-contributions"
      params={{ guild, limit: '10' }}
      rowKey={(r) => r.uuid}
      extra={
        <select value={guild} onChange={(e) => setGuild(e.target.value)} className={selectClass}>
          {guildsData.entries.map((g) => (
            <option key={g.name} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
      }
      columns={[
        { header: '#', cell: (r) => r.rank },
        { header: 'Player', cell: (r) => r.username },
        { header: 'Gained', align: 'right', cell: (r) => r.gained.toLocaleString() },
        { header: 'Net', align: 'right', cell: (r) => r.net.toLocaleString() },
      ]}
    />
  )
}

export function GothamLeaderboards() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <LeaderboardCard<RaidsEntry>
        title="Raids"
        description="Top-rated raiders this cycle."
        board="raids"
        params={{ limit: '10' }}
        rowKey={(r) => r.uuid}
        columns={[
          { header: '#', cell: (r) => r.rank },
          { header: 'Player', cell: (r) => r.username },
          { header: 'Division', cell: (r) => <span className={DIVISION_COLORS[r.division] ?? ''}>{r.division}</span> },
          { header: 'Rating', align: 'right', cell: (r) => r.rating.toLocaleString() },
        ]}
      />

      <LeaderboardCard<GuildEntry>
        title="Guilds"
        description="Ranked by guild point balance."
        board="guilds"
        params={{ limit: '10' }}
        rowKey={(g) => g.name}
        columns={[
          { header: '#', cell: (g) => g.rank },
          { header: 'Guild', cell: (g) => <GuildTag name={g.name} color={g.color} /> },
          { header: 'Members', align: 'right', cell: (g) => g.memberCount },
          { header: 'Points', align: 'right', cell: (g) => g.pointsBalance.toLocaleString() },
        ]}
      />

      <LeaderboardCard<EconomyEntry>
        title="Wealthiest Players"
        description="Highest player bank balances."
        board="economy"
        params={{ limit: '10' }}
        rowKey={(e) => e.uuid}
        columns={[
          { header: '#', cell: (e) => e.rank },
          { header: 'Player', cell: (e) => e.username },
          { header: 'Balance', align: 'right', cell: (e) => e.balance.toLocaleString() },
        ]}
      />

      <GuildContributionsSection />

      <LeaderboardCard<CraftingPlayerEntry>
        title="Crafting Event — Players"
        description="Top point-earners this week."
        board="crafting-event"
        params={{ scope: 'players', limit: '10' }}
        rowKey={(p) => p.uuid}
        columns={[
          { header: '#', cell: (p) => p.rank },
          { header: 'Player', cell: (p) => p.username },
          { header: 'Guild', cell: (p) => p.guild ?? '—' },
          { header: 'Points', align: 'right', cell: (p) => p.points.toLocaleString() },
        ]}
      />

      <LeaderboardCard<CraftingGuildEntry>
        title="Crafting Event — Guilds"
        description="Top guilds by combined points this week."
        board="crafting-event"
        params={{ scope: 'guilds', limit: '10' }}
        rowKey={(g) => g.guild}
        columns={[
          { header: '#', cell: (g) => g.rank },
          { header: 'Guild', cell: (g) => <GuildTag name={g.guild} color={g.color} /> },
          { header: 'Points', align: 'right', cell: (g) => g.points.toLocaleString() },
        ]}
      />
    </div>
  )
}
