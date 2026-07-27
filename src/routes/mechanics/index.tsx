import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/mechanics/')({
  head: () => ({
    meta: [{ title: 'Mechanics — Thematic' }, { name: 'description', content: 'How stats, rarity, shinies, keybinds, and ore spawns work in Thematic.' }],
  }),
  component: MechanicsIndex,
})

const PAGES = [
  { to: '/mechanics/stats', title: 'Stats', description: 'The 4 core stats and their formulas.' },
  { to: '/mechanics/rarities', title: 'Rarities', description: 'All 8 rarity tiers and how IV affects your stats.' },
  { to: '/mechanics/shiny', title: 'Shiny System', description: 'The 3% cosmetic shiny roll.' },
  { to: '/mechanics/keybinds', title: 'Keybinds', description: 'Every default keybind Thematic adds.' },
  { to: '/mechanics/ores', title: 'Ores', description: 'What Y-level and how common each custom ore is.' },
] as const

function MechanicsIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Mechanics</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">The systems underneath suits — stats, rarity, shinies, keybinds, and where to find ores.</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {PAGES.map((page) => (
          <li key={page.to}>
            <Link to={page.to} className="block rounded-md border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600">
              <div className="font-semibold">{page.title}</div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{page.description}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
