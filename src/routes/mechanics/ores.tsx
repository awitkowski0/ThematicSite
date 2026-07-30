import { createFileRoute, Link } from '@tanstack/react-router'

import { Ore, oresByMaterial } from '../../lib/ores'
import { YLevelBar } from '../../components/bars'

export const Route = createFileRoute('/mechanics/ores')({
  head: () => ({
    meta: [{ title: 'Ores — Thematic Mechanics' }, { name: 'description', content: 'What depth to mine at for every ore Thematic adds, and how common each one is.' }],
  }),
  component: OresPage,
})

function OresPage() {
  const groups = oresByMaterial()

  return (
    <div>
      <Link to="/mechanics" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Mechanics
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Ores</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        What depth to dig at for each ore Thematic adds, and how common it is down there.
      </p>

      <div className="mt-8 space-y-6">
        {groups.map((group) => (
          <section key={group.material}>
            <h2 className="font-semibold">{group.materialName}</h2>
            <ul className="mt-2 space-y-2">
              {group.ores.map((ore) => (
                <li key={ore.id} className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 p-2 text-sm dark:border-neutral-800">
                  {ore.variant && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-900">{ore.variant}</span>}
                  {ore.yLevel ? <YLevelBar min={ore.yLevel.min} max={ore.yLevel.max} /> : <span className="text-xs text-neutral-500">Y-level unknown</span>}
                  {ore.veinsPerChunk !== undefined && <span className="text-xs text-neutral-500">~{ore.veinsPerChunk} veins/chunk</span>}
                  {ore.veinSize !== undefined && <span className="text-xs text-neutral-500">size {ore.veinSize}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
