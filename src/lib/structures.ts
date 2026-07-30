// Structure data read out of the mod's worldgen JSON, loot tables, structure NBT and the
// wave-spawner Java. The in-game guidebook only gives a one-line description each, and in
// several places its numbers disagree with what the code actually does — where they
// conflict, the values here are the code's, and the difference is called out in `note`.
//
// Hand-transcribed rather than exported: spacing/separation live in worldgen files, drop
// rates in loot tables, mob health in Java constructors, and spawner behaviour in
// WaveSpawnerLogic — no single source to generate from. Re-check when worldgen changes.

export interface LootEntry {
  item: string
  /** Percent chance per roll, or a flat count when guaranteed. */
  chance?: number
  count?: string
  note?: string
}

export interface ThematicStructure {
  id: string
  name: string
  /** What the guidebook calls it, when that differs from the worldgen id. */
  worldgenId?: string
  dimension: 'Overworld' | 'Nether'
  biomes: string
  /** One placement attempt per N×N chunks. */
  spacing?: number
  /** Extra multiplier on top of spacing, where the structure set applies one. */
  frequency?: number
  rarity: string
  yLevel?: string
  summary: string
  loot?: LootEntry[]
  mob?: { name: string; health: number; count: string; how: string }
  /** Chunks of area per successful placement — drives the rarity bar. */
  chunksPerAttempt: number
  /** Y range, for the depth bar. */
  yRange?: { min: number; max: number }
  /** Ingredients you mine out of the structure itself rather than loot from a chest. */
  blocks?: LootEntry[]
  /** Where the guidebook and the code disagree. */
  note?: string
  tips?: string[]
}

export const WAVE_SPAWNER_NOTE =
  'Wave spawners trigger on proximity, not interaction — walking within range starts the fight. On completion the rewards drop as loose items and the spawner goes on a 2-hour cooldown; anyone who took part is permanently locked out of looting that one again, so it is not a farmable respawn.'

export const STRUCTURES: ThematicStructure[] = [
  {
    id: 'spaceship',
    chunksPerAttempt: 3600,
    name: 'Spaceship',
    dimension: 'Overworld',
    biomes: 'Desert, Badlands, Eroded Badlands',
    spacing: 60,
    rarity: 'One attempt per 60×60 chunks (about 960×960 blocks)',
    summary:
      'The main source of Willpower Shards, and where Alien Blood Splatter is found. A wave spawner inside summons Manhunters when you get close.',
    mob: { name: 'Manhunter', health: 120, count: '3 per player, up to 15', how: 'Wave spawner, triggers within 100 blocks' },
    loot: [{ item: 'Willpower Shard', count: '3-6 guaranteed', note: 'Dropped on clearing the wave' }],
    note: 'The guidebook says Manhunters have 220 HP and drop 1-3 Willpower Shards. The data says 120 HP and 3-6 shards.',
    tips: [
      '1 in 4 spaceships contains a Willpower Battery block — the other three are identical without it.',
      'Manhunters are not a boss wave, so they get no health or damage multiplier.',
    ],
  },
  {
    id: 'arkillos_arena',
    chunksPerAttempt: 14400,
    name: "Arkillo's Arena",
    dimension: 'Overworld',
    biomes: 'Stony Peaks, Stony Shore, Jagged Peaks, Frozen Peaks, Windswept Hills and Gravelly Hills',
    spacing: 120,
    rarity: 'One attempt per 120×120 chunks (about 1920×1920 blocks) — the rarest surface structure',
    summary: 'A boss arena. Getting within 64 blocks summons Arkillo as a single boss-scaled fight.',
    mob: { name: 'Arkillo', health: 1500, count: '1 (boss)', how: 'Wave spawner, triggers within 64 blocks' },
    loot: [
      { item: 'Fear Battery', chance: 70 },
      { item: 'Arkillo (suit ingredient)', chance: 30 },
    ],
    note: 'The guidebook lists Arkillo at 1024 HP. The code gives him 1000 base with a 1.5× boss multiplier, so 1500.',
    tips: ['You get exactly one of the two drops, not both — 70/30 either way.'],
  },
  {
    id: 'sentinel',
    chunksPerAttempt: 5184,
    name: 'Abandoned Street',
    worldgenId: 'sentinel',
    dimension: 'Overworld',
    biomes: 'Anywhere plains villages generate',
    spacing: 72,
    rarity: 'One attempt per 72×72 chunks (about 1152×1152 blocks)',
    summary: 'The only source of Mutant Genes, needed for Wolverine and Deadpool. A Sentinel stands in the street.',
    mob: { name: 'Sentinel', health: 500, count: '1', how: 'Placed directly in the structure — no spawner' },
    loot: [
      { item: 'Mutant Gene', chance: 40 },
      { item: 'Technology', chance: 35, count: '1-3' },
      { item: 'Advanced Technology', chance: 5, count: '1-2' },
      { item: 'Redstone', chance: 100, count: '4-9' },
    ],
    note: 'The guidebook says Mutant Gene is a 15% drop. The loot table says 40%.',
    tips: ['The Sentinel can despawn — it is not marked persistent, so deal with it while you are there.'],
  },
  {
    id: 'soul_sand_valley_ruin',
    chunksPerAttempt: 1936,
    yRange: { min: 33, max: 115 },
    name: 'Soul Sand Valley Ruin',
    dimension: 'Nether',
    biomes: 'Soul Sand Valley',
    spacing: 22,
    frequency: 0.25,
    rarity: 'Roughly one per 44×44 chunks (about 704×704 blocks) once the 25% frequency roll is applied',
    yLevel: 'Y 33 to 115, biased toward the bottom',
    summary: 'An underground Nether ruin full of Suspicious Soul Soil. Bring a brush — this is where Souls come from.',
    loot: [
      { item: 'Soul', chance: 14 },
      { item: 'Gunpowder', chance: 21.5 },
      { item: 'Ghast Tear', chance: 21.5 },
      { item: 'Coal', chance: 21.5 },
      { item: 'Bone', chance: 21.5 },
    ],
    tips: [
      'There are 57 brushable blocks per ruin, so expect about 8 Souls if you brush all of them.',
      'A Wither Skeleton with 499 HP is placed inside and will not despawn.',
    ],
  },
  {
    id: 'meteor',
    chunksPerAttempt: 4096,
    name: 'Meteor',
    dimension: 'Overworld',
    biomes: 'Plains, Beach, Forest',
    spacing: 64,
    rarity: 'One attempt per 64×64 chunks (about 1024×1024 blocks)',
    summary: 'A small crater holding Cosmic Debris blocks — the material behind the Fantastic Four suits.',
    blocks: [{ item: 'Cosmic Debris', count: '2 per meteor', note: 'Mine the 2 Cosmic Debris blocks — pickaxe required' }],
    tips: [
      'Mr. Fantastic alone needs 4 Cosmic Debris, so you need at least two meteors.',
      'Silk Touch gives you the block instead of the debris — mine it normally.',
    ],
  },
  {
    id: 'rock',
    chunksPerAttempt: 51200,
    yRange: { min: -30, max: -10 },
    name: 'Rock of Eternity',
    dimension: 'Overworld',
    biomes: 'Lush Caves',
    spacing: 16,
    frequency: 0.005,
    rarity: 'By far the rarest — only 0.5% of attempts succeed, so roughly one every few thousand blocks',
    yLevel: 'Y -30 to -10',
    summary: "Shazam's chamber. Right-click the throne while it sits on the Engraved Lodestone to claim the Book of Champions.",
    blocks: [{ item: 'Book of Champions', count: '1', note: "Right-click Shazam's Throne while it stands on the Engraved Lodestone" }],
    tips: [
      'No hostile mobs spawn inside its bounding box.',
      'The throne only gives the book while it stands on the Engraved Lodestone — elsewhere it is just a chair.',
      'The barrels and bookshelves inside are decorative and generate empty.',
    ],
  },
  {
    id: 'ooze_truck',
    chunksPerAttempt: 3,
    yRange: { min: 60, max: 200 },
    name: 'Ooze Pools & Trucks',
    dimension: 'Overworld',
    biomes: 'Trucks near plains villages; pools in every Overworld biome',
    spacing: 94,
    rarity: 'Trucks: one attempt per 94×94 chunks. Pools: a 1-in-3 chance per chunk, so they are common',
    yLevel: 'Pools spawn Y 60 to 200',
    summary: 'Ooze is used in several suits. Pools are far easier to find than trucks — the truck is just a themed cache of 40 ooze blocks.',
    blocks: [{ item: 'Ooze', count: '40 blocks per truck', note: 'Collect with an Ooze Canister; pools hold plenty more' }],
    tips: [
      'Standing in ooze gives Slowness II and Blindness for 2 seconds, refreshing while you stay in it.',
      'Craft an Ooze Canister (steel ingot, glass pane, steel ingot) and right-click a source block to collect it.',
      'Pools never generate underwater.',
    ],
  },
  {
    id: 'starro',
    chunksPerAttempt: 75,
    name: 'Starro Clones',
    dimension: 'Overworld',
    biomes: 'Deep Ocean, Deep Cold Ocean, Deep Lukewarm Ocean, Deep Frozen Ocean',
    rarity: 'A 1-in-75 chance per chunk, on the ocean floor',
    summary: 'Thin plates on the deep ocean floor, used for the Jarro block and the Starro Controlled alts.',
    tips: ['They give off a faint light, which helps when scanning a dark ocean floor.'],
  },
]

export function getStructure(id: string): ThematicStructure | undefined {
  return STRUCTURES.find((s) => s.id === id)
}
