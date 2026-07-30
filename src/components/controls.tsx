// Shared form controls and the class strings behind them. These were copy-pasted across
// the calculator, matchup simulator, abilities table and planner; one home means changing
// a border colour is one edit rather than four.
import { RARITIES } from '../lib/combat'
import { Suit, accentForCollection } from '../lib/suits'

export const selectClass =
  'mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950'

export const inputClass =
  'mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neutral-500 dark:border-neutral-700'

/** Bordered tile used for every "click through to a thing" link across the site. */
export const cardLinkClass =
  'block rounded-md border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  )
}

export function SuitSelect({ label, value, options, onChange, allowCustom }: { label: string; value: string; options: Suit[]; onChange: (v: string) => void; allowCustom?: boolean }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {allowCustom && <option value="">Custom…</option>}
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function RaritySelect({ label, iv, onChange }: { label: string; iv: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <select value={iv} onChange={(e) => onChange(Number(e.target.value))} className={selectClass}>
        {RARITIES.map((r) => (
          <option key={r.name} value={r.iv}>
            {r.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Labelled slider with a live value readout. */
export function Range({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-medium tabular-nums">{format ? format(value) : Math.round(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-blue-600" />
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  )
}

/** Item/ingredient icon with the same grey placeholder when there's no texture for it. */
export function ItemIcon({ path, size = 6 }: { path?: string; size?: 5 | 6 | 8 }) {
  const dim = `h-${size} w-${size}`
  if (!path) return <span className={`${dim} shrink-0 rounded bg-neutral-100 dark:bg-neutral-900`} />
  return <img src={path} alt="" className={`${dim} shrink-0`} style={{ imageRendering: 'pixelated' }} />
}

/**
 * Suit swatch for the tier list. `texturePath`/`shinyTexturePath` exist but turned out to be
 * raw armor UV-unwrap sheets (confirmed by inspecting several), not portraits — illegible at
 * tile size, so this reuses the same accentForCollection colour coding as the suits pages
 * instead of an image, plus a small sparkle badge to show the shiny toggle.
 */
export function SuitThumb({ suit, shiny }: { suit: Suit; shiny?: boolean }) {
  const initials = suit.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded text-xs font-semibold text-white"
      style={{ backgroundColor: accentForCollection(suit.collection) }}
    >
      {initials}
      {shiny && (
        <span aria-hidden className="absolute -right-1.5 -top-1.5 text-sm leading-none drop-shadow">
          ✨
        </span>
      )}
    </span>
  )
}

/** Big number + caption, the shape every calculator result uses. */
export function BigStat({ value, caption }: { value: string; caption: string }) {
  return (
    <div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500">{caption}</div>
    </div>
  )
}
