// Small charts shared by the pages ported out of the in-game guidebook. The guidebook
// shows things visually (a rendered structure, an item grid); plain tables lose that, so
// these give each page something to read at a glance.

const WORLD_MIN = -64
const WORLD_MAX = 320
const WORLD_RANGE = WORLD_MAX - WORLD_MIN

/** Where something sits in the world's vertical range, drawn against the full -64..320. */
export function YLevelBar({ min, max, label, color = 'bg-blue-500' }: { min: number; max: number; label?: string; color?: string }) {
  const left = ((min - WORLD_MIN) / WORLD_RANGE) * 100
  const width = ((max - min) / WORLD_RANGE) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-40 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-900">
        <div className={`absolute h-2 rounded-full ${color}`} style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }} />
      </div>
      <span className="whitespace-nowrap text-xs text-neutral-500">{label ?? `Y ${min} to ${max}`}</span>
    </div>
  )
}

/**
 * How rare something is, as a filled bar. Rarity spans several orders of magnitude (a 1-in-3
 * chance per chunk vs one attempt per 120×120 chunks), so the scale is logarithmic on the
 * area each one occupies — otherwise everything but the rarest would round to empty.
 */
export function RarityBar({ chunksPerAttempt, label }: { chunksPerAttempt: number; label: string }) {
  // ~0.33 chunks (ooze pools) up to ~28,800 (rock of eternity)
  const clamped = Math.max(0.25, Math.min(50_000, chunksPerAttempt))
  const t = (Math.log10(clamped) - Math.log10(0.25)) / (Math.log10(50_000) - Math.log10(0.25))
  const pct = Math.round(t * 100)
  const tone = pct > 75 ? 'bg-rose-500' : pct > 45 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-40 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-900">
        <div className={`absolute h-2 rounded-full ${tone}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
  )
}

/** A 0-100% chance, e.g. a drop rate. */
export function ChanceBar({ percent, label, width = 'w-28' }: { percent: number; label?: string; width?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`relative h-2 ${width} shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-900`}>
        <div className="absolute h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(Math.min(percent, 100), 1)}%` }} />
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-neutral-500">{label ?? `${percent}%`}</span>
    </div>
  )
}
