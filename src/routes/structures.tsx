import { createFileRoute, Link } from '@tanstack/react-router'

import { STRUCTURES, ThematicStructure, WAVE_SPAWNER_NOTE } from '../lib/structures'
import { ChanceBar, RarityBar, YLevelBar } from '../components/bars'

export const Route = createFileRoute('/structures')({
  head: () => ({
    meta: [
      { title: 'Structures — Thematic' },
      { name: 'description', content: 'Every structure Thematic adds: where it spawns, how rare it is, what it drops, and what fights you there.' },
    ],
  }),
  component: StructuresPage,
})

function ItemList({ title, entries, hint }: { title: string; entries: ThematicStructure['loot']; hint?: string }) {
  if (!entries?.length) return null
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      <ul className="mt-2 space-y-1.5 text-sm">
        {entries.map((l) => (
          <li key={l.item} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="w-44 shrink-0 font-medium">{l.item}</span>
            {l.chance !== undefined ? (
              <ChanceBar percent={l.chance} label={`${l.chance}%`} />
            ) : (
              l.count && <span className="text-neutral-600 dark:text-neutral-400">{l.count}</span>
            )}
            {l.note && <span className="text-xs text-neutral-500">{l.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StructureCard({ structure }: { structure: ThematicStructure }) {
  return (
    <section id={structure.id} className="scroll-mt-6 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{structure.name}</h2>
        <span className="text-xs text-neutral-500">{structure.dimension}</span>
      </div>

      <p className="mt-2 text-neutral-600 dark:text-neutral-400">{structure.summary}</p>

      <div className="mt-4 space-y-2">
        <RarityBar chunksPerAttempt={structure.chunksPerAttempt} label={structure.rarity} />
        {structure.yRange && <YLevelBar min={structure.yRange.min} max={structure.yRange.max} label={structure.yLevel} />}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-neutral-500">Biomes</dt>
          <dd>{structure.biomes}</dd>
        </div>
        {structure.mob && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-neutral-500">What fights you</dt>
            <dd>
              {structure.mob.name} · {structure.mob.health.toLocaleString()} HP · {structure.mob.count} · {structure.mob.how}
            </dd>
          </div>
        )}
      </dl>

      <ItemList title="Drops" entries={structure.loot} />
      <ItemList title="Worth mining" entries={structure.blocks} hint="No chests here — the ingredients are in the blocks themselves." />

      {structure.tips && structure.tips.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          {structure.tips.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="text-neutral-400">
                •
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}

      {structure.note && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <strong className="font-medium">Heads up:</strong> {structure.note} The numbers above come from the code.
        </p>
      )}
    </section>
  )
}

function StructuresPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Structures</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Where each structure spawns, how hard it is to find, what it drops, and what will attack you. Rarity comes from the mod's worldgen settings and drop
        rates from its loot tables, so these are the real numbers rather than estimates.
      </p>

      <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {STRUCTURES.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
            {s.name}
          </a>
        ))}
      </nav>

      <p className="mt-6 rounded-md bg-neutral-50 p-4 text-sm text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-400">{WAVE_SPAWNER_NOTE}</p>

      <div className="mt-6 space-y-6">
        {STRUCTURES.map((s) => (
          <StructureCard key={s.id} structure={s} />
        ))}
      </div>

      <p className="mt-8 text-xs text-neutral-500">
        Looking for what to do with the materials? The{' '}
        <Link to="/planner" className="text-blue-600 hover:underline dark:text-blue-400">
          craft planner
        </Link>{' '}
        works out how much you need, and{' '}
        <Link to="/mechanics/ores" className="text-blue-600 hover:underline dark:text-blue-400">
          ore depths
        </Link>{' '}
        covers the mining side.
      </p>
    </div>
  )
}
