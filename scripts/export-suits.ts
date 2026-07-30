// Generates suits.generated.json, collections.generated.json, stats.generated.json, and
// recipes.generated.json (the crafting-tree map used by the "click an ingredient" drill-down
// on suit pages) from the Thematic mod's own source data. Never hand-edit the outputs —
// re-run `npm run export` (or `npm run dev` / `npm run build`, which do it for you).
import fs from 'node:fs'
import path from 'node:path'

import {
  ARMORS_DIR,
  ARMOR_TEXTURES_DIR,
  COLLECTIONS_DIR,
  ITEM_TAGS_DIR,
  OUT_DATA_DIR,
  OUT_ITEMS_DIR,
  OUT_SUITS_DIR,
  PATCHOULI_ABILITIES_DIR,
  PATCHOULI_SUITS_DIR,
  copyIfExists,
  namespaceOf,
  readJson,
  requireSourceExists,
  resolveThematicIcon,
  resolveVanillaIcon,
  sanitizePatchouliText,
  stripNamespace,
  titleCase,
  walkJsonFiles,
} from './lib'
import { ResolvedIngredient, buildRecipeIndex, resolveRecipeById } from './recipes'

requireSourceExists()

// ---------- collections ----------

interface CollectionMeta {
  id: string
  name: string
  description?: string
  importance: number
}

function loadCollections(): Map<string, CollectionMeta> {
  const map = new Map<string, CollectionMeta>()
  for (const file of walkJsonFiles(COLLECTIONS_DIR)) {
    const raw = readJson<{ id: string; name: string; description?: string; importance?: number }>(file)
    map.set(raw.id, {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      importance: raw.importance ?? 9999,
    })
  }
  return map
}

// ---------- armors (ArmorCodec, mirroring ArmorCodec.java's defaults + mergeWithParent) ----------

interface RawAbility {
  identifier: string
  keybind: string
  remove: boolean
}

/**
 * What kind of ability this is, from its keybind — the mod's own authoritative signal.
 * Display names carry a "[PASSIVE]"-style prefix too, but that's presentation and doesn't
 * cover every case (e.g. "[VEHICLE]" exists), so key off the data instead.
 */
export type AbilitySlot = 'active' | 'ultimate' | 'passive' | 'equip' | 'cosmetic' | 'utility' | 'unknown'

function slotFromKeybind(keybind: string): AbilitySlot {
  const key = keybind.replace('key.thematic.', '')
  if (key.startsWith('ability_')) return 'active'
  if (key === 'ultimate') return 'ultimate'
  if (key === 'passive') return 'passive'
  if (key === 'equip_item') return 'equip'
  if (key === 'cosmetic') return 'cosmetic'
  if (key === 'utility') return 'utility'
  return 'unknown'
}

interface RawStat {
  identifier: string
  minimum: number
  maximum: number
}

interface RawArmor {
  id: string
  collection: string
  abilities: RawAbility[]
  stats: RawStat[]
  tier: number
  recipe: string
  wip: boolean
  parent: string | null
  template: boolean
}

// The stats the in-game "Stats Explained" page actually documents, in the order it lists
// them. Anything else in the data (base_regen, base_combat, base_knockbase_resistance) is
// internal tuning that isn't explained to players, so it stays off the site.
const DISPLAY_STATS: { id: string; label: string }[] = [
  { id: 'thematic:base_defense', label: 'Defense' },
  { id: 'thematic:base_utility', label: 'Utility' },
  { id: 'thematic:base_generic_attack', label: 'Attack' },
  { id: 'thematic:base_generic_speed', label: 'Speed' },
]

const DEFAULT_RECIPE = 'thematic:invalid'
const DEFAULT_TIER = 1
const DEFAULT_WIP = true

function loadRawArmors(): Map<string, RawArmor> {
  const map = new Map<string, RawArmor>()
  if (!fs.existsSync(ARMORS_DIR)) return map

  for (const collectionDir of fs.readdirSync(ARMORS_DIR, { withFileTypes: true })) {
    if (!collectionDir.isDirectory()) continue
    const collection = collectionDir.name
    for (const file of walkJsonFiles(path.join(ARMORS_DIR, collection))) {
      const id = path.basename(file, '.json')
      const raw = readJson<{
        abilities?: { identifier: string; keybind?: string; remove?: boolean }[]
        stats?: { identifier: string; minimum?: number; maximum?: number }[]
        tier?: number
        'suit-recipe'?: string
        wip?: boolean
        parent?: string
        template?: boolean
      }>(file)

      if (map.has(id)) {
        console.warn(`[export-suits] duplicate suit id "${id}" — "${file}" overwrites a previous entry`)
      }

      map.set(id, {
        id,
        collection,
        abilities: (raw.abilities ?? []).map((a) => ({ identifier: a.identifier, keybind: a.keybind ?? 'default', remove: a.remove ?? false })),
        stats: (raw.stats ?? []).map((s) => ({ identifier: s.identifier, minimum: s.minimum ?? 0, maximum: s.maximum ?? 0 })),
        tier: raw.tier ?? DEFAULT_TIER,
        recipe: raw['suit-recipe'] ?? DEFAULT_RECIPE,
        wip: raw.wip ?? DEFAULT_WIP,
        parent: raw.parent ? stripNamespace(raw.parent) : null,
        template: raw.template ?? false,
      })
    }
  }
  return map
}

interface MergedArmor {
  id: string
  collection: string
  abilities: { id: string; keybind: string }[] // deduped and ordered after add/replace/remove
  stats: RawStat[]
  tier: number
  recipe: string
  wip: boolean
  template: boolean
}

// Faithful port of ArmorCodec.mergeWithParent (ArmorCodec.java) for the fields the site needs.
function resolveMerged(id: string, raw: Map<string, RawArmor>, cache: Map<string, MergedArmor>, chain: Set<string> = new Set()): MergedArmor {
  const cached = cache.get(id)
  if (cached) return cached

  const self = raw.get(id)
  if (!self) throw new Error(`armor "${id}" is referenced as a parent but has no JSON file`)

  if (chain.has(id)) {
    throw new Error(`circular "parent" chain detected involving "${id}"`)
  }

  if (!self.parent) {
    const merged: MergedArmor = {
      id,
      collection: self.collection,
      abilities: self.abilities.filter((a) => !a.remove).map((a) => ({ id: a.identifier, keybind: a.keybind })),
      stats: self.stats,
      tier: self.tier,
      recipe: self.recipe,
      wip: self.wip,
      template: self.template,
    }
    cache.set(id, merged)
    return merged
  }

  const parentMerged = resolveMerged(self.parent, raw, cache, new Set(chain).add(id))

  const abilities = [...parentMerged.abilities]
  for (const ability of self.abilities) {
    const existingIndex = abilities.findIndex((a) => a.id === ability.identifier)
    if (existingIndex !== -1) abilities.splice(existingIndex, 1)
    if (!ability.remove) abilities.push({ id: ability.identifier, keybind: ability.keybind })
  }

  // Same rule ArmorCodec.mergeWithParent uses for stats: start from the parent's, then let
  // any stat the child declares replace the parent's entry with that identifier.
  const stats = [...parentMerged.stats]
  for (const stat of self.stats) {
    const existingIndex = stats.findIndex((s) => s.identifier === stat.identifier)
    if (existingIndex !== -1) stats.splice(existingIndex, 1)
    stats.push(stat)
  }

  const merged: MergedArmor = {
    id,
    collection: self.collection,
    abilities,
    stats,
    tier: self.tier === DEFAULT_TIER ? parentMerged.tier : self.tier,
    recipe: self.recipe === DEFAULT_RECIPE ? parentMerged.recipe : self.recipe,
    wip: self.wip === DEFAULT_WIP ? parentMerged.wip : self.wip,
    template: self.template, // NOT inherited — ArmorCodec.mergeWithParent keeps the child's own value
  }
  cache.set(id, merged)
  return merged
}

// ---------- patchouli (display names + ability descriptions) ----------

function loadPatchouliSuitNames(): Map<string, string> {
  const map = new Map<string, string>()
  for (const file of walkJsonFiles(PATCHOULI_SUITS_DIR)) {
    const raw = readJson<{ name: string; icon?: string }>(file)
    if (!raw.icon) continue
    map.set(stripNamespace(raw.icon), raw.name)
  }
  return map
}

// The starter suits are ids like "alext9" = Alex, tier 9. Title-casing those yields a
// meaningless "Alext9", so name them properly. Matching the four known starter characters
// explicitly rather than a generic <name>t<number> pattern, which would mangle unrelated
// ids (e.g. x_men's "beast1" -> "Beas" tier 1).
const STARTER_BASES = ['alex', 'steve', 'toby', 'herobrine']

function starterDisplayName(id: string): string | undefined {
  for (const base of STARTER_BASES) {
    const match = new RegExp(`^${base}t(\\d+)$`).exec(id)
    if (match) return `${titleCase(base)} (Tier ${match[1]})`
  }
  return undefined
}

function loadAbilityInfo(): Map<string, { name: string; description?: string }> {
  const map = new Map<string, { name: string; description?: string }>()
  for (const file of walkJsonFiles(PATCHOULI_ABILITIES_DIR)) {
    const id = path.basename(file, '.json')
    const raw = readJson<{ name: string; pages?: unknown[] }>(file)
    const rawDescription = raw.pages?.find((p): p is string => typeof p === 'string')
    map.set(id, { name: raw.name, description: rawDescription ? sanitizePatchouliText(rawDescription) : undefined })
  }
  return map
}

// ---------- item tags ----------

/**
 * Recipes can accept "any item in this tag" (e.g. `#thematic:fibers`). Load the tag files
 * so the site can name the actual options instead of saying "any item from this group".
 */
function loadItemTags(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const file of walkJsonFiles(ITEM_TAGS_DIR)) {
    const raw = readJson<{ values?: (string | { id?: string })[] }>(file)
    const values = (raw.values ?? [])
      .map((v) => (typeof v === 'string' ? v : v.id))
      .filter((v): v is string => typeof v === 'string' && !v.startsWith('#'))
    if (values.length > 0) map.set(`thematic:${path.basename(file, '.json')}`, values)
  }
  return map
}

let itemTags = new Map<string, string[]>()

// ---------- recipes (top-level suit recipe + the recursive crafting-tree map) ----------

export interface RecipeIngredient {
  id: string
  name: string
  count: number
  /** For a tag ingredient: the actual items that satisfy it. */
  options?: string[]
  iconPath?: string
  isSuit?: boolean // full other suit used as a component — link to /suits/$id, don't expand
}

export interface RecipeNode {
  id: string
  name: string
  iconPath?: string
  ingredients: RecipeIngredient[]
}

function makeIngredient(resolved: ResolvedIngredient, releasedSuitIds: Set<string>): RecipeIngredient {
  // `#thematic:charred_logs` means "any item in this tag" — name it that way and don't try
  // to look up an icon or a recipe for a tag.
  if (resolved.id.startsWith('#')) {
    const tag = resolved.id.slice(1)
    const members = (itemTags.get(tag) ?? []).map((m) => titleCase(stripNamespace(m)))
    return {
      id: resolved.id,
      name: `Any ${titleCase(stripNamespace(tag))}`.replace(/s$/, ''),
      count: resolved.count,
      ...(members.length > 0 ? { options: members } : {}),
    }
  }
  const bareId = stripNamespace(resolved.id)
  const isThematic = namespaceOf(resolved.id) === 'thematic'
  const isSuit = isThematic && releasedSuitIds.has(bareId)
  const iconPath = isSuit ? undefined : isThematic ? resolveThematicIcon(bareId) : resolveVanillaIcon(bareId)
  return {
    id: resolved.id,
    name: titleCase(bareId),
    count: resolved.count,
    ...(iconPath ? { iconPath } : {}),
    ...(isSuit ? { isSuit: true } : {}),
  }
}

function resolveTopRecipe(recipeIdentifier: string, releasedSuitIds: Set<string>): RecipeIngredient[] | undefined {
  if (recipeIdentifier === DEFAULT_RECIPE) return undefined
  const ingredients = resolveRecipeById(recipeIdentifier)
  if (!ingredients) return undefined
  return ingredients.map((r) => makeIngredient(r, releasedSuitIds))
}

// Reachability walk from every suit's top-level ingredients, one level of ingredients
// resolved per discovered thematic item — the client recurses further by looking up each
// ingredient's own id in this same flat map. Visited-set doubles as the cycle guard (a real
// cycle exists: thematic:5 <-> thematic:10, the in-game currency bills).
function buildRecipeGraph(
  suits: { recipe?: RecipeIngredient[] }[],
  recipeIndex: Map<string, { ingredients: ResolvedIngredient[] }>,
  releasedSuitIds: Set<string>,
): Record<string, RecipeNode> {
  const nodes: Record<string, RecipeNode> = {}
  const discovered = new Set<string>()
  const queue: string[] = []

  for (const suit of suits) {
    for (const ingredient of suit.recipe ?? []) {
      if (!discovered.has(ingredient.id)) {
        discovered.add(ingredient.id)
        queue.push(ingredient.id)
      }
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    if (namespaceOf(id) !== 'thematic') continue // vanilla items are always leaves here
    const bareId = stripNamespace(id)
    if (releasedSuitIds.has(bareId)) continue // suit-as-ingredient: leaf, links to /suits/$id

    const entry = recipeIndex.get(id)
    if (!entry || entry.ingredients.length === 0) continue // raw/base thematic item, no further recipe

    const ingredients = entry.ingredients.map((r) => makeIngredient(r, releasedSuitIds))
    nodes[id] = { id, name: titleCase(bareId), iconPath: resolveThematicIcon(bareId), ingredients }

    for (const ingredient of entry.ingredients) {
      if (!discovered.has(ingredient.id)) {
        discovered.add(ingredient.id)
        queue.push(ingredient.id)
      }
    }
  }

  return nodes
}

// ---------- main ----------

export function exportSuits() {
  const collections = loadCollections()
  const rawArmors = loadRawArmors()
  const patchouliNames = loadPatchouliSuitNames()
  const abilityInfo = loadAbilityInfo()
  const recipeIndex = buildRecipeIndex()
  itemTags = loadItemTags()

  const mergeCache = new Map<string, MergedArmor>()

  fs.rmSync(OUT_SUITS_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_ITEMS_DIR, { recursive: true })
  fs.mkdirSync(OUT_DATA_DIR, { recursive: true })

  // Pass 1: every real suit (template excluded, WIP included — WIP suits are still shown
  // on the site behind a toggle, see /suits, mirroring the in-game "Hide Suits" config).
  // This id set is also what "is this recipe ingredient actually a whole other suit"
  // checks against, regardless of that suit's own WIP status.
  const allIds: string[] = []
  for (const id of rawArmors.keys()) {
    const merged = resolveMerged(id, rawArmors, mergeCache)
    if (!merged.template) allIds.push(id)
  }
  const releasedSuitIds = new Set(allIds)

  // Pass 2: build each suit's full record, including its top-level recipe.
  const suits: {
    id: string
    name: string
    collection: string
    collectionName: string
    tier: number
    wip: boolean
    /** Base suit this is an alt of, if any — crafting an alt also consumes the base. */
    parent?: string
    stats: { id: string; label: string; minimum: number; maximum: number }[]
    abilities: { id: string; name: string; slot: AbilitySlot; description?: string }[]
    recipe?: RecipeIngredient[]
    texturePath?: string
    shinyTexturePath?: string
  }[] = []
  let missingPatchouliCount = 0

  for (const id of allIds) {
    const merged = mergeCache.get(id)!
    const displayName = patchouliNames.get(id)
    if (!displayName) missingPatchouliCount++

    const collectionMeta = collections.get(merged.collection)

    let texturePath: string | undefined
    let shinyTexturePath: string | undefined
    if (copyIfExists(path.join(ARMOR_TEXTURES_DIR, `${id}.png`), path.join(OUT_SUITS_DIR, `${id}.png`))) {
      texturePath = `/suits/${id}.png`
    }
    if (copyIfExists(path.join(ARMOR_TEXTURES_DIR, `${id}_shiny.png`), path.join(OUT_SUITS_DIR, `${id}_shiny.png`))) {
      shinyTexturePath = `/suits/${id}_shiny.png`
    }

    suits.push({
      id,
      name: displayName ?? starterDisplayName(id) ?? titleCase(id),
      collection: merged.collection,
      collectionName: collectionMeta?.name ?? titleCase(merged.collection),
      tier: merged.tier,
      wip: merged.wip,
      ...(rawArmors.get(id)?.parent ? { parent: rawArmors.get(id)!.parent! } : {}),
      stats: DISPLAY_STATS.flatMap(({ id: statId, label }) => {
        const stat = merged.stats.find((s) => s.identifier === statId)
        return stat ? [{ id: statId, label, minimum: stat.minimum, maximum: stat.maximum }] : []
      }),
      abilities: merged.abilities.map(({ id: abilityId, keybind }) => ({
        id: abilityId,
        name: abilityInfo.get(abilityId)?.name ?? titleCase(abilityId),
        slot: slotFromKeybind(keybind),
        description: abilityInfo.get(abilityId)?.description,
      })),
      recipe: resolveTopRecipe(merged.recipe, releasedSuitIds),
      texturePath,
      shinyTexturePath,
    })
  }

  suits.sort((a, b) => a.name.localeCompare(b.name))

  // Derive the collection list from the collections suits ACTUALLY reference (their folder
  // name), not from the collections/*.json files — those two don't always agree. e.g. the
  // armors/justice_league_international/ folder's metadata file declares id
  // "jlinternational", so keying off the metadata id alone silently dropped all 24 of its
  // suits from the site. Falling back to a title-cased folder name guarantees no suit is
  // ever invisible just because its metadata is missing or mismatched.
  const referencedCollectionIds = [...new Set(suits.map((s) => s.collection))]
  const collectionsOut = referencedCollectionIds
    .map((id) => collections.get(id) ?? { id, name: titleCase(id), description: undefined, importance: 9999 })
    .sort((a, b) => a.importance - b.importance || a.name.localeCompare(b.name))

  const unmatched = referencedCollectionIds.filter((id) => !collections.has(id))
  if (unmatched.length > 0) {
    console.warn(
      `[export-suits] ${unmatched.length} collection folder(s) have no matching collections/<folder>.json — ` +
        `using a title-cased folder name instead: ${unmatched.join(', ')}`,
    )
  }

  const recipeGraph = buildRecipeGraph(suits, recipeIndex, releasedSuitIds)

  fs.writeFileSync(path.join(OUT_DATA_DIR, 'suits.generated.json'), JSON.stringify(suits, null, 2))
  fs.writeFileSync(path.join(OUT_DATA_DIR, 'collections.generated.json'), JSON.stringify(collectionsOut, null, 2))
  fs.writeFileSync(path.join(OUT_DATA_DIR, 'recipes.generated.json'), JSON.stringify(recipeGraph, null, 2))
  const releasedCount = suits.filter((s) => !s.wip).length
  const releasedCollectionCount = collectionsOut.filter((c) => suits.some((s) => s.collection === c.id && !s.wip)).length
  fs.writeFileSync(
    path.join(OUT_DATA_DIR, 'stats.generated.json'),
    JSON.stringify(
      {
        suitCount: releasedCount,
        // Base characters only — alts are versions of these, and 529 overstates the roster.
        characterCount: suits.filter((s) => !s.wip && !s.parent).length,
        collectionCount: releasedCollectionCount,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )

  console.log(`[export-suits] wrote ${suits.length} suits (${releasedCount} released, ${suits.length - releasedCount} WIP) across ${collectionsOut.length} collections`)
  console.log(`[export-suits] crafting-tree map covers ${Object.keys(recipeGraph).length} distinct thematic components`)
  if (missingPatchouliCount > 0) {
    console.log(`[export-suits] ${missingPatchouliCount} suit(s) have no Patchouli guidebook entry — using title-cased id as their display name`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportSuits()
}
