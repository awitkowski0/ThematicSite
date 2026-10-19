// Generates ores.generated.json — a "where do I find X" table derived from the mod's own
// worldgen JSON (configured_feature block targets + placed_feature placement rules). There's
// no map/illustration source to draw from, so this is a data table (Y-level range, vein
// size/frequency), not hand-drawn art — still genuinely useful, just honest about its source.
import fs from 'node:fs'
import path from 'node:path'

import { DATA, findResource, listResources, OUT_DATA_DIR, readJson, requireSourceExists, stripNamespace, titleCase } from './lib'

requireSourceExists()

const CONFIGURED_FEATURE_REL = `${DATA}/worldgen/configured_feature`
const PLACED_FEATURE_REL = `${DATA}/worldgen/placed_feature`

interface RawConfiguredFeature {
  config?: {
    size?: number
    discard_chance_on_air_exposure?: number
    targets?: { state?: { Name?: string } }[]
  }
}

interface RawPlacementStep {
  type?: string
  count?: number
  height?: {
    min_inclusive?: { absolute?: number }
    max_inclusive?: { absolute?: number }
  }
}

interface RawPlacedFeature {
  feature?: string
  placement?: RawPlacementStep[]
}

const VARIANT_SUFFIXES = ['_large', '_small', '_middle', '_upper', '_lower']

function splitMaterialAndVariant(id: string): { material: string; variant?: string } {
  const bare = id.replace(/^ore_/, '')
  for (const suffix of VARIANT_SUFFIXES) {
    if (bare.endsWith(suffix)) {
      return { material: bare.slice(0, -suffix.length), variant: titleCase(suffix.slice(1)) }
    }
  }
  return { material: bare }
}

export function exportOres() {
  const placedFeatures = listResources(PLACED_FEATURE_REL).filter((f) => !f.rel.includes('/'))
  if (placedFeatures.length === 0) {
    console.warn('[export-ores] no worldgen/placed_feature directory found — writing an empty ore table')
    fs.mkdirSync(OUT_DATA_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUT_DATA_DIR, 'ores.generated.json'), '[]\n')
    return
  }

  const ores: {
    id: string
    material: string
    materialName: string
    variant?: string
    blockNames: string[]
    yLevel?: { min: number; max: number }
    veinsPerChunk?: number
    veinSize?: number
  }[] = []

  for (const { rel, file } of placedFeatures) {
    if (!rel.startsWith('ore_')) continue
    const id = path.basename(rel, '.json')
    const placed = readJson<RawPlacedFeature>(file)
    if (!placed.feature) continue

    const configuredFile = findResource(`${CONFIGURED_FEATURE_REL}/${stripNamespace(placed.feature)}.json`)
    const configured = configuredFile ? readJson<RawConfiguredFeature>(configuredFile) : undefined

    const heightStep = placed.placement?.find((s) => s.type === 'minecraft:height_range')
    const countStep = placed.placement?.find((s) => s.type === 'minecraft:count')
    const min = heightStep?.height?.min_inclusive?.absolute
    const max = heightStep?.height?.max_inclusive?.absolute

    const { material, variant } = splitMaterialAndVariant(id)

    ores.push({
      id,
      material,
      materialName: titleCase(material),
      variant,
      blockNames: (configured?.config?.targets ?? []).map((t) => t.state?.Name).filter((n): n is string => Boolean(n)),
      yLevel: min !== undefined && max !== undefined ? { min, max } : undefined,
      veinsPerChunk: countStep?.count,
      veinSize: configured?.config?.size,
    })
  }

  ores.sort((a, b) => a.materialName.localeCompare(b.materialName) || (a.variant ?? '').localeCompare(b.variant ?? ''))

  fs.mkdirSync(OUT_DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DATA_DIR, 'ores.generated.json'), JSON.stringify(ores, null, 2))
  console.log(`[export-ores] wrote ${ores.length} ore placements across ${new Set(ores.map((o) => o.material)).size} materials`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportOres()
}
