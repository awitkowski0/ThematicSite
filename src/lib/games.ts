import { useEffect, useState } from 'react'

// Types for the games API (Serv, /api/games/v1). The site proxies it at /api/games/v1.
export type GameMode = { id: string; name: string; team_size: number; players_needed: number; waiting: number; queueable: boolean }
export type LivePlayer = { uuid: string; name: string; team: number | null }
export type LiveMatch = {
  match_id: string
  mode: string
  mode_name: string
  phase: string
  started_at: string | null
  score_line: string | null
  players: LivePlayer[]
}
export type GamesStatus = { updated: string; online: number; games_server: 'up' | 'starting' | 'down'; modes: GameMode[]; live: LiveMatch[] }

export type Stat = {
  played: number
  wins: number
  losses: number
  draws: number
  kills: number
  deaths: number
  best_score: number | null
  best_place: number | null
  elo: number
  streak: number
  best_streak: number
  last_played: string | null
}
export type Recent = {
  match_id: string
  mode: string
  mode_name: string
  outcome: string
  place: number | null
  kills: number
  deaths: number
  score: number | null
  elo_delta: number | null
  points: number | null
  at: string
}
export type PlayerStats = { uuid: string; name: string; all: Stat; modes: Record<string, Stat>; recent: Recent[] }
export type TopEntry = { rank: number; uuid: string; name: string; value: number; played: number }

export const REFRESH_MS = 10_000
export const GAMES_API = '/api/games/v1'

export class GamesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
  }
}

export async function gamesFetch<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${GAMES_API}${path}`, { headers: { Accept: 'application/json' } })
  } catch {
    throw new GamesApiError('Games are not reachable right now.', 0, 'unavailable')
  }
  if (!res.ok) {
    let code = 'unavailable'
    let message = 'Games are not reachable right now.'
    try {
      const j = (await res.json()) as { error?: string; message?: string }
      if (j.error) code = j.error
      if (j.message) message = j.message
    } catch {
      // not JSON: keep the generic message
    }
    throw new GamesApiError(message, res.status, code)
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new GamesApiError('Games are not reachable right now.', res.status, 'unavailable')
  }
}

// Fetches `path` now and every REFRESH_MS. A failed refresh keeps the last good data and sets
// `error`, so a blip does not blank the page.
export function useGames<T>(path: string | null, refreshMs: number | null = REFRESH_MS) {
  const [state, setState] = useState<{ data: T | null; error: GamesApiError | null; loading: boolean }>({ data: null, error: null, loading: path !== null })

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    const load = () => {
      gamesFetch<T>(path)
        .then((data) => !cancelled && setState({ data, error: null, loading: false }))
        .catch((err: GamesApiError) => !cancelled && setState((s) => ({ ...s, error: err, loading: false })))
    }
    load()
    const interval = refreshMs ? setInterval(load, refreshMs) : undefined
    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [path, refreshMs])

  return state
}

export function timeSince(iso: string | null, now = Date.now()): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const s = Math.max(0, Math.floor((now - t) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  const h = Math.floor(s / 3600)
  return h < 24 ? `${h}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(h / 24)}d ago`
}

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return 'never'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'unknown'
  const s = Math.max(0, Math.floor((now - t) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
