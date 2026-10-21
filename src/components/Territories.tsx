import { useEffect, useRef, useState } from 'react'

import {
  CONTESTED,
  LIVE_MAP_PATH,
  NEUTRAL,
  boundsOf,
  duration,
  fillOpacity,
  ordinal,
  pointsAttr,
  serverNow,
  useTerritory,
  type Territory,
  type TerritoryZone,
} from '../lib/territory'

const muted = 'text-sm text-neutral-500 dark:text-neutral-400'
const box = 'rounded-lg border border-neutral-200 p-4 dark:border-neutral-800'

function useTick() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  return now
}

const stateText = (z: TerritoryZone, now: number) => {
  switch (z.state) {
    case 'neutral':
      return 'Unclaimed'
    case 'contested':
      return 'Contested'
    case 'capturing':
      return `${z.holder ? `Held by ${z.holder}` : 'Unclaimed'}, being captured by ${z.capturing} (${Math.round(z.progress * 100)}%)`
    default:
      return `Held by ${z.holder}${z.held_since ? ` for ${duration(now - Date.parse(z.held_since))}` : ''}`
  }
}

export function ZoneMap({ zones, hover, onHover }: { zones: TerritoryZone[]; hover: string | null; onHover: (id: string | null) => void }) {
  const b = boundsOf(zones)
  const font = Math.max(b.width, b.height) / 70
  return (
    <svg
      viewBox={`${b.minX} ${b.minZ} ${b.width} ${b.height}`}
      className="w-full rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
      role="img"
      aria-label="Map of the territory zones, coloured by the guild that holds each"
    >
      <defs>
        <pattern id="contested" width={font * 0.5} height={font * 0.5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={font * 0.25} height={font * 0.5} fill={CONTESTED} />
        </pattern>
      </defs>
      {zones.map((z) => {
        const stroke = z.state === 'capturing' && z.capturing_color ? z.capturing_color : z.state === 'contested' ? CONTESTED : z.color
        const active = hover === z.id
        return (
          <g key={z.id} onMouseEnter={() => onHover(z.id)} onMouseLeave={() => onHover(null)}>
            <polygon
              points={pointsAttr(z.polygon)}
              fill={z.state === 'neutral' ? NEUTRAL : z.color}
              fillOpacity={fillOpacity(z.state)}
              stroke={stroke}
              strokeWidth={(z.state === 'capturing' || z.state === 'contested' ? 2.2 : 1.2) * (active ? 1.6 : 1) * (font / 8)}
              strokeDasharray={z.state === 'capturing' ? `${font / 2} ${font / 3}` : undefined}
              strokeLinejoin="round"
            />
            {z.state === 'contested' && <polygon points={pointsAttr(z.polygon)} fill="url(#contested)" fillOpacity={0.5} pointerEvents="none" />}
            <text
              x={z.centre[0]}
              y={z.centre[1]}
              textAnchor="middle"
              fontSize={font}
              fontWeight={600}
              className="pointer-events-none fill-neutral-900 dark:fill-neutral-100"
              style={{ paintOrder: 'stroke', stroke: 'rgba(128,128,128,0.35)', strokeWidth: font / 6 }}
            >
              {z.name}
            </text>
            <text x={z.centre[0]} y={z.centre[1] + font * 1.15} textAnchor="middle" fontSize={font * 0.8} className="pointer-events-none fill-neutral-700 dark:fill-neutral-300">
              {z.state === 'contested' ? 'contested' : (z.holder ?? '')}
            </text>
            <title>{`${z.name}: ${z.holder ?? 'unclaimed'}`}</title>
          </g>
        )
      })}
    </svg>
  )
}

function Header({ data, now }: { data: Territory; now: number }) {
  const left = Date.parse(data.ends_at) - now
  if (data.status === 'running') {
    return (
      <p className={muted}>
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />
        Live. {left > 0 ? `Ends in ${duration(left)}.` : 'Ending now.'} The ranking when it ends pays out. Updates every 15 seconds.
      </p>
    )
  }
  if (data.status === 'ended') return <p className={muted}>This week's event has ended. Final standings below; the next one starts on Sunday.</p>
  const start = Date.parse(data.starts_at)
  if (data.status === 'offline') return <p className={muted}>The event server is not reporting right now. This page retries every few seconds.</p>
  return <p className={muted}>{start > now ? `The next event starts in ${duration(start - now)}.` : 'No event is running right now.'}</p>
}

export function Territories() {
  const { data, error, loading } = useTerritory()
  const fetchedAt = useRef(Date.now())
  const now = useTick()
  const [hover, setHover] = useState<string | null>(null)
  const [embed, setEmbed] = useState(false)
  useEffect(() => {
    if (data) fetchedAt.current = Date.now()
  }, [data])

  if (!data) {
    if (loading) return <p className={muted}>Loading…</p>
    return <p className={`${box} ${muted}`}>The territory event is not reachable right now. This page retries every few seconds.</p>
  }
  const clock = serverNow(data, fetchedAt.current, now)

  return (
    <div className="space-y-8">
      {error && <p className={muted}>Could not refresh just now. Showing the last update.</p>}
      <Header data={data} now={clock} />

      <section>
        <ZoneMap zones={data.zones} hover={hover} onHover={setHover} />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href={LIVE_MAP_PATH} target="_blank" rel="noreferrer" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
            Open the live 3D map
          </a>
          <button type="button" onClick={() => setEmbed((e) => !e)} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            {embed ? 'Hide the 3D map' : 'Show the 3D map here'}
          </button>
          <span className={muted}>Turn on "Territories" in the map's marker list.</span>
        </div>
        {embed && <iframe title="Live 3D map of Gotham" src={LIVE_MAP_PATH} className="mt-3 h-[34rem] w-full rounded-lg border border-neutral-200 dark:border-neutral-800" loading="lazy" />}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">Standings</h2>
          {data.standings.length === 0 ? (
            <p className={`mt-2 ${muted}`}>No guild has scored yet. Hold a zone at the top of the hour to score.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {data.standings.map((s) => (
                <li key={s.guild} className={`${box} flex items-center justify-between gap-3 py-2`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-6 text-right text-neutral-500">{s.place}</span>
                    <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="truncate font-medium">{s.guild}</span>
                  </span>
                  <span className="shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
                    {s.zones} {s.zones === 1 ? 'zone' : 'zones'} · <b className="text-neutral-900 dark:text-neutral-100">{s.score}</b> pts
                  </span>
                </li>
              ))}
            </ol>
          )}

          <h2 className="mt-8 text-xl font-semibold">Prizes</h2>
          {data.prizes.length === 0 ? (
            <p className={`mt-2 ${muted}`}>No prizes are set.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {data.prizes.map((p) => (
                <li key={p.place}>
                  <b>{ordinal(p.place)}</b>: {p.guild_points.toLocaleString('en-US')} guild points and {p.guild_xp.toLocaleString('en-US')} XP
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold">Zones</h2>
          <ul className="mt-3 space-y-2">
            {data.zones.map((z) => (
              <li
                key={z.id}
                className={`${box} py-2 ${hover === z.id ? 'ring-2 ring-neutral-400 dark:ring-neutral-600' : ''}`}
                onMouseEnter={() => setHover(z.id)}
                onMouseLeave={() => setHover(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: z.state === 'neutral' ? NEUTRAL : z.color }} />
                  <span className="font-medium">{z.name}</span>
                </div>
                <p className={`ml-5 ${muted}`}>{stateText(z, clock)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
