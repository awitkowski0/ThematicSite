import { useEffect, useState } from 'react'

// The territory event, from Serv's /api/events/v1/territory (proxied at the same path, see
// src/routes/api.events.v1.territory.ts). Guild colours come from the API so the SVG, the BlueMap
// and anything else agree on them.
export type ZoneState = 'neutral' | 'held' | 'capturing' | 'contested'
export type TerritoryZone = {
  id: string
  name: string
  polygon: [number, number][]
  centre: [number, number]
  min_y: number | null
  max_y: number | null
  state: ZoneState
  holder: string | null
  held_since: string | null
  capturing: string | null
  capturing_color: string | null
  progress: number
  color: string
}
export type TerritoryStanding = { place: number; guild: string; score: number; color: string; zones: number }
export type TerritoryPrize = { place: number; guild_points: number; guild_xp: number }
export type Territory = {
  event: 'territory'
  week: number
  /** 'running' | 'ended' | 'none' | 'offline' */
  status: string
  dimension: string
  starts_at: string
  ends_at: string
  updated_at: string | null
  server_time: string
  zones: TerritoryZone[]
  standings: TerritoryStanding[]
  prizes: TerritoryPrize[]
}

export const TERRITORY_API = '/api/events/v1/territory'
export const REFRESH_MS = 15_000
/** The BlueMap web app, proxied by src/routes/livemap.$.ts. */
export const LIVE_MAP_PATH = '/livemap/'
export const NEUTRAL = '#8a8f98'
export const CONTESTED = '#ff3b30'

export function useTerritory() {
  const [state, setState] = useState<{ data: Territory | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true })
  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch(TERRITORY_API)
        .then((res) => (res.ok ? (res.json() as Promise<Territory>) : Promise.reject(new Error(`request failed (${res.status})`))))
        .then((data) => {
          if (!cancelled) setState({ data, error: null, loading: false })
        })
        .catch((err: Error) => {
          if (!cancelled) setState((s) => ({ ...s, error: err.message, loading: false }))
        })
    }
    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])
  return state
}

export type Bounds = { minX: number; minZ: number; width: number; height: number }

/** The box around every zone, with a margin. Minecraft's +z is south, which is "down" on the map, so z is y as it is. */
export function boundsOf(zones: Pick<TerritoryZone, 'polygon'>[], margin = 110): Bounds {
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const z of zones) {
    for (const [x, zz] of z.polygon) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minZ = Math.min(minZ, zz)
      maxZ = Math.max(maxZ, zz)
    }
  }
  if (!Number.isFinite(minX)) return { minX: -100, minZ: -100, width: 200, height: 200 }
  return { minX: minX - margin, minZ: minZ - margin, width: maxX - minX + 2 * margin, height: maxZ - minZ + 2 * margin }
}

export const pointsAttr = (polygon: [number, number][]) => polygon.map(([x, z]) => `${x},${z}`).join(' ')

export function fillOpacity(state: ZoneState): number {
  return state === 'neutral' ? 0.25 : state === 'held' ? 0.55 : state === 'capturing' ? 0.45 : 0.6
}

/** "3d 4h", "2h 15m", "40s"; the same shape the in-game popups use. */
export function duration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

export const ordinal = (n: number) => {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]}`
}

/** What the clock reads on the game server, from a snapshot taken `fetchedAt` (our clock) ago. */
export function serverNow(data: Pick<Territory, 'server_time'>, fetchedAt: number, now: number): number {
  return Date.parse(data.server_time) + (now - fetchedAt)
}
