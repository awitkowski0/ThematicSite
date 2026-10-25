// Shared form controls and the class strings behind them. These were copy-pasted across
// the calculator, matchup simulator, abilities table and planner; one home means changing
// a border colour is one edit rather than four.
import { RARITIES } from '../lib/combat'
import { Suit } from '../lib/suits'

export const selectClass =
  'tb-inset mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none focus:!border-blue-400'

export const inputClass =
  'tb-inset mt-1 w-full rounded-md px-2 py-1.5 text-sm tabular-nums outline-none focus:!border-blue-400'

/** Bordered tile used for every "click through to a thing" link across the site. */
export const cardLinkClass =
  'tb-raised block rounded-md p-4'

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
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-accent" />
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

/** Big number + caption, the shape every calculator result uses. */
export function BigStat({ value, caption }: { value: string; caption: string }) {
  return (
    <div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500">{caption}</div>
    </div>
  )
}
