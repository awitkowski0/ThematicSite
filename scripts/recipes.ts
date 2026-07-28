// Generic parser for every recipe "type" the mod uses (see the export scripts for how
// this feeds both the top-level suit recipe and the recursive crafting-tree lookup).
import fs from 'node:fs'
import path from 'node:path'

import { RECIPES_DIR, readJson, walkJsonFiles, stripNamespace } from './lib'

interface RawIngredientRef {
  item?: string
  id?: string
  /** Vanilla item tags, e.g. `{"tag": "thematic:charred_logs"}` — an "any of these" slot. */
  tag?: string
  Count?: number
  count?: number
}

type RawIngredientEntry = RawIngredientRef | RawIngredientRef[]

interface RawRecipe {
  type?: string
  result?: string | { item?: string; id?: string; count?: number; Count?: number }
  ingredients?: RawIngredientEntry[]
  ingredient?: RawIngredientEntry
  key?: Record<string, RawIngredientEntry>
  pattern?: string[]
  input1?: RawIngredientRef
  input2?: RawIngredientRef
  input3?: RawIngredientRef
}

export interface ResolvedIngredient {
  id: string // fully namespaced, e.g. "thematic:black_fabric" or "minecraft:iron_ingot"
  count: number
}

export interface RecipeIndexEntry {
  file: string
  resultId: string
  ingredients: ResolvedIngredient[]
}

function refId(ref: RawIngredientEntry | undefined): string | undefined {
  if (!ref) return undefined
  const single = Array.isArray(ref) ? ref[0] : ref
  // A tag slot accepts any item in that tag; surface it as `#tag` so the site can say
  // "any charred log" rather than dropping the ingredient entirely.
  if (single?.tag) return `#${single.tag}`
  return single?.item ?? single?.id
}

function refCount(ref: RawIngredientRef | undefined): number {
  return ref?.Count ?? ref?.count ?? 1
}

function extractResultId(raw: RawRecipe): string | undefined {
  if (typeof raw.result === 'string') return raw.result
  if (raw.result && typeof raw.result === 'object') return raw.result.item ?? raw.result.id
  return undefined
}

// Branches on recipe shape, not just `type`, since a couple of thematic types (suit_bench)
// use the same flat `ingredients` shape as vanilla shapeless. See scripts/lib.ts callers
// for the full rundown of which shape goes with which `type` value.
function extractIngredients(raw: RawRecipe): ResolvedIngredient[] {
  if (raw.type === 'patchouli:shapeless_book_recipe') return []

  const tally = new Map<string, number>()
  const add = (id: string | undefined, count: number) => {
    if (!id || count <= 0) return
    tally.set(id, (tally.get(id) ?? 0) + count)
  }

  if (raw.key && raw.pattern) {
    const symbolCounts = new Map<string, number>()
    for (const ch of raw.pattern.join('')) symbolCounts.set(ch, (symbolCounts.get(ch) ?? 0) + 1)
    for (const [symbol, ref] of Object.entries(raw.key)) {
      add(refId(ref), symbolCounts.get(symbol) ?? 0)
    }
  } else if (raw.ingredients) {
    for (const entry of raw.ingredients) add(refId(entry), 1)
  } else if (raw.ingredient) {
    add(refId(raw.ingredient), 1)
  } else if (raw.input1 || raw.input2 || raw.input3) {
    for (const ref of [raw.input1, raw.input2, raw.input3]) {
      if (ref) add(ref.item ?? ref.id, refCount(ref))
    }
  }

  return [...tally.entries()].map(([id, count]) => ({ id, count }))
}

// A suit's `suit-recipe` field is a *recipe identifier* (which file to load — e.g.
// "thematic:alt_composite_superman" -> recipes/alt_composite_superman.json), which is NOT
// necessarily the same as what that recipe *produces* (that file's own result is
// thematic:composite_superman, a different id). Load directly by filename for this case —
// do not run it through buildRecipeIndex()'s by-result lookup below, which answers a
// different question ("what recipe produces item X", used for the recursive ingredient
// drill-down where all we have is an item id, not a recipe id).
export function resolveRecipeById(recipeIdentifier: string): ResolvedIngredient[] | undefined {
  const file = path.join(RECIPES_DIR, `${stripNamespace(recipeIdentifier)}.json`)
  if (!fs.existsSync(file)) return undefined
  const raw = readJson<RawRecipe>(file)
  const ingredients = extractIngredients(raw)
  return ingredients.length > 0 ? ingredients : undefined
}

// Some items have multiple recipe files that produce them (reversible compact/decompact
// pairs, bill-breaking recipes, etc — ~586 across the mod). We deterministically prefer
// the file named after the item itself (the mod's dominant convention, e.g. batman.json
// for thematic:batman) over any other file that happens to also produce it. This is also
// what fixes the arrow.json/clock.json namespace-collision bug: arrow.json's *result* is
// thematic:arrow, so it's only ever selected as canonical for thematic:arrow, never for
// minecraft:arrow (which has no recipe file at all, and correctly resolves as a raw item).
export function buildRecipeIndex(): Map<string, RecipeIndexEntry> {
  const byResult = new Map<string, RecipeIndexEntry[]>()
  for (const file of walkJsonFiles(RECIPES_DIR)) {
    const raw = readJson<RawRecipe>(file)
    const resultId = extractResultId(raw)
    if (!resultId) continue
    const entry: RecipeIndexEntry = { file, resultId, ingredients: extractIngredients(raw) }
    const list = byResult.get(resultId) ?? []
    list.push(entry)
    byResult.set(resultId, list)
  }

  const canonical = new Map<string, RecipeIndexEntry>()
  for (const [resultId, entries] of byResult) {
    const bareId = stripNamespace(resultId)
    const selfNamed = entries.find((e) => path.basename(e.file, '.json') === bareId)
    canonical.set(resultId, selfNamed ?? entries[0])
  }
  return canonical
}
