// Pulls per-ability balance numbers (damage, cooldown, duration, range) from the team's
// Google Sheet. These deliberately do NOT live in the mod repo — ThematicAbility.damage()
// reads them from server-side options at runtime, so the sheet is the only source of truth.
//
// The sheet is published for anonymous CSV export, so no credentials are needed (and none
// are used — nothing here reads run/thematic-config).
//
// Network failures are non-fatal: the site falls back to showing abilities without numbers
// rather than failing a deploy because Google was briefly unreachable.
import fs from 'node:fs'
import path from 'node:path'

import { OUT_DATA_DIR } from './lib'

const SHEET_ID = process.env.THEMATIC_SHEET_ID ?? '1SWKSWC-PqdwNmzI3tQpg6vhqAp9lalGdOJNLUpOGsns'
const ABILITIES_GID = process.env.THEMATIC_ABILITIES_GID ?? '2085497358' // "live" values
const PROJECTILES_GID = process.env.THEMATIC_PROJECTILES_GID ?? '1413965993'

const csvUrl = (gid: string) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`

/** Minimal RFC-4180 CSV parser — handles quoted fields and embedded commas/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function toRecords(text: string): Record<string, string>[] {
  const [header, ...rest] = parseCsv(text)
  if (!header) return []
  return rest.map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])))
}

/** The sheet uses -1 (and blanks) for "not applicable" — surface that as undefined, not 0. */
function num(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined
  const n = Number(raw)
  if (!Number.isFinite(n) || n === -1) return undefined
  return n
}

async function fetchCsv(gid: string, label: string): Promise<Record<string, string>[] | undefined> {
  try {
    const res = await fetch(csvUrl(gid), { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    if (text.trimStart().startsWith('<')) throw new Error('got HTML, not CSV — is the sheet still shared for anonymous export?')
    return toRecords(text)
  } catch (err) {
    console.warn(`[export-abilities] couldn't fetch ${label}: ${err instanceof Error ? err.message : String(err)}`)
    return undefined
  }
}

export interface AbilityBalance {
  id: string
  damage?: number
  /** Seconds, not ticks — verified against the sheet (e.g. thunder_clap = 15). */
  cooldown?: number
  duration?: number
  range?: number
  amplifier?: number
}

export async function exportAbilities() {
  const abilityRows = await fetchCsv(ABILITIES_GID, 'ability values')
  const projectileRows = await fetchCsv(PROJECTILES_GID, 'projectile values')

  const abilities: Record<string, AbilityBalance> = {}
  for (const row of abilityRows ?? []) {
    // Header differs between tabs ("thematic:id" on live, "ability_id" on dev).
    const rawId = row['thematic:id'] ?? row['ability_id'] ?? ''
    if (!rawId) continue
    if ((row['disabled'] ?? '').toUpperCase() === 'TRUE') continue
    const id = rawId.replace(/^thematic:/, '')
    abilities[id] = {
      id,
      damage: num(row['damage']),
      cooldown: num(row['cooldown']),
      duration: num(row['duration']),
      range: num(row['range']),
      amplifier: num(row['amplifier']),
    }
  }

  const projectiles: Record<string, AbilityBalance & { type?: string }> = {}
  for (const row of projectileRows ?? []) {
    const id = (row['projectile_id'] ?? '').replace(/^thematic:/, '')
    if (!id) continue
    if ((row['disabled'] ?? '').toUpperCase() === 'TRUE') continue
    projectiles[id] = {
      id,
      type: row['type'] || undefined,
      damage: num(row['damage']),
      cooldown: num(row['cooldown']),
      duration: num(row['duration']),
      range: num(row['radius']),
      amplifier: num(row['amplifier']),
    }
  }

  fs.mkdirSync(OUT_DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DATA_DIR, 'abilities.generated.json'), JSON.stringify({ abilities, projectiles }, null, 2))

  if (abilityRows === undefined && projectileRows === undefined) {
    console.warn('[export-abilities] no sheet data — abilities will show without balance numbers')
  } else {
    console.log(`[export-abilities] wrote ${Object.keys(abilities).length} abilities and ${Object.keys(projectiles).length} projectiles`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportAbilities()
}
