import { useEffect, useState } from 'react'

const PREFIX = 'thematic.calc.'

/**
 * useState that survives a refresh (and coming back later) via localStorage.
 *
 * Reads lazily on first render rather than in an effect so the value is correct
 * immediately — but only on the client. During SSR there is no localStorage, so the
 * initial render uses `fallback`; the first client render then picks up the stored value.
 */
export function usePersistentState<T>(key: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.localStorage.getItem(PREFIX + key)
      return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback // corrupt or blocked storage shouldn't break the page
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Private browsing / quota exceeded — not worth surfacing, the tool still works.
    }
  }, [key, value])

  return [value, setValue]
}

/** Wipes every stored calculator setting. */
export function clearPersistedState(): void {
  try {
    const doomed: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k?.startsWith(PREFIX)) doomed.push(k)
    }
    doomed.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // ignore
  }
}
