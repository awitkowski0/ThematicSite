// Generates the guidebook data (src/data/book.generated.json + src/data/book/<category>.generated.json)
// from Thematic's in-game guide, read the way the game reads it:
//
//   assets/<ns>/guide/<book>/<lang>/book.json
//   assets/<ns>/guide/<book>/<lang>/categories/<category>.json   id  <ns>:<category>
//   assets/<ns>/guide/<book>/<lang>/entries/<folder>/<name>.json  id  <ns>:<folder>/<name>
//
// The loader is GuideLoader.java, the model GuideModel/GuideParser/GuideLibrary.java, the page-type
// table GuideSchema.java and the format reference docs/guide-book.md (all in the Thematic repo).
// What this script does the same way:
//   - the engine's files, then each shipped pack's, later roots replacing earlier ones by id
//     (scripts/lib.ts decides which packs ship; the wip tester pack never does);
//   - categories and entries are ordered by `sort`, then by lowercase name;
//   - `requires: "op"` hides a category (with its children and entries) or an entry from everyone
//     but operators, so none of it is published;
//   - a page is a bare string (text) or an object with a `type`; a page with an `id` is an anchor
//     other entries can link to (the status effects share one entry that way).
// What it adds for the web: links are resolved to site URLs here, `{{key|fallback}}` numbers are filled
// from the ability sheet where it has them, and the pages that the game draws from live data
// (suit stats, suit recipe, abilities, keybinds, crafting grids) are written out as plain data.
import fs from 'node:fs'
import path from 'node:path'

import { fillTokens, plain, rewriteLinks } from '../src/lib/guideMarkup'
import {
  ASSETS,
  GUIDE_BOOK_REL,
  GUIDE_CATEGORIES_REL,
  GUIDE_ENTRIES_REL,
  ITEM_TAGS_REL,
  OUT_DATA_DIR,
  RECIPES_REL,
  SITE_ROOT,
  findResource,
  listResources,
  listResourcesAll,
  readJson,
  requireSourceExists,
  resolveThematicIcon,
  resolveVanillaIcon,
  copyIfExists,
  stripNamespace,
  titleCase,
} from './lib'

requireSourceExists()

const NS = 'thematic'
const OUT_BOOK_DIR = path.join(OUT_DATA_DIR, 'book')
const OUT_IMAGES_DIR = path.join(SITE_ROOT, 'public/book')
const REQUIRES = ['op']

// ---------- the page-type table (GuideSchema.java) ----------

interface PageSchema {
  required: string[]
}
const PAGE_TYPES: Record<string, PageSchema> = {
  text: { required: [] },
  spotlight: { required: ['item'] },
  crafting: { required: ['recipe'] },
  image: { required: ['images'] },
  figure: { required: [] }, // needs `suit` or `entity`, checked below
  structure: { required: ['structure'] },
  ore: { required: ['item'] },
  links: { required: ['entries'] },
  suit_recipe: { required: ['suit'] },
  suit_stats: { required: ['suit'] },
  suit_abilities: { required: ['suit'] },
  ability_data: { required: [] },
  passive_description: { required: ['description'] },
  ability_keybinds: { required: ['bindings'] },
  ability_animation_api: { required: ['animations'] },
  ability_items: { required: ['items'] },
}

// ---------- raw shapes ----------

type RawPage = string | ({ type?: string; id?: string } & Record<string, unknown>)

interface RawBook {
  name?: string
  landing?: string
  icon?: string
  intro?: string
}
interface RawCategory {
  name?: string
  description?: string
  icon?: string
  sort?: number
  parent?: string
  requires?: string
}
interface RawEntry {
  name?: string
  category?: string
  icon?: string
  sort?: number
  pages?: RawPage[]
  requires?: string
}

interface Category {
  id: string // namespaced, thematic:getting_started
  slug: string // getting_started
  name: string
  description: string
  icon: string
  sort: number
  parent?: string
  requires: string
}
interface Entry {
  id: string // thematic:getting_started/ores
  path: string // getting_started/ores
  slug: string // URL segment, unique within its category
  name: string
  category: string
  icon: string
  sort: number
  pages: { type: string; raw: Record<string, unknown> }[]
  requires: string
}

// ---------- problems and counters ----------

const problems: string[] = []
const counts = {
  pagesByType: new Map<string, number>(),
  unknownTypes: new Map<string, number>(),
  linksTotal: 0,
  linksExternal: 0,
  linksTip: 0,
  linksCopy: 0,
  linksResolved: 0,
  linksOpOnly: 0,
  linksDead: new Map<string, number>(),
  tokensFilled: 0,
  tokensFallback: 0,
  iconsResolved: 0,
  iconsMissing: new Set<string>(),
  recipes: 0,
  recipesMissing: new Set<string>(),
  imagesMissing: new Set<string>(),
}

// ---------- names, icons ----------

const lang = new Map<string, string>()
function loadLang() {
  for (const { file } of listResourcesAll(`${ASSETS}/lang`)) {
    if (path.basename(file) !== 'en_us.json') continue
    for (const [k, v] of Object.entries(readJson<Record<string, unknown>>(file))) if (typeof v === 'string') lang.set(k, v)
  }
}

function bareId(id: string): string {
  if (!id.includes('{')) id = id.split(',')[0] // a comma list names several items; the first is shown
  const cut = id.indexOf('{')
  return (cut < 0 ? id : id.slice(0, cut)).trim()
}

function itemName(id: string): string {
  const b = bareId(id)
  const ns = b.includes(':') ? b.slice(0, b.indexOf(':')) : 'minecraft'
  const p = stripNamespace(b)
  return lang.get(`item.${ns}.${p}`) ?? lang.get(`block.${ns}.${p}`) ?? titleCase(p.replace(/\//g, '_'))
}

function iconFor(id: string | undefined): string | undefined {
  if (!id) return undefined
  const b = bareId(id)
  if (!b) return undefined
  const ns = b.includes(':') ? b.slice(0, b.indexOf(':')) : 'minecraft'
  const p = stripNamespace(b)
  const hit = ns === NS ? resolveThematicIcon(p) : ns === 'minecraft' ? resolveVanillaIcon(p) : undefined
  if (hit) counts.iconsResolved++
  else counts.iconsMissing.add(b)
  return hit
}

// ---------- data the site already exports ----------

interface SuitData {
  id: string
  name: string
  collectionName: string
  tier: number
  wip: boolean
  stats: { id: string; label: string; minimum: number; maximum: number }[]
  abilities: { id: string; name: string }[]
  recipe?: { id: string; name: string; count: number; iconPath?: string; options?: string[] }[]
}
let suits = new Map<string, SuitData>()
let abilitySheet: Record<string, Record<string, number | undefined>> = {}

function loadSiteData() {
  const suitsFile = path.join(OUT_DATA_DIR, 'suits.generated.json')
  if (fs.existsSync(suitsFile)) suits = new Map(readJson<SuitData[]>(suitsFile).map((s) => [s.id, s]))
  else console.warn('[export-book] suits.generated.json is missing: suit pages will link nowhere (run export-suits first)')
  const abilitiesFile = path.join(OUT_DATA_DIR, 'abilities.generated.json')
  if (fs.existsSync(abilitiesFile)) abilitySheet = readJson<{ abilities?: typeof abilitySheet }>(abilitiesFile).abilities ?? {}
  else console.warn('[export-book] abilities.generated.json is missing: ability numbers fall back to their words')
}

// ---------- tags and recipes ----------

const itemTags = new Map<string, string[]>()
function loadTags() {
  for (const { rel, file } of listResources(ITEM_TAGS_REL)) {
    const raw = readJson<{ values?: (string | { id?: string })[] }>(file)
    const values = (raw.values ?? []).map((v) => (typeof v === 'string' ? v : v.id)).filter((v): v is string => typeof v === 'string' && !v.startsWith('#'))
    itemTags.set(`${NS}:${rel.replace(/\.json$/, '')}`, values)
  }
}

interface Ing {
  id: string
  name: string
  icon?: string
  /** An "any of these" slot: the tag, and the names of what satisfies it (or of the alternatives listed). */
  tag?: string
  options?: string[]
}

type RawIng = string | { item?: string; id?: string; tag?: string; count?: number } | RawIng[] | null | undefined

function ing(raw: RawIng): Ing | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (Array.isArray(raw)) {
    const parts = raw.map(ing).filter((x): x is Ing => x !== null)
    if (parts.length === 0) return null
    const [first] = parts
    return parts.length === 1 ? first : { ...first, options: [...new Set(parts.map((p) => p.name))] }
  }
  const text = typeof raw === 'string' ? raw : raw.tag ? `#${raw.tag}` : (raw.item ?? raw.id ?? '')
  if (!text) return null
  if (text.startsWith('#')) {
    const tag = text.slice(1)
    const members = itemTags.get(tag) ?? []
    const first = members[0]
    return {
      id: text,
      name: `Any ${titleCase(stripNamespace(tag))}`,
      tag,
      icon: iconFor(first),
      options: members.map(itemName),
    }
  }
  return { id: text, name: itemName(text), icon: iconFor(text) }
}

interface Recipe {
  id: string
  label: string
  /** Grid size for crafting recipes; otherwise the inputs are listed in a row. */
  cols: number
  cells: (Ing | null)[]
  result: { id: string; name: string; icon?: string; count: number }
  shapeless?: boolean
}
type RawRecipeFile = {
  type?: string
  pattern?: string[]
  key?: Record<string, RawIng>
  ingredients?: RawIng[]
  ingredient?: RawIng
  result?: string | { id?: string; item?: string; count?: number }
  template?: RawIng
  base?: RawIng
  addition?: RawIng
}

const RECIPE_LABELS: Record<string, string> = {
  crafting_shaped: 'Crafting',
  crafting_shapeless: 'Crafting (shapeless)',
  smelting: 'Smelting',
  blasting: 'Blasting',
  smoking: 'Smoking',
  campfire_cooking: 'Campfire cooking',
  stonecutting: 'Stonecutting',
  smithing_transform: 'Smithing',
  smithing_trim: 'Smithing',
}

const recipeCache = new Map<string, Recipe | null>()
function recipeById(id: string): Recipe | null {
  if (recipeCache.has(id)) return recipeCache.get(id)!
  const found = convertRecipe(id)
  recipeCache.set(id, found)
  if (found) counts.recipes++
  else counts.recipesMissing.add(id)
  return found
}

function convertRecipe(id: string): Recipe | null {
  if (id.includes(':') && !id.startsWith(`${NS}:`)) return null // vanilla recipes are not in the mod's data
  const bare = stripNamespace(id)
  const file = findResource(...RECIPES_REL.map((d) => `${d}/${bare}.json`))
  if (!file) return null
  const raw = readJson<RawRecipeFile>(file)
  const type = stripNamespace(raw.type ?? '')
  const rawResult = raw.result
  const resultId = typeof rawResult === 'string' ? rawResult : (rawResult?.id ?? rawResult?.item ?? '')
  const resultCount = typeof rawResult === 'object' && rawResult ? (rawResult.count ?? 1) : 1
  if (!resultId) return null
  const result = { id: resultId, name: itemName(resultId), icon: iconFor(resultId), count: resultCount }
  const label = RECIPE_LABELS[type] ?? titleCase(type || 'recipe')

  if (raw.pattern && raw.key) {
    const cols = Math.max(...raw.pattern.map((r) => r.length))
    const cells: (Ing | null)[] = []
    for (const row of raw.pattern) {
      for (let c = 0; c < cols; c++) {
        const ch = row[c]
        cells.push(ch && ch !== ' ' ? ing(raw.key[ch]) : null)
      }
    }
    return { id, label, cols, cells, result }
  }
  if (raw.ingredients) {
    const cells = raw.ingredients.map(ing)
    const cols = cells.length <= 1 ? 1 : cells.length <= 4 ? 2 : 3
    return { id, label, cols, cells, result, shapeless: true }
  }
  const inputs = [raw.ingredient, raw.template, raw.base, raw.addition].filter((x) => x !== undefined).map(ing)
  return { id, label, cols: Math.max(1, inputs.length), cells: inputs, result }
}

// ---------- reading the book ----------

function loadBook(): { book: Required<RawBook>; categories: Map<string, Category>; entries: Map<string, Entry> } {
  const bookFile = findResource(GUIDE_BOOK_REL)
  const rawBook = bookFile ? readJson<RawBook>(bookFile) : {}
  const book = {
    name: rawBook.name ?? 'Guide',
    landing: rawBook.landing ?? '',
    icon: rawBook.icon ?? 'minecraft:book',
    intro: rawBook.intro ?? '',
  }

  const categories = new Map<string, Category>()
  for (const { rel, file } of listResources(GUIDE_CATEGORIES_REL)) {
    const slug = rel.replace(/\.json$/, '')
    const id = `${NS}:${slug}`
    const raw = readJson<RawCategory>(file)
    if (!raw.name) problems.push(`${id}: category has no name`)
    const requires = raw.requires ?? ''
    if (requires && !REQUIRES.includes(requires)) problems.push(`${id}: unknown requires '${requires}'`)
    categories.set(id, {
      id,
      slug,
      name: raw.name ?? id,
      description: raw.description ?? '',
      icon: raw.icon ?? 'minecraft:book',
      sort: Number.isInteger(raw.sort) ? (raw.sort as number) : 0,
      parent: raw.parent || undefined,
      requires,
    })
  }

  const entries = new Map<string, Entry>()
  for (const { rel, file } of listResources(GUIDE_ENTRIES_REL)) {
    const p = rel.replace(/\.json$/, '')
    const id = `${NS}:${p}`
    const raw = readJson<RawEntry>(file)
    if (!raw.name) problems.push(`${id}: entry has no name`)
    if (!raw.category) problems.push(`${id}: entry has no category`)
    const requires = raw.requires ?? ''
    if (requires && !REQUIRES.includes(requires)) problems.push(`${id}: unknown requires '${requires}'`)
    const pages: Entry['pages'] = []
    if (!Array.isArray(raw.pages)) problems.push(`${id}: entry has no pages array`)
    ;(raw.pages ?? []).forEach((page, i) => {
      const where = `${id} page ${i + 1}`
      if (typeof page === 'string') {
        pages.push({ type: 'text', raw: { text: page } })
        return
      }
      if (!page || typeof page !== 'object') {
        problems.push(`${where}: page is neither a string nor an object`)
        return
      }
      const type = typeof page.type === 'string' ? page.type : 'text'
      const schema = PAGE_TYPES[type]
      if (!schema) {
        problems.push(`${where}: unknown page type '${type}'`)
        counts.unknownTypes.set(type, (counts.unknownTypes.get(type) ?? 0) + 1)
        return
      }
      for (const f of schema.required) {
        if (page[f] === undefined) {
          problems.push(`${where}: ${type} page needs '${f}'`)
          return
        }
      }
      if (type === 'figure' && page.suit === undefined && page.entity === undefined) {
        problems.push(`${where}: figure page needs 'suit' or 'entity'`)
        return
      }
      pages.push({ type, raw: page as Record<string, unknown> })
    })
    entries.set(id, {
      id,
      path: p,
      slug: path.basename(p),
      name: raw.name ?? id,
      category: raw.category ?? '',
      icon: raw.icon ?? 'minecraft:book',
      sort: Number.isInteger(raw.sort) ? (raw.sort as number) : 0,
      pages,
      requires,
    })
  }
  return { book, categories, entries }
}

const byName = <T extends { name: string; sort: number }>(a: T, b: T) => a.sort - b.sort || a.name.toLowerCase().localeCompare(b.name.toLowerCase())

// ---------- link resolution ----------

interface Library {
  categories: Map<string, Category>
  /** Everything the game has, op-only parts included, so a link into them can be told from a dead one. */
  allCategories: Map<string, Category>
  entries: Map<string, Entry>
  allEntries: Map<string, Entry>
  /** Page id -> its entry and index. */
  anchors: Map<string, { entry: string; page: number; slug: string }>
}

function anchorSlug(id: string): string {
  return id.slice(Math.max(id.lastIndexOf('/'), id.lastIndexOf(':')) + 1)
}

function entryHref(lib: Library, e: Entry): string {
  const cat = lib.categories.get(e.category)
  if (cat?.slug === 'suit') {
    const suit = suits.get(e.slug)
    if (suit && !suit.wip) return `/suits/${e.slug}`
  }
  return `/book/${cat?.slug ?? stripNamespace(e.category)}/${e.slug}`
}

type LinkResult = { href: string } | { dead: 'op' | 'missing' }

function resolveTarget(lib: Library, target: string, ns: string): LinkResult {
  const hash = target.indexOf('#')
  const t = hash < 0 ? target : target.slice(0, hash)
  const frag = hash < 0 ? '' : target.slice(hash + 1)
  const id = t.includes(':') ? t : `${ns}:${t}`
  const entry = lib.entries.get(id)
  if (entry) {
    let anchor = ''
    if (frag) {
      const hit = [...lib.anchors.entries()].find(([key, a]) => a.entry === id && (key.endsWith(`/${frag}`) || key.endsWith(`:${frag}`)))
      anchor = hit ? `#${hit[1].slug}` : /^\d+$/.test(frag) ? `#p${frag}` : ''
    }
    return { href: entryHref(lib, entry) + anchor }
  }
  const cat = lib.categories.get(id)
  if (cat) return { href: `/book/${cat.slug}` }
  const a = lib.anchors.get(id)
  if (a) {
    const holder = lib.entries.get(a.entry)
    if (holder) return { href: `${entryHref(lib, holder)}#${a.slug}` }
  }
  if (lib.allEntries.has(id) || lib.allCategories.has(id)) return { dead: 'op' }
  return { dead: 'missing' }
}

// ---------- page conversion ----------

type Json = Record<string, unknown>

function convertEntry(lib: Library, e: Entry): Json {
  const ns = e.id.slice(0, e.id.indexOf(':'))
  const abilityId = e.path.slice(e.path.lastIndexOf('/') + 1)

  const sheetValue = (ability: string, key: string): number | undefined => {
    const row = abilitySheet[ability]
    if (!row || !['cooldown', 'duration', 'range', 'amplifier'].includes(key)) return undefined
    const v = row[key]
    return typeof v === 'number' && v > 0 ? v : undefined
  }

  const link = (target: string): string => {
    counts.linksTotal++
    if (/^https?:\/\//.test(target)) {
      counts.linksExternal++
      return target
    }
    if (target.startsWith('tip:')) {
      counts.linksTip++
      return target
    }
    if (target.startsWith('copy:')) {
      counts.linksCopy++
      return target
    }
    const r = resolveTarget(lib, target, ns)
    if ('href' in r) {
      counts.linksResolved++
      return r.href
    }
    if (r.dead === 'op') counts.linksOpOnly++
    else counts.linksDead.set(`${e.id} -> ${target}`, 1)
    return 'dead:' + target
  }

  // Markup text: placeholders filled, links resolved to site URLs.
  const T = (s: unknown, ability: string | undefined = abilityId): string | undefined => {
    if (typeof s !== 'string' || s === '') return undefined
    const total = (s.match(/\{\{/g) ?? []).length
    let filledNow = 0
    const filled = fillTokens(s, ability, (a, k) => {
      const v = sheetValue(a, k)
      if (v !== undefined) filledNow++
      return v
    })
    counts.tokensFilled += filledNow
    counts.tokensFallback += total - filledNow
    return rewriteLinks(filled, link)
  }
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [])
  const item = (id: string) => ({ id: bareId(id), name: itemName(id), icon: iconFor(id) })
  const suitRef = (id: string) => {
    const b = stripNamespace(bareId(id))
    const s = suits.get(b)
    return { id: b, name: s?.name ?? itemName(id), href: s && !s.wip ? `/suits/${b}` : undefined, collection: s?.collectionName, tier: s?.tier }
  }
  const entryRef = (target: string) => {
    const id = target.includes(':') ? target : `${ns}:${target}`
    const r = resolveTarget(lib, target, ns)
    counts.linksTotal++
    if ('href' in r) {
      counts.linksResolved++
      const en = lib.entries.get(id) ?? (lib.anchors.get(id) ? lib.entries.get(lib.anchors.get(id)!.entry) : undefined)
      const cat = lib.categories.get(id)
      const label = lib.anchors.has(id) ? anchorTitle(lib, id) : (en?.name ?? cat?.name ?? target)
      return { label, href: r.href, icon: iconFor(en?.icon ?? cat?.icon) }
    }
    if (r.dead === 'op') counts.linksOpOnly++
    else counts.linksDead.set(`${e.id} -> ${target}`, 1)
    return { label: target, href: null as string | null }
  }
  const effectRef = (effect: string) => {
    const id = `${NS}:effect/${effect}`
    const r = resolveTarget(lib, id, ns)
    counts.linksTotal++
    if ('href' in r) {
      counts.linksResolved++
      return { label: anchorTitle(lib, id) || titleCase(effect), href: r.href }
    }
    counts.linksDead.set(`${e.id} -> ${id}`, 1)
    return { label: lang.get(`effect.thematic.${effect}`) ?? titleCase(effect), href: null as string | null }
  }

  const pages: Json[] = e.pages.map(({ type, raw }) => {
    counts.pagesByType.set(type, (counts.pagesByType.get(type) ?? 0) + 1)
    const id = typeof raw.id === 'string' ? raw.id : undefined
    const base: Json = { type, anchor: id ? anchorSlug(id) : undefined, title: T(raw.title) }
    switch (type) {
      case 'text':
        return { ...base, text: T(raw.text), icon: raw.icon ? iconFor(str(raw.icon)) : undefined }
      case 'spotlight':
        return { ...base, item: item(str(raw.item)), text: T(raw.text) }
      case 'crafting': {
        const ids = [str(raw.recipe), raw.recipe2 ? str(raw.recipe2) : ''].filter(Boolean)
        return { ...base, recipes: ids.map((rid) => recipeById(rid) ?? { id: rid, missing: true, name: itemName(rid) }), text: T(raw.text) }
      }
      case 'image': {
        const images = strings(raw.images).map((img) => {
          const rel = `${ASSETS}/${stripNamespace(bareId(img))}`
          const src = findResource(rel)
          const out = `${path.basename(rel)}`
          if (src && copyIfExists(src, path.join(OUT_IMAGES_DIR, out))) return { src: `/book/${out}`, alt: titleCase(path.basename(rel, '.png')) }
          counts.imagesMissing.add(img)
          return { src: null as string | null, alt: titleCase(path.basename(rel, '.png')) }
        })
        return { ...base, images, border: raw.border === true, text: T(raw.text) }
      }
      case 'figure': {
        const suit = raw.suit ? suitRef(str(raw.suit)) : undefined
        const entity = raw.entity ? { id: str(raw.entity), name: itemName(str(raw.entity)) } : undefined
        const name = T(raw.name) ?? suit?.name ?? entity?.name
        const text = T(raw.text)
        return { ...base, suit, entity, name, text: text && text.trim() ? text : undefined }
      }
      case 'structure':
        return { ...base, structure: { id: str(raw.structure), name: titleCase(stripNamespace(str(raw.structure))) }, text: T(raw.text) }
      case 'ore': {
        const items = strings(raw.item)
          .flatMap((s) => s.split(','))
          .map((s) => s.trim())
          .filter(Boolean)
        return { ...base, item: item(items[0] ?? ''), items: items.map(itemName), placements: orePlacements(items), text: T(raw.text) }
      }
      case 'links':
        return { ...base, entries: strings(raw.entries).map(entryRef), text: T(raw.text) }
      case 'suit_recipe': {
        const suit = suitRef(str(raw.suit))
        const data = suits.get(suit.id)
        const bench = raw.link_recipe === true ? resolveTarget(lib, 'getting_started/suit_bench', ns) : null
        return {
          ...base,
          suit,
          ingredients: data?.recipe?.map((r) => ({ name: r.name, count: r.count, icon: r.iconPath, options: r.options })) ?? null,
          benchHref: bench && 'href' in bench ? bench.href : undefined,
          text: T(raw.text),
        }
      }
      case 'suit_stats': {
        const suit = suitRef(str(raw.suit))
        const data = suits.get(suit.id)
        return { ...base, suit, stats: data?.stats.map((s) => ({ label: s.label, min: s.minimum, max: s.maximum })) ?? null }
      }
      case 'suit_abilities': {
        const suit = suitRef(str(raw.suit))
        const data = suits.get(suit.id)
        const abilities: Json[] = []
        for (const a of data?.abilities ?? []) {
          const target = `${NS}:abilities/${a.id}`
          const r = resolveTarget(lib, target, ns)
          if (!('href' in r)) continue // an ability with no page is left out, as in the game
          const en = lib.entries.get(target)
          const lead = en ? leadOf(en) : undefined
          abilities.push({ label: en?.name ?? a.name, href: r.href, brief: lead && lead.length <= 200 ? lead : undefined })
        }
        return { ...base, suit, abilities }
      }
      case 'ability_data': {
        const ability = str(raw.ability) ? stripNamespace(str(raw.ability)) : abilityId
        const row = abilitySheet[ability]
        const include = strings(raw.include_stats)
        const exclude = strings(raw.exclude_stats)
        const show = (k: string) => (include.length ? include.includes(k) : !exclude.includes(k))
        const stats =
          raw.hide_stats === true || !row
            ? []
            : (['damage', 'cooldown', 'duration', 'range', 'amplifier'] as const)
                .filter((k) => show(k) && typeof row[k] === 'number' && (row[k] as number) > 0)
                .map((k) => ({ label: titleCase(k), value: Number.isInteger(row[k]) ? String(row[k]) : (row[k] as number).toFixed(2) }))
        return {
          ...base,
          sheet: !!row,
          stats,
          rulesText: T(raw.rules_text, ability),
          rulesSteps: strings(raw.rules_steps)
            .filter((s) => s.trim())
            .map((s) => T(s, ability)),
          damageContext: damageContext(str(raw.damage_context)),
          damageNote: T(raw.damage_note, ability),
        }
      }
      case 'passive_description':
        return { ...base, description: T(raw.description), effects: strings(raw.relevant_effects).map(effectRef) }
      case 'ability_keybinds': {
        const rows = (Array.isArray(raw.bindings) ? raw.bindings : []).filter((b): b is Json => !!b && typeof b === 'object')
        return {
          ...base,
          rows: rows.map((b) => ({ action: str(b.action), keys: strings(b.keys).map(keyLabel), note: str(b.note) || undefined })),
          footer: T(raw.footer_text),
        }
      }
      case 'ability_animation_api': {
        const list = (Array.isArray(raw.animations) ? raw.animations : []).filter((a): a is Json => !!a && typeof a === 'object' && 'id' in a)
        return { ...base, animations: list.map((a) => ({ label: str(a.label) || str(a.id) })) }
      }
      case 'ability_items':
        return { ...base, items: strings(raw.items).map(item), text: T(raw.text) }
      default:
        return { ...base, type: 'unknown', original: type }
    }
  })

  const cat = lib.categories.get(e.category)
  return {
    id: e.slug,
    path: e.path,
    name: e.name,
    category: cat?.slug ?? stripNamespace(e.category),
    icon: iconFor(e.icon),
    pages,
  }
}

function anchorTitle(lib: Library, id: string): string {
  const a = lib.anchors.get(id)
  if (!a) return ''
  const en = lib.entries.get(a.entry)
  const page = en?.pages[a.page]
  return plain(typeof page?.raw.title === 'string' ? page.raw.title : '')
}

function leadOf(en: Entry): string | undefined {
  for (const p of en.pages) {
    if (p.type !== 'text') continue
    const text = typeof p.raw.text === 'string' ? plain(fillTokens(p.raw.text, en.slug, () => undefined)) : ''
    if (text) return text
  }
  return undefined
}

function damageContext(given: string): string | undefined {
  switch (given.trim().toLowerCase()) {
    case 'on_activate':
      return 'Damage is applied when the ability activates.'
    case 'active_tick':
      return 'Damage is applied repeatedly while the ability is active.'
    case 'temp_active':
      return 'Damage is applied during a temporary active window (often on contact or on end).'
    case 'on_deactivate':
      return 'Damage is applied when the ability deactivates.'
    case 'projectile':
      return 'Damage is primarily delivered through spawned projectiles/entities.'
    case 'passive':
      return 'Damage is passive/conditional and depends on triggers.'
    case '':
      return undefined
    default:
      return 'Damage behavior varies by ability implementation.'
  }
}

// Default binds, from ThematicKeybinds.java (the same list /mechanics/keybinds shows).
const DEFAULT_KEYS: Record<string, string> = {
  'key.thematic.ability_0': 'R',
  'key.thematic.ability_1': 'F',
  'key.thematic.ability_2': 'G',
  'key.thematic.ability_3': 'V',
  'key.thematic.ability_4': 'C',
  'key.thematic.ability_5': 'Z',
  'key.thematic.ultimate': 'Y',
  'key.thematic.equip_item': 'H',
  'key.thematic.utility': 'J',
  'key.thematic.cosmetic': 'K',
  'key.thematic.acrobatics_dodge': 'Left Shift',
  'key.thematic.raise_speed': 'Up Arrow',
  'key.thematic.lower_speed': 'Down Arrow',
}
function keyLabel(id: string): { key?: string; name: string } {
  return { key: DEFAULT_KEYS[id], name: lang.get(id) ?? titleCase(id.split('.').pop() ?? id) }
}

let oresData: { material: string; variant?: string; yLevel?: { min: number; max: number }; veinsPerChunk?: number }[] = []
function orePlacements(items: string[]) {
  const block = items.find((i) => /_ore$/.test(i))
  if (!block) return []
  const base = stripNamespace(block).replace(/^deepslate_/, '').replace(/_ore$/, '')
  return oresData
    .filter((o) => o.material === base || base.startsWith(o.material))
    .filter((o) => o.yLevel)
    .map((o) => ({ variant: o.variant ?? 'Standard', min: o.yLevel!.min, max: o.yLevel!.max, veins: o.veinsPerChunk }))
}

// ---------- main ----------

export function exportBook() {
  loadLang()
  loadTags()
  loadSiteData()
  const oresFile = path.join(OUT_DATA_DIR, 'ores.generated.json')
  if (fs.existsSync(oresFile)) oresData = readJson(oresFile)

  const { book, categories: allCategories, entries: allEntries } = loadBook()

  // Parent that names nothing, entry in a category that names nothing: reported, as the game does.
  for (const c of allCategories.values()) if (c.parent && !allCategories.has(c.parent)) problems.push(`${c.id}: parent category '${c.parent}' does not exist`)
  for (const e of allEntries.values()) if (!allCategories.has(e.category)) problems.push(`${e.id}: category '${e.category}' does not exist`)

  // GuideLibrary.visibleTo(false): drop restricted categories, and everything under one.
  const restricted = (c: Category): boolean => {
    let at: Category | undefined = c
    for (let i = 0; at && i <= allCategories.size; i++) {
      if (at.requires) return true
      at = at.parent ? allCategories.get(at.parent) : undefined
    }
    return false
  }
  const categories = new Map([...allCategories].filter(([, c]) => !restricted(c)))
  const entries = new Map(
    [...allEntries].filter(([, e]) => !e.requires && categories.has(e.category)), // an entry in a category that does not exist is unreachable in the game's lists too
  )

  // One URL segment per entry within its category: the file's own name, or folder_name if two share one.
  const taken = new Map<string, string>()
  for (const e of entries.values()) {
    const key = `${e.category}/${e.slug}`
    if (taken.has(key)) {
      const dir = e.path.includes('/') ? e.path.slice(0, e.path.indexOf('/')) : ''
      e.slug = `${dir}_${e.slug}`
      problems.push(`${e.id}: shares its file name with ${taken.get(key)} in category ${e.category}; served as ${e.slug}`)
    }
    taken.set(`${e.category}/${e.slug}`, e.id)
  }

  const anchors = new Map<string, { entry: string; page: number; slug: string }>()
  for (const e of entries.values()) {
    e.pages.forEach((p, i) => {
      const id = typeof p.raw.id === 'string' ? p.raw.id : ''
      if (!id) return
      const full = id.includes(':') ? id : `${e.id.slice(0, e.id.indexOf(':'))}:${id}`
      if (!anchors.has(full)) anchors.set(full, { entry: e.id, page: i, slug: anchorSlug(full) })
    })
  }
  const lib: Library = { categories, allCategories, entries, allEntries, anchors }

  // Category order: tops by (sort, name), each followed by its children by (sort, name).
  const ordered: Category[] = []
  const childrenOf = (id: string) => [...categories.values()].filter((c) => c.parent === id).sort(byName)
  const walk = (c: Category, depth: number) => {
    if (depth > categories.size) return
    ordered.push(c)
    childrenOf(c.id).forEach((k) => walk(k, depth + 1))
  }
  ;[...categories.values()]
    .filter((c) => !c.parent || !categories.has(c.parent))
    .sort(byName)
    .forEach((c) => walk(c, 0))

  fs.rmSync(OUT_BOOK_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_BOOK_DIR, { recursive: true })
  fs.mkdirSync(OUT_IMAGES_DIR, { recursive: true })

  const entriesByCategory = new Map<string, Entry[]>()
  for (const e of [...entries.values()].sort(byName)) {
    const list = entriesByCategory.get(e.category) ?? []
    list.push(e)
    entriesByCategory.set(e.category, list)
  }

  // Page bodies, one file per category so a reader only downloads the chapter they open.
  const hrefCats = new Map<string, string>()
  for (const c of ordered) hrefCats.set(c.id, c.slug)
  for (const c of ordered) {
    const out: Record<string, Json> = {}
    for (const e of entriesByCategory.get(c.id) ?? []) out[e.slug] = convertEntry(lib, e)
    fs.writeFileSync(path.join(OUT_BOOK_DIR, `${c.slug}.generated.json`), JSON.stringify(out))
  }

  // Category text (descriptions, the landing page) uses the same markup and links.
  const textLink = (target: string, ns = NS): string => {
    if (/^https?:\/\//.test(target) || target.startsWith('tip:') || target.startsWith('copy:')) return target
    counts.linksTotal++
    const r = resolveTarget(lib, target, ns)
    if ('href' in r) {
      counts.linksResolved++
      return r.href
    }
    if (r.dead === 'op') counts.linksOpOnly++
    else counts.linksDead.set(`(category text) -> ${target}`, 1)
    return 'dead:' + target
  }
  const markupOut = (s: string) => rewriteLinks(fillTokens(s, undefined, () => undefined), (t) => textLink(t))

  const entryIndex = (e: Entry) => ({
    id: e.slug,
    name: e.name,
    sort: e.sort,
    icon: iconFor(e.icon),
    href: entryHref(lib, e),
    pages: e.pages.length,
    tag: tagOf(e.name),
    collection: collectionOf(e),
  })

  const index = {
    book: { name: book.name, landing: markupOut(book.landing), icon: iconFor(book.icon) },
    categories: ordered.map((c) => ({
      id: c.slug,
      name: c.name,
      description: markupOut(c.description),
      icon: iconFor(c.icon),
      sort: c.sort,
      parent: c.parent ? (categories.get(c.parent)?.slug ?? undefined) : undefined,
      entryCount: entriesByCategory.get(c.id)?.length ?? 0,
      entries: (entriesByCategory.get(c.id) ?? []).map(entryIndex),
    })),
  }
  fs.mkdirSync(OUT_DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DATA_DIR, 'book.generated.json'), JSON.stringify(index))

  // ---------- validation summary ----------
  const pagesTotal = [...counts.pagesByType.values()].reduce((a, b) => a + b, 0)
  const hiddenCats = [...allCategories.values()].filter((c) => restricted(c))
  const hiddenEntries = [...allEntries.values()].filter((e) => !entries.has(e.id))
  const sizeKb = (f: string) => Math.round(fs.statSync(f).size / 1024)
  const lines: string[] = [
    `[export-book] validation summary`,
    `  categories: ${allCategories.size} in the source, ${categories.size} published, ${hiddenCats.length} hidden by requires (${hiddenCats.map((c) => c.slug).join(', ') || 'none'})`,
    `  entries:    ${allEntries.size} in the source, ${entries.size} published, ${hiddenEntries.length} hidden (requires op or inside a hidden category)`,
    `  pages:      ${pagesTotal} published, by type: ${[...counts.pagesByType.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}=${n}`).join(', ')}`,
    `  page ids:   ${anchors.size} anchors`,
    `  unknown page types: ${[...counts.unknownTypes.values()].reduce((a, b) => a + b, 0)}${counts.unknownTypes.size ? ' (' + [...counts.unknownTypes].map(([t, n]) => `${t}=${n}`).join(', ') + ')' : ''}`,
    `  links:      ${counts.linksTotal} total, ${counts.linksResolved} resolved, ${counts.linksExternal} external, ${counts.linksTip} tip, ${counts.linksCopy} copy, ${counts.linksOpOnly} into op-only content (shown as plain text), ${counts.linksDead.size} unresolved (shown as plain text)`,
    `  placeholders: ${counts.tokensFilled} filled from the ability sheet, ${counts.tokensFallback} shown as their fallback words`,
    `  crafting recipes resolved: ${counts.recipes}; not in the mod data (vanilla, shown by name): ${counts.recipesMissing.size}${counts.recipesMissing.size ? ' (' + [...counts.recipesMissing].join(', ') + ')' : ''}`,
    `  item icons: ${counts.iconsResolved} resolved, ${counts.iconsMissing.size} distinct ids without a texture (shown as a name tile)`,
    `  image pages: ${counts.imagesMissing.size} missing images${counts.imagesMissing.size ? ' (' + [...counts.imagesMissing].join(', ') + ')' : ''}`,
    `  data: book.generated.json ${sizeKb(path.join(OUT_DATA_DIR, 'book.generated.json'))} KB, book/ ${fs.readdirSync(OUT_BOOK_DIR).length} files, ${Math.round(fs.readdirSync(OUT_BOOK_DIR).reduce((n, f) => n + fs.statSync(path.join(OUT_BOOK_DIR, f)).size, 0) / 1024)} KB`,
  ]
  console.log(lines.join('\n'))
  if (counts.linksDead.size) {
    const dead = [...counts.linksDead.keys()]
    console.warn(`[export-book] unresolved links (${dead.length}): ${dead.slice(0, 15).join('; ')}${dead.length > 15 ? '; ...' : ''}`)
  }
  if (problems.length) {
    console.warn(`[export-book] ${problems.length} schema problem(s): ${problems.slice(0, 15).join('; ')}${problems.length > 15 ? '; ...' : ''}`)
  }
}

function tagOf(name: string): string | undefined {
  return name.startsWith('[') && name.indexOf(']') > 1 ? name.slice(1, name.indexOf(']')) : undefined
}

/** A suit entry's collection (GuideGroups.collection): the suit's own, else its figure text's "Collection:" line. */
function collectionOf(e: Entry): string | undefined {
  const fig = e.pages.find((p) => p.type === 'figure' && p.raw.suit)
  if (!fig) return undefined
  const s = suits.get(stripNamespace(bareId(String(fig.raw.suit))))
  if (s?.collectionName) return s.collectionName
  const m = /Collection(?:\]\([^)]*\))?:\s*([^\n]+)/.exec(String(fig.raw.text ?? ''))
  return m ? m[1].trim() : undefined
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportBook()
}
