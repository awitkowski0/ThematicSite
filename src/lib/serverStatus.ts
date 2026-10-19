import { useEffect, useState } from 'react'

export type PingResult = {
  online: boolean
  players: number
  max: number
  motd: string
  version: string
  latencyMs: number | null
  sample: string[]
}
export type RealmStatus = PingResult & { id: string; label: string }
/** `server` is the public join address; `realms` is empty unless SERVER_STATUS_TARGETS is set. */
export type ServerStatus = { at: number; address: string; server: PingResult; total: number; realms: RealmStatus[] }

// The address players type into Minecraft.
export const SERVER_ADDRESS = 'thematic.bond'

const REFRESH_MS = 30_000

// Polls /api/server-status (see src/routes/api.server-status.ts), which pings the backends from
// the site's own server. Keeps the last good reading when a refresh fails.
export function useServerStatus() {
  const [state, setState] = useState<{ data: ServerStatus | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/server-status')
        .then((res) => (res.ok ? (res.json() as Promise<ServerStatus>) : Promise.reject(new Error(`request failed (${res.status})`))))
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
