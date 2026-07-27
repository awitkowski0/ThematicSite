import oresData from '../data/ores.generated.json'

export interface Ore {
  id: string
  material: string
  materialName: string
  variant?: string
  blockNames: string[]
  yLevel?: { min: number; max: number }
  veinsPerChunk?: number
  veinSize?: number
}

export const ores = oresData as Ore[]

export function oresByMaterial(): { material: string; materialName: string; ores: Ore[] }[] {
  const map = new Map<string, Ore[]>()
  for (const ore of ores) {
    const list = map.get(ore.material) ?? []
    list.push(ore)
    map.set(ore.material, list)
  }
  return [...map.entries()]
    .map(([material, list]) => ({ material, materialName: list[0].materialName, ores: list }))
    .sort((a, b) => a.materialName.localeCompare(b.materialName))
}
