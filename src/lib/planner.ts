// Works out everything you need to craft N copies of a suit — including the base suit an
// alt is built from — and where the raw materials come from.
import { ores } from './ores'
import { Suit, getRecipeNode, getSuit } from './suits'

/** Gamerule `shinyChance`, default 0.03 (ThematicGameRules). Server-tunable. */
export const SHINY_CHANCE = 0.03

export interface MaterialNeed {
  id: string
  name: string
  total: number
  iconPath?: string
  /** True when this is a whole suit consumed as a component. */
  isSuit?: boolean
  /** Where it comes from, if we can say. */
  source?: MaterialSource
}

export interface MaterialSource {
  kind: 'ore' | 'vanilla' | 'crafted' | 'structure' | 'mob' | 'unknown'
  detail: string
}

import { isVanilla, stripNamespace as stripNs } from './format'

/**
 * Ore lookup is by name match rather than a hard id link: the mined block is
 * `thematic:titanium_ore` while the crafting ingredient is `thematic:titanium_ingot`, so we
 * match on the material stem the worldgen export already derives.
 */
function oreSourceFor(itemId: string): MaterialSource | undefined {
  const bare = stripNs(itemId)
  const match = ores.find((o) => bare.startsWith(o.material) || o.blockNames.some((b) => stripNs(b) === bare))
  if (!match?.yLevel) return undefined
  const freq = match.veinsPerChunk ? `, ~${match.veinsPerChunk} veins/chunk` : ''
  return { kind: 'ore', detail: `Mine Y ${match.yLevel.min} to ${match.yLevel.max}${freq}` }
}

// Transcribed from the in-game guidebook (Mobs -> "Blood & Chemicals", the Structures
// category, and Getting Started -> "Ores"), which explains where these come from in prose
// that no data file captures. Keyed without namespace so it covers both minecraft: and
// thematic: ids.
const KNOWN_SOURCES: Record<string, MaterialSource> = {
  alien_blood_splatter: { kind: 'structure', detail: 'Inside Spaceship structures (Badlands and Desert)' },
  alien_blood_vial: { kind: 'structure', detail: 'Centrifuge an Empty Vial with Alien Blood Splatter from a Spaceship' },
  blood: { kind: 'mob', detail: 'Drops from Goats (75%), Villagers (50%), Cows/Pigs/Sheep (15%)' },
  cosmic_debris: { kind: 'structure', detail: 'Inside the Meteor structure (Plains)' },
  ooze: { kind: 'structure', detail: 'Ooze Pools, Y 60-200' },
  ooze_canister: { kind: 'structure', detail: 'Fill at an Ooze Pool (Y 60-200) or Ooze Truck' },
  electrolytic_solution: { kind: 'mob', detail: 'Trade with a S.T.A.R. Labs Scientist' },
  starro_clone: { kind: 'structure', detail: 'Ocean floor in Deep Ocean biomes' },

  // Common vanilla materials — worth spelling out since a plan can call for hundreds.
  iron_ingot: { kind: 'vanilla', detail: 'Smelt iron ore — most common around Y 16, and Y 232 in mountains' },
  gold_ingot: { kind: 'vanilla', detail: 'Smelt gold ore — Y -16 or below, or badlands at any depth' },
  gold_block: { kind: 'vanilla', detail: '9 gold ingots each' },
  netherite_ingot: { kind: 'vanilla', detail: 'Ancient Debris in the Nether, Y 8-22' },
  diamond: { kind: 'vanilla', detail: 'Y -59 to 16, best around Y -59' },
  coal: { kind: 'vanilla', detail: 'Common above Y 0, peaks around Y 96' },
  redstone: { kind: 'vanilla', detail: 'Y -64 to 16, best below Y -59' },
  quartz: { kind: 'vanilla', detail: 'Nether quartz ore, anywhere in the Nether' },
  leather: { kind: 'vanilla', detail: 'Cows, horses, or 4 rabbit hide' },
  paper: { kind: 'vanilla', detail: '3 sugar cane makes 3 paper' },
  glass: { kind: 'vanilla', detail: 'Smelt sand' },
  glass_pane: { kind: 'vanilla', detail: '6 glass makes 16 panes' },
  golden_apple: { kind: 'vanilla', detail: '8 gold ingots around an apple' },
  string: { kind: 'vanilla', detail: 'Spiders, or break cobwebs' },
  bone: { kind: 'vanilla', detail: 'Skeletons' },
  tinted_glass: { kind: 'vanilla', detail: 'Amethyst shards around glass — geodes, Y -64 to 30' },
  amethyst_shard: { kind: 'vanilla', detail: 'Amethyst geodes, Y -64 to 30' },
  blue_dye: { kind: 'vanilla', detail: 'Lapis lazuli, or cornflowers' },
  red_dye: { kind: 'vanilla', detail: 'Poppies, roses, or beetroot' },
  yellow_dye: { kind: 'vanilla', detail: 'Dandelions or sunflowers' },
  green_dye: { kind: 'vanilla', detail: 'Smelt cactus' },
  black_dye: { kind: 'vanilla', detail: 'Ink sacs from squid, or wither roses' },
  white_dye: { kind: 'vanilla', detail: 'Bone meal from bones' },
}

function sourceFor(itemId: string, craftable: boolean): MaterialSource {
  const known = KNOWN_SOURCES[stripNs(itemId)]
  if (known) return known
  const ore = oreSourceFor(itemId)
  if (ore) return ore
  if (craftable) return { kind: 'crafted', detail: 'Made from other materials — see its recipe' }
  if (isVanilla(itemId)) return { kind: 'vanilla', detail: 'Vanilla Minecraft item' }
  return { kind: 'unknown', detail: 'Found in world or dropped — check the guidebook' }
}

export interface PlanResult {
  /** Raw materials once everything craftable is broken down. */
  raw: MaterialNeed[]
  /** The direct ingredients, one level down, before expansion. */
  direct: MaterialNeed[]
  /** Suits (usually the alt's base) consumed along the way. */
  suitsConsumed: MaterialNeed[]
  /** Which suits' recipes were rolled in, in order (base first). */
  chain: Suit[]
}

/** Walks the alt -> base chain so an alt's plan includes the suit it's built from. */
function suitChain(suit: Suit): Suit[] {
  const chain: Suit[] = []
  const seen = new Set<string>()
  let current: Suit | undefined = suit
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    chain.unshift(current)
    current = current.parent ? getSuit(current.parent) : undefined
  }
  return chain
}

export function planSuit(suit: Suit, quantity: number, expand: boolean): PlanResult {
  const chain = suitChain(suit)

  const direct = new Map<string, MaterialNeed>()
  const raw = new Map<string, MaterialNeed>()
  const suitsConsumed = new Map<string, MaterialNeed>()

  const addTo = (map: Map<string, MaterialNeed>, need: MaterialNeed) => {
    const existing = map.get(need.id)
    if (existing) existing.total += need.total
    else map.set(need.id, { ...need })
  }

  // Guard against a recipe cycle (the in-game currency items form a real one) and against
  // pathological depth on the handful of suits that use other suits as components.
  const expandItem = (id: string, name: string, count: number, iconPath: string | undefined, seen: Set<string>) => {
    const node = expand ? getRecipeNode(id) : undefined
    if (!node || seen.has(id)) {
      addTo(raw, { id, name, total: count, iconPath, source: sourceFor(id, Boolean(node)) })
      return
    }
    const nextSeen = new Set(seen).add(id)
    for (const ingredient of node.ingredients) {
      expandItem(ingredient.id, ingredient.name, ingredient.count * count, ingredient.iconPath, nextSeen)
    }
  }

  for (const link of chain) {
    for (const ingredient of link.recipe ?? []) {
      const need: MaterialNeed = {
        id: ingredient.id,
        name: ingredient.name,
        total: ingredient.count * quantity,
        iconPath: ingredient.iconPath,
        isSuit: ingredient.isSuit,
      }
      addTo(direct, need)
      if (ingredient.isSuit) {
        addTo(suitsConsumed, need)
        addTo(raw, { ...need, source: { kind: 'crafted', detail: 'Craft this suit separately' } })
      } else {
        expandItem(ingredient.id, ingredient.name, ingredient.count * quantity, ingredient.iconPath, new Set())
      }
    }
  }

  const bySize = (a: MaterialNeed, b: MaterialNeed) => b.total - a.total || a.name.localeCompare(b.name)
  return {
    raw: [...raw.values()].sort(bySize),
    direct: [...direct.values()].sort(bySize),
    suitsConsumed: [...suitsConsumed.values()].sort(bySize),
    chain,
  }
}

/**
 * Each *craft* is a shiny roll, and making an alt means two crafts: the base suit, then the
 * alt itself. So an alt gets two chances per finished suit — which is why grinding through
 * an alt is a better shiny pipeline than crafting a base suit over and over.
 */
export function rollsPerUnit(chain: Suit[]): number {
  return Math.max(1, chain.length)
}

export interface ShinyOdds {
  /** Chance of at least one shiny across `quantity` crafts. */
  atLeastOne: number
  /** Crafts needed for a 50% / 90% / 99% shot. */
  for50: number
  for90: number
  for99: number
  /** Average crafts per shiny. */
  expected: number
}

export function shinyOdds(quantity: number, chance = SHINY_CHANCE): ShinyOdds {
  const miss = 1 - chance
  const needFor = (p: number) => Math.ceil(Math.log(1 - p) / Math.log(miss))
  return {
    atLeastOne: 1 - Math.pow(miss, quantity),
    for50: needFor(0.5),
    for90: needFor(0.9),
    for99: needFor(0.99),
    expected: Math.round(1 / chance),
  }
}
