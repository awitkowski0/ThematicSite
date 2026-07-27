import { useState } from 'react'

// Formulas straight from the in-game "Stats Explained" guidebook page:
//   Attack  = (5  * (Value - 1) / 98) + 1
//   Defense = (18 * (Value - 1) / 98) + 60
//   Utility = 39 - ((3 * (Value - 1) / 98) + 18)
//   Damage  = (Base + AttackOutput) / TargetDefenseReduc
//   Cooldown (s) = (BaseCooldown * UtilityOutput) / 20
const attackOutput = (value: number) => (5 * (value - 1)) / 98 + 1
const defenseReduction = (value: number) => (18 * (value - 1)) / 98 + 60
const utilityOutput = (value: number) => 39 - ((3 * (value - 1)) / 98 + 18)

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="tabular-nums font-medium">{value}</span>
      </span>
      <input
        type="range"
        min={1}
        max={99}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-blue-600"
      />
    </label>
  )
}

export function DamageCalculator() {
  const [attack, setAttack] = useState(75)
  const [defense, setDefense] = useState(60)
  const [baseDamage, setBaseDamage] = useState(10)

  const [utility, setUtility] = useState(50)
  const [baseCooldown, setBaseCooldown] = useState(100)

  const damage = (baseDamage + attackOutput(attack)) / defenseReduction(defense)
  const unmitigated = baseDamage + attackOutput(attack)
  const reducedBy = unmitigated > 0 ? (1 - damage / unmitigated) * 100 : 0
  const cooldown = (baseCooldown * utilityOutput(utility)) / 20

  return (
    <div className="mt-4 space-y-8">
      <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h3 className="font-semibold">Damage</h3>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">How much an attack actually lands for after the target's defense.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Slider label="Your Attack" value={attack} onChange={setAttack} />
          <Slider label="Their Defense" value={defense} onChange={setDefense} />
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Ability's base damage</span>
          <input
            type="number"
            min={0}
            value={baseDamage}
            onChange={(e) => setBaseDamage(Math.max(0, Number(e.target.value)))}
            className="mt-1 w-28 rounded-md border border-neutral-300 bg-transparent px-2 py-1 tabular-nums outline-none focus:border-neutral-500 dark:border-neutral-700"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div>
            <div className="text-2xl font-bold tabular-nums">{damage.toFixed(2)}</div>
            <div className="text-xs text-neutral-500">damage dealt</div>
          </div>
          <div className="text-sm text-neutral-500">
            {unmitigated.toFixed(2)} before defense · reduced {reducedBy.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h3 className="font-semibold">Cooldown</h3>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">How long you actually wait between uses, after Utility.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Slider label="Your Utility" value={utility} onChange={setUtility} />
          <label className="block text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Ability's base cooldown (ticks)</span>
            <input
              type="number"
              min={0}
              value={baseCooldown}
              onChange={(e) => setBaseCooldown(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-28 rounded-md border border-neutral-300 bg-transparent px-2 py-1 tabular-nums outline-none focus:border-neutral-500 dark:border-neutral-700"
            />
          </label>
        </div>

        <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="text-2xl font-bold tabular-nums">{cooldown.toFixed(2)}s</div>
          <div className="text-xs text-neutral-500">actual cooldown</div>
        </div>
      </div>
    </div>
  )
}
