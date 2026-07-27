// Shared helpers for the export-*.ts scripts. Never hand-edit generated output —
// re-run `npm run export` (or `npm run dev` / `npm run build`, which do it for you).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const SITE_ROOT = path.resolve(__dirname, '..')
export const SOURCE_ROOT = path.resolve(SITE_ROOT, process.env.THEMATIC_SOURCE_DIR ?? '..')
export const RESOURCES = path.join(SOURCE_ROOT, 'src/main/resources')
export const DATA_DIR = path.join(RESOURCES, 'data/thematic')
export const ASSETS_DIR = path.join(RESOURCES, 'assets/thematic')
export const PATCHOULI_DIR = path.join(ASSETS_DIR, 'patchouli_books/thematic/en_us')

export const COLLECTIONS_DIR = path.join(DATA_DIR, 'collections')
export const ARMORS_DIR = path.join(DATA_DIR, 'armors')
export const RECIPES_DIR = path.join(DATA_DIR, 'recipes')
export const WORLDGEN_DIR = path.join(DATA_DIR, 'worldgen')
export const PATCHOULI_CATEGORIES_DIR = path.join(PATCHOULI_DIR, 'categories')
export const PATCHOULI_ENTRIES_DIR = path.join(PATCHOULI_DIR, 'entries')
export const PATCHOULI_SUITS_DIR = path.join(PATCHOULI_ENTRIES_DIR, 'suits')
export const PATCHOULI_ABILITIES_DIR = path.join(PATCHOULI_ENTRIES_DIR, 'abilities')
export const ARMOR_TEXTURES_DIR = path.join(ASSETS_DIR, 'textures/armor')
export const ITEM_TEXTURES_DIR = path.join(ASSETS_DIR, 'textures/item')
export const BLOCK_TEXTURES_DIR = path.join(ASSETS_DIR, 'textures/block')

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
  if (!fs.existsSync(RESOURCES)) {
    throw new Error(
      `Can't find the Thematic mod source at ${RESOURCES}. ` +
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

// Strips Patchouli's in-book markup ($(l:...)...$(/l), $(br), $(bold), etc.) down to plain
// markdown text. $(br)/$(br2) become paragraph breaks (a bare \n is invisible in standard
// markdown without a plugin, so we don't bother distinguishing single vs double break).
export function sanitizePatchouliText(text: string): string {
  return text
    .replace(/\$\(br2?\)/g, '\n\n')
    .replace(/\$\([^)]*\)/g, '')
    .split('\n\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
}

export function titleCase(id: string): string {
  return id
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function copyIfExists(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) return false
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  return true
}

// Resolves an icon for a thematic-namespaced item: its own item texture, then its block
// texture (many thematic items are blocks, which is not a bug), then nothing (caller falls
// back to a generic placeholder). Copies whichever file it finds into public/suits/items/.
export function resolveThematicIcon(itemId: string): string | undefined {
  const itemSrc = path.join(ITEM_TEXTURES_DIR, `${itemId}.png`)
  const blockSrc = path.join(BLOCK_TEXTURES_DIR, `${itemId}.png`)
  const dest = path.join(OUT_ITEMS_DIR, `${itemId}.png`)
  if (copyIfExists(itemSrc, dest)) return `/suits/items/${itemId}.png`
  if (copyIfExists(blockSrc, dest)) return `/suits/items/${itemId}.png`
  return undefined
}

// See VANILLA_ICONS_ITEMS_DIR/VANILLA_ICONS_BLOCKS_DIR above — exact-name match only.
export function resolveVanillaIcon(itemId: string): string | undefined {
  const dest = path.join(OUT_VANILLA_ITEMS_DIR, `${itemId}.png`)
  if (copyIfExists(path.join(VANILLA_ICONS_ITEMS_DIR, `${itemId}.png`), dest)) return `/suits/items/vanilla/${itemId}.png`
  if (copyIfExists(path.join(VANILLA_ICONS_BLOCKS_DIR, `${itemId}.png`), dest)) return `/suits/items/vanilla/${itemId}.png`
  return undefined
}
