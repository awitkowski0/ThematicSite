// Shared helpers for the export-*.ts scripts. Never hand-edit generated output —
// re-run `npm run export` (or `npm run dev` / `npm run build`, which do it for you).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const SITE_ROOT = path.resolve(__dirname, '..')
export const SOURCE_ROOT = path.resolve(SITE_ROOT, process.env.THEMATIC_SOURCE_DIR ?? '..')

// ---------- resource roots ----------
// Thematic's source layout has changed over time, so every read goes through an ordered list of
// resource roots rather than one hard-coded directory. Later roots override earlier ones at the
// same relative path, which is the order the game loads them in.
//
//   multiversion layout (v1.20.1 since 1.7.0): src/common/resources (the engine), then
//     src/packs/<pack>/resources for every pack that ships in a released jar. Which packs those
//     are is the engine's own packs.json: a pack with "overlays" is a tester pack (wip) and is
//     never public; "ships_in" packs (starwars) are built into their host's jar, so they are.
//   legacy layout: src/main/resources.
function detectResourceRoots(sourceRoot: string): string[] {
  const engine = path.join(sourceRoot, 'src/common/resources')
  if (fs.existsSync(engine)) {
    const roots = [engine]
    const packsJson = path.join(engine, 'packs.json')
    const packs: Record<string, { overlays?: string }> = fs.existsSync(packsJson)
      ? (JSON.parse(fs.readFileSync(packsJson, 'utf-8')).packs ?? {})
      : { heroes: {} }
    for (const name of Object.keys(packs).sort()) {
      if (packs[name].overlays) continue // tester pack: ahead of a release, never public
      const dir = path.join(sourceRoot, 'src/packs', name, 'resources')
      if (fs.existsSync(dir)) roots.push(dir)
    }
    return roots
  }
  const legacy = path.join(sourceRoot, 'src/main/resources')
  return fs.existsSync(legacy) ? [legacy] : []
}

export const RESOURCE_ROOTS = detectResourceRoots(SOURCE_ROOT)

export const DATA = 'data/thematic'
export const ASSETS = 'assets/thematic'

export interface ResourceFile {
  /** Path relative to the directory that was listed. */
  rel: string
  file: string
}

/** Every file with the extension under `<root>/<relDir>` (or any of `relDirs`), merged across roots; later roots win per rel path. */
export function listResources(relDirs: string | string[], ext = '.json'): ResourceFile[] {
  const merged = new Map<string, string>()
  for (const relDir of Array.isArray(relDirs) ? relDirs : [relDirs]) {
    for (const root of RESOURCE_ROOTS) {
      const base = path.join(root, relDir)
      for (const file of walkFiles(base, ext)) merged.set(path.relative(base, file).split(path.sep).join('/'), file)
    }
  }
  return [...merged.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([rel, file]) => ({ rel, file }))
}

/** The winning copy of one file (last root that has it), or undefined. */
export function findResource(...rels: string[]): string | undefined {
  for (const rel of rels) {
    for (let i = RESOURCE_ROOTS.length - 1; i >= 0; i--) {
      const file = path.join(RESOURCE_ROOTS[i], rel)
      if (fs.existsSync(file)) return file
    }
  }
  return undefined
}

function walkFiles(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full, ext))
    else if (entry.name.endsWith(ext)) out.push(full)
  }
  return out
}

// Data directories whose name differs between layouts (recipes -> recipe, tags/items -> tags/item).
export const COLLECTIONS_REL = [`${DATA}/collections`]
export const ARMORS_REL = [`${DATA}/armors`]
export const RECIPES_REL = [`${DATA}/recipe`, `${DATA}/recipes`]
export const ITEM_TAGS_REL = [`${DATA}/tags/item`, `${DATA}/tags/items`]

// The in-game guide book. Current layout: assets/thematic/guide/thematic/en_us (categories/, entries/),
// which replaced the Patchouli book under assets/thematic/patchouli_books/thematic/en_us.
export const GUIDE_BASES = [`${ASSETS}/guide/thematic/en_us`, `${ASSETS}/patchouli_books/thematic/en_us`]
export const GUIDE_CATEGORIES_REL = GUIDE_BASES.map((b) => `${b}/categories`)
export const GUIDE_ENTRIES_REL = GUIDE_BASES.map((b) => `${b}/entries`)
export const GUIDE_SUITS_REL = GUIDE_BASES.map((b) => `${b}/entries/suits`)
export const GUIDE_ABILITIES_REL = GUIDE_BASES.map((b) => `${b}/entries/abilities`)

export const OUT_DATA_DIR = path.join(SITE_ROOT, 'src/data')
export const OUT_SUITS_DIR = path.join(SITE_ROOT, 'public/suits')
export const OUT_ITEMS_DIR = path.join(OUT_SUITS_DIR, 'items')
export const OUT_VANILLA_ITEMS_DIR = path.join(OUT_ITEMS_DIR, 'vanilla')

// A Bedrock Edition resource pack (texture_set.json/.tga/flipbook_textures.json are
// Bedrock-only formats — Java never uses them), not a Java-id-matched icon set. Bedrock's
// naming only sometimes matches Java item ids (iron_ingot/leather/arrow/quartz do; bow ->
// bow_standby, clock -> clock_item, redstone -> redstone_dust don't), and many block-items
// have no single flat icon at all (Bedrock renders those as mini 3D cubes at runtime). We
// only take exact-name matches here — no alias table — so coverage is partial but honest.
export const VANILLA_ICONS_ITEMS_DIR = path.join(SITE_ROOT, 'textures/items')
export const VANILLA_ICONS_BLOCKS_DIR = path.join(SITE_ROOT, 'textures/blocks')

export function requireSourceExists(): void {
  if (RESOURCE_ROOTS.length === 0) {
    throw new Error(
      `Can't find the Thematic mod source under ${SOURCE_ROOT} (looked for src/common/resources and src/main/resources). ` +
        `Set THEMATIC_SOURCE_DIR to point at a Thematic checkout (defaults to "..", ` +
        `i.e. this script expects to run from a "site" directory nested inside Thematic).`,
    )
  }
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

export function walkJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkJsonFiles(full))
    else if (entry.name.endsWith('.json')) out.push(full)
  }
  return out
}

export function stripNamespace(identifier: string): string {
  const idx = identifier.indexOf(':')
  return idx === -1 ? identifier : identifier.slice(idx + 1)
}

export function namespaceOf(identifier: string): string {
  const idx = identifier.indexOf(':')
  return idx === -1 ? 'minecraft' : identifier.slice(0, idx)
}

// Reduces the in-game guide's text markup to plain markdown. Handles both formats:
//   - the current guide: {#RRGGBB}...{/} colour spans, {{key|fallback}} placeholders (the game fills
//     in the number from the ability's data; the fallback is the prose used when it has none),
//     and [text](target) links with thematic:/tip:/copy: targets;
//   - the old Patchouli markup: $(br), $(bold), $(l:...) etc.
// Paragraphs are separated by a blank line; single newlines (lists) become markdown hard breaks.
export type GuideLinkResolver = (target: string) => string | undefined

export function sanitizeGuideText(text: string, resolveLink?: GuideLinkResolver): string {
  return text
    .replace(/\$\(br2?\)/g, '\n\n')
    .replace(/\$\([^)]*\)/g, '')
    .replace(/\{\{[^|}]*\|([^}]*)\}\}/g, '$1')
    .replace(/\{#[0-9A-Fa-f]{3,8}\}/g, '')
    .replace(/\{\/\}/g, '')
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_m, label: string, target: string) => {
      if (target.startsWith('copy:')) return `\`${target.slice(5)}\``
      if (/^https?:\/\//.test(target)) return `[${label}](${target})`
      const href = resolveLink?.(target)
      return href ? `[${label}](${href})` : label
    })
    .split(/\n{2,}/)
    .map((para) =>
      para
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean)
        .join('  \n'),
    )
    .filter(Boolean)
    .join('\n\n')
}

/** @deprecated old name, kept for callers written against the Patchouli book. */
export const sanitizePatchouliText = sanitizeGuideText

export function titleCase(id: string): string {
  return id
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function copyIfExists(src: string | undefined, dest: string): boolean {
  if (!src || !fs.existsSync(src)) return false
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  return true
}

// Resolves an icon for a thematic-namespaced item: its own item texture, then its block
// texture (many thematic items are blocks, which is not a bug), then nothing (caller falls
// back to a generic placeholder). Copies whichever file it finds into public/suits/items/.
const thematicIconCache = new Map<string, string | undefined>()

export function resolveThematicIcon(itemId: string): string | undefined {
  const cached = thematicIconCache.get(itemId)
  if (cached !== undefined || thematicIconCache.has(itemId)) return cached
  const resolved = resolveThematicIconUncached(itemId)
  thematicIconCache.set(itemId, resolved)
  return resolved
}

function resolveThematicIconUncached(itemId: string): string | undefined {
  const src = findResource(`${ASSETS}/textures/item/${itemId}.png`, `${ASSETS}/textures/block/${itemId}.png`)
  if (src && copyIfExists(src, path.join(OUT_ITEMS_DIR, `${itemId}.png`))) return `/suits/items/${itemId}.png`
  return undefined
}

// See VANILLA_ICONS_ITEMS_DIR/VANILLA_ICONS_BLOCKS_DIR above — exact-name match only.
const vanillaIconCache = new Map<string, string | undefined>()

export function resolveVanillaIcon(itemId: string): string | undefined {
  const cached = vanillaIconCache.get(itemId)
  if (cached !== undefined || vanillaIconCache.has(itemId)) return cached
  const resolved = resolveVanillaIconUncached(itemId)
  vanillaIconCache.set(itemId, resolved)
  return resolved
}

function resolveVanillaIconUncached(itemId: string): string | undefined {
  const dest = path.join(OUT_VANILLA_ITEMS_DIR, `${itemId}.png`)
  if (copyIfExists(path.join(VANILLA_ICONS_ITEMS_DIR, `${itemId}.png`), dest)) return `/suits/items/vanilla/${itemId}.png`
  if (copyIfExists(path.join(VANILLA_ICONS_BLOCKS_DIR, `${itemId}.png`), dest)) return `/suits/items/vanilla/${itemId}.png`
  return undefined
}
