// Small shared formatters. These were each written two or three times across routes.

/** "March 14, 2026" — the one date format the site uses. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

/** Drops the "thematic:"/"minecraft:" prefix off an id. */
export function stripNamespace(id: string): string {
  const idx = id.indexOf(':')
  return idx === -1 ? id : id.slice(idx + 1)
}

export function isVanilla(id: string): boolean {
  return id.startsWith('minecraft:')
}
