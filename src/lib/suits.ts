import suitsData from '../data/suits.generated.json'
import collectionsData from '../data/collections.generated.json'
import recipeGraphData from '../data/recipes.generated.json'

export type AbilitySlot = 'active' | 'ultimate' | 'passive' | 'equip' | 'cosmetic' | 'utility' | 'unknown'

export interface SuitAbility {
  id: string
  name: string
  /** From the ability's keybind in the mod's data — not parsed from the display name. */
  slot: AbilitySlot
  description?: string
}

export interface RecipeIngredient {
  id: string
  name: string
  count: number
  iconPath?: string
  isSuit?: boolean
}

export interface RecipeNode {
  id: string
  name: string
  iconPath?: string
  ingredients: RecipeIngredient[]
}

const recipeGraph = recipeGraphData as Record<string, RecipeNode>

// Looks up how a crafting-tree ingredient is itself made, one level at a time — the
// recipe drill-down UI calls this again on whatever it returns to go deeper. Returns
// undefined for raw/base items (no further recipe) — the graph only contains items that
// are reachable from some suit's own recipe, see scripts/export-suits.ts.
export function getRecipeNode(itemId: string): RecipeNode | undefined {
  return recipeGraph[itemId]
}

export interface SuitStat {
  id: string
  label: string
  minimum: number
  maximum: number
}

export interface Suit {
  id: string
  name: string
  collection: string
  collectionName: string
  tier: number
  wip: boolean
  /** Base suit this is an alt of — crafting an alt also consumes one of these. */
  parent?: string
  stats: SuitStat[]
  abilities: SuitAbility[]
  recipe?: RecipeIngredient[]
  texturePath?: string
  shinyTexturePath?: string
}

export interface CollectionMeta {
  id: string
  name: string
  description?: string
  importance: number
}

export const suits = suitsData as Suit[]
export const collections = collectionsData as CollectionMeta[]

const suitsById = new Map(suits.map((s) => [s.id, s]))

export function getSuit(id: string): Suit | undefined {
  return suitsById.get(id)
}

// Deterministic accent color per collection, so suits from the same universe share a hue
// and the gallery reads as grouped rather than as an undifferentiated wall of text. The
// mod's armor textures are UV sheets for runtime-posed 3D models, not portraits — there's
// no honest thumbnail to show, so color-coding carries the visual weight instead.
export function accentForCollection(collectionId: string): string {
  let hash = 0
  for (let i = 0; i < collectionId.length; i++) {
    hash = (hash * 31 + collectionId.charCodeAt(i)) | 0
  }
  const hue = Math.abs(hash) % 360
  // Mid lightness/saturation keeps it legible against both the light and dark backgrounds.
  return `hsl(${hue} 55% 55%)`
}

// Starter suits are the tutorial-ish ones you're given rather than chase, so they sit at
// the end regardless of the collection ordering the mod declares.
const LAST_COLLECTIONS = new Set(['starters'])

export interface SuitFamily {
  /** The character — a suit with no parent. */
  base: Suit
  /** Every alt built from it, name-sorted. */
  variants: Suit[]
}

/** Groups alts under the character they're built from, so 529 suits read as 103 characters. */
export function familiesByCollection(): { collection: CollectionMeta; families: SuitFamily[] }[] {
  const variantsByParent = new Map<string, Suit[]>()
  for (const suit of suits) {
    if (!suit.parent) continue
    const list = variantsByParent.get(suit.parent) ?? []
    list.push(suit)
    variantsByParent.set(suit.parent, list)
  }

  return collections
    .slice()
    .sort((a, b) => {
      const aLast = LAST_COLLECTIONS.has(a.id) ? 1 : 0
      const bLast = LAST_COLLECTIONS.has(b.id) ? 1 : 0
      return aLast - bLast || a.importance - b.importance || a.name.localeCompare(b.name)
    })
    .map((collection) => ({
      collection,
      families: suits
        .filter((s) => s.collection === collection.id && !s.parent)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((base) => ({
          base,
          variants: (variantsByParent.get(base.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
        })),
    }))
    .filter((group) => group.families.length > 0)
}

export function variantsOf(suitId: string): Suit[] {
  return suits.filter((s) => s.parent === suitId).sort((a, b) => a.name.localeCompare(b.name))
}

/** Released suits (WIP hidden), name-sorted — the default view everywhere. */
export function releasedSuits(extra?: (s: Suit) => boolean): Suit[] {
  return suits.filter((s) => !s.wip && (!extra || extra(s))).sort((a, b) => a.name.localeCompare(b.name))
}

/** Released base characters only, i.e. excluding alts. */
export function characters(): Suit[] {
  return releasedSuits((s) => !s.parent)
}
