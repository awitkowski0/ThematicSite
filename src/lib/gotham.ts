import { useEffect, useState } from 'react'

// The live map (BlueMap or similar) served directly by the game host. Note this is plain HTTP —
// if thematic.bond is ever not HTTPS this is fine, but under HTTPS most browsers block it as
// mixed active content, so the /gotham page also renders a plain link as a fallback.
export const GOTHAM_MAP_URL = 'http://208.92.233.96:25578/'

export type RaidsEntry = { rank: number; uuid: string; username: string; rating: number; division: string; killsThisCycle: number }
export type GuildEntry = { rank: number; name: string; prefix: string; color: string; ownerUsername: string; pointsBalance: number; memberCount: number }
export type ContributionEntry = { rank: number; uuid: string; username: string; gained: number; used: number; lost: number; net: number }
export type EconomyEntry = { rank: number; uuid: string; username: string; balance: number }
export type CraftingPlayerEntry = { rank: number; uuid: string; username: string; guild: string | null; points: number }
export type CraftingGuildEntry = { rank: number; guild: string; prefix: string; color: string; points: number }

// Minecraft "Formatting" color names (as used by Guild.getColor()) mapped to a display hex.
export const MINECRAFT_COLORS: Record<string, string> = {
  BLACK: '#000000',
  DARK_BLUE: '#0000AA',
  DARK_GREEN: '#00AA00',
  DARK_AQUA: '#00AAAA',
  DARK_RED: '#AA0000',
  DARK_PURPLE: '#AA00AA',
  GOLD: '#FFAA00',
  GRAY: '#AAAAAA',
  DARK_GRAY: '#555555',
  BLUE: '#5555FF',
  GREEN: '#55FF55',
  AQUA: '#55FFFF',
  RED: '#FF5555',
  LIGHT_PURPLE: '#FF55FF',
  YELLOW: '#FFFF55',
  WHITE: '#FFFFFF',
}

export const DIVISION_COLORS: Record<string, string> = {
  UNRANKED: 'text-neutral-500 dark:text-neutral-400',
  BRONZE: 'text-amber-700 dark:text-amber-500',
  SILVER: 'text-slate-500 dark:text-slate-300',
  GOLD: 'text-yellow-600 dark:text-yellow-400',
  PLATINUM: 'text-cyan-600 dark:text-cyan-300',
  DIAMOND: 'text-sky-500 dark:text-sky-300',
  CROWN: 'text-fuchsia-600 dark:text-fuchsia-400',
}

// Proxied through the site's own server (see src/routes/api.gotham-leaderboards.$board.ts) so the
// browser only ever talks to thematic.bond over HTTPS - the mod's HTTP API is only ever called
// server-side, which sidesteps the mixed-content restriction entirely.
async function fetchLeaderboard<T>(board: string, params?: Record<string, string>): Promise<T> {
  const search = params ? `?${new URLSearchParams(params).toString()}` : ''
  const res = await fetch(`/api/gotham-leaderboards/${board}${search}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(body.error ?? `request failed (${res.status})`)
  }
  return res.json()
}

const REFRESH_MS = 30_000

export function useLeaderboard<T>(board: string, params?: Record<string, string>) {
  const paramsKey = params ? JSON.stringify(params) : ''
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))

    const load = () => {
      fetchLeaderboard<T>(board, params)
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
    // paramsKey is the stable dependency; params itself is a fresh object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, paramsKey])

  return state
}
