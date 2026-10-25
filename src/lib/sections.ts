import { packDocs } from './packs'

// The site's map: the header's areas, each area's tabs, and the home page's index all come from here.

export interface SectionTab {
  to: string
  label: string
  description: string
}

export interface Section {
  id: string
  label: string
  /** The header link. */
  to: string
  description: string
  /** Paths that belong to this area besides its tabs (a prefix match). */
  also?: string[]
  tabs: SectionTab[]
}

export const SECTIONS: Section[] = [
  {
    id: 'suits',
    label: 'Suits',
    to: '/suits',
    description: 'Every suit, what it does, and how it stacks up.',
    tabs: [
      { to: '/suits', label: 'Roster', description: 'Every suit, its abilities, stats, and how to craft it.' },
      { to: '/matchup', label: 'Matchup', description: 'Pit two suits against each other and see how the fight goes.' },
      { to: '/planner', label: 'Craft planner', description: 'Plan a batch or a shiny grind, and where to gather the materials.' },
    ],
  },
  {
    id: 'abilities',
    label: 'Abilities',
    to: '/abilities',
    description: 'What each ability does, and the damage and cooldown behind it.',
    also: ['/wiki/ability', '/wiki/arrow', '/wiki/constructs', '/wiki/gadget', '/wiki/status_effect'],
    tabs: [
      { to: '/abilities', label: 'All abilities', description: 'Every ability with its numbers against a real suit.' },
      { to: '/wiki/arrow', label: 'Arrows', description: 'Every arrowhead, with damage and cooldown.' },
      { to: '/wiki/gadget', label: 'Gadgets', description: 'Batarangs, grenades, and the rest of the belt.' },
      { to: '/wiki/constructs', label: 'Constructs', description: 'Every Lantern construct you can summon.' },
      { to: '/wiki/status_effect', label: 'Status effects', description: 'Every effect and what it does to you.' },
    ],
  },
  {
    id: 'guide',
    label: 'Wiki',
    to: '/wiki',
    description: 'Every page of the in-game wiki, and how the systems underneath work.',
    tabs: [
      { to: '/wiki', label: 'Wiki', description: 'Every page from the in-game wiki.' },
      { to: '/mechanics', label: 'Mechanics', description: 'Stats, rarity, shinies, keybinds, and where ores spawn.' },
      { to: '/structures', label: 'Structures', description: 'Spawn rarity, drop rates, and what fights you there.' },
      { to: '/guides', label: 'Community guides', description: 'Walkthroughs and tips written by players.' },
      { to: '/blog', label: 'Changelog', description: 'What changed in each release.' },
    ],
  },
  {
    id: 'server',
    label: 'Server',
    to: '/server',
    description: 'The official server, its game modes, and the weekly guild event.',
    also: ['/gotham'],
    tabs: [
      { to: '/server', label: 'Server', description: 'Join address, who is online, and the leaderboards.' },
      { to: '/games', label: 'Games', description: 'Queues, live matches, and game mode leaderboards.' },
      { to: '/territories', label: 'Territories', description: 'Who holds each Gotham zone, standings and prizes.' },
      { to: '/play', label: 'How to join', description: 'Install the modpack and join the official server.' },
    ],
  },
  {
    id: 'packs',
    label: 'Packs',
    to: '/packs',
    description: 'Make your own suits and abilities as a content pack.',
    tabs: [
      { to: '/packs', label: 'Start here', description: 'What a pack is, the starter pack, and how to rename it.' },
      ...packDocs.map((d) => ({ to: `/packs/${d.slug}`, label: d.title, description: d.description })),
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    to: '/faq',
    description: 'Common questions about installing and playing.',
    tabs: [],
  },
]

function under(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
}

/** The area a path belongs to: the longest tab, header or extra prefix that contains it. */
export function sectionFor(path: string): { section: Section; tab?: SectionTab } | undefined {
  let best: { section: Section; tab?: SectionTab; len: number } | undefined
  for (const section of SECTIONS) {
    const candidates: [string, SectionTab | undefined][] = [
      [section.to, undefined],
      ...(section.also ?? []).map((p) => [p, undefined] as [string, undefined]),
      ...section.tabs.map((t) => [t.to, t] as [string, SectionTab]),
    ]
    for (const [prefix, tab] of candidates) {
      if (under(path, prefix) && (!best || prefix.length > best.len)) best = { section, tab, len: prefix.length }
    }
  }
  if (!best) return undefined
  // a header match inside an area still lights the tab of the same path
  return { section: best.section, tab: best.tab ?? best.section.tabs.find((t) => t.to === best!.section.to) }
}
