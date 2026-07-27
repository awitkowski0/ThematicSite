import suitsData from '../data/suits.generated.json'
import collectionsData from '../data/collections.generated.json'
import recipeGraphData from '../data/recipes.generated.json'

export interface SuitAbility {
  id: string
  name: string
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

export function suitsByCollection(): { collection: CollectionMeta; suits: Suit[] }[] {
  return collections
    .map((collection) => ({
      collection,
      suits: suits.filter((s) => s.collection === collection.id).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.suits.length > 0)
}
