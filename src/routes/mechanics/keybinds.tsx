import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/mechanics/keybinds')({
  head: () => ({
    meta: [{ title: 'Keybinds — Thematic Mechanics' }, { name: 'description', content: "Every default keybind Thematic adds, and what each one does." }],
  }),
  component: KeybindsPage,
})

// Hand-maintained, not generated: these live in Java source (ThematicKeybinds.java), not
// JSON data, and rarely change — not worth a fragile source-scraping export step for.
// Update this list by hand if the defaults change.
const KEYBINDS = [
  { key: 'R', action: 'Ability slot 1' },
  { key: 'F', action: 'Ability slot 2' },
  { key: 'G', action: 'Ability slot 3' },
  { key: 'V', action: 'Ability slot 4' },
  { key: 'C', action: 'Ability slot 5' },
  { key: 'Z', action: 'Ability slot 6' },
  { key: 'Y', action: 'Ultimate ability' },
  { key: 'H', action: 'Equip item' },
  { key: 'J', action: 'Utility' },
  { key: 'K', action: 'Cosmetic ability' },
  { key: 'Left Shift', action: 'Dodge' },
  { key: 'Up Arrow', action: 'Speedster: raise speed' },
  { key: 'Down Arrow', action: 'Speedster: lower speed' },
]

function KeybindsPage() {
  return (
    <div>
      <Link to="/mechanics" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Mechanics
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Keybinds</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Default binds — all rebindable in Minecraft's own Controls menu. Ability slots are per-suit: what each one actually does depends on the suit you're
        wearing (see each suit's page for its own ability list).
      </p>

      <table className="mt-6 w-full max-w-md border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
            <th className="py-2 pr-4 font-medium">Key</th>
            <th className="py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {KEYBINDS.map((bind) => (
            <tr key={bind.action} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 pr-4">
                <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900">
                  {bind.key}
                </kbd>
              </td>
              <td className="py-2">{bind.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
