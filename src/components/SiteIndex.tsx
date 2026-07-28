import { Link } from '@tanstack/react-router'

import { cardLinkClass } from './controls'

// Everything the site can do, in one place — the top bar only carries the handful of links
// most people want, so this is where the rest lives.
const SECTIONS: { to: string; title: string; description: string }[] = [
  { to: '/suits', title: 'Suits', description: 'Every suit, its abilities, stats, and how to craft it.' },
  { to: '/abilities', title: 'Abilities', description: 'What each ability does, and the damage and cooldown behind it.' },
  { to: '/matchup', title: 'Matchup', description: 'Pit two suits against each other and see how the fight goes.' },
  { to: '/planner', title: 'Craft planner', description: 'Plan a batch or a shiny grind, and where to gather the materials.' },
  { to: '/mechanics/stats', title: 'Stats', description: 'What Defense, Utility, Attack and Speed do, plus a damage calculator.' },
  { to: '/mechanics', title: 'Mechanics', description: 'Rarity, shinies, keybinds, and where ores spawn.' },
  { to: '/guides', title: 'Guides', description: 'Community-written walkthroughs and tips.' },
  { to: '/faq', title: 'FAQ', description: 'Common questions about installing and playing.' },
]

// The guidebook's own categories, surfaced directly rather than buried a click deeper.
const REFERENCE: { to: string; title: string; description: string }[] = [
  { to: '/book/structures', title: 'Structures', description: 'Where they spawn and what they hold.' },
  { to: '/book/mobs', title: 'Mobs', description: 'What spawns them, what they drop.' },
  { to: '/book/status_effect', title: 'Status effects', description: 'Every effect and what it does to you.' },
  { to: '/book/arrow', title: 'Arrows', description: 'Every arrowhead, with damage and cooldown.' },
  { to: '/book/gadget', title: 'Gadgets', description: 'Batarangs, grenades, and the rest of the belt.' },
  { to: '/book/constructs', title: 'Constructs', description: 'Every Lantern construct you can summon.' },
  { to: '/book', title: 'Full guidebook', description: 'Everything from the in-game book.' },
]

export function SiteIndex() {
  return (
    <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 className="text-lg font-semibold">Table of contents</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <li key={s.to}>
            <Link
              to={s.to}
              className={cardLinkClass}
            >
              <div className="font-medium">{s.title}</div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{s.description}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The guidebook's own categories. Kept separate so the page can place it where it likes. */
export function ReferenceIndex() {
  return (
    <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 className="text-lg font-semibold">Reference</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {REFERENCE.map((s) => (
          <li key={s.to}>
            <a
              href={s.to}
              className={cardLinkClass}
            >
              <div className="font-medium">{s.title}</div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{s.description}</div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
