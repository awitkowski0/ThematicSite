// The guidebook's front page: the mod in the order you meet it, each step pointing into the book and the site.
import { getCategory } from './book'

/** A book entry by "<category>/<entry>", or a site page. */
type StepLinkSpec = { book: string } | { to: string; label: string }

interface StepSpec {
  title: string
  text: string
  links: StepLinkSpec[]
}

export interface StepLink {
  href: string
  label: string
  icon?: string
}

export interface Step {
  title: string
  text: string
  links: StepLink[]
}

const STEPS: StepSpec[] = [
  {
    title: 'Pick a starter',
    text: 'The first time you join, you choose a starter suit. It stays yours, upgraded ten times and changing shape as it goes.',
    links: [{ book: 'getting_started/welcome' }, { book: 'starters/introduction' }, { book: 'starters/steve' }, { book: 'starters/alex' }],
  },
  {
    title: 'Gather materials',
    text: 'Every other suit is crafted. Mine the new ores, then smelt, press and weave them into what recipes ask for.',
    links: [
      { book: 'getting_started/ores' },
      { book: 'getting_started/alloys' },
      { book: 'getting_started/plates' },
      { book: 'getting_started/fabrics' },
      { book: 'getting_started/fibers' },
      { book: 'getting_started/sturdier_materials' },
      { to: '/mechanics/ores', label: 'Where ores spawn' },
    ],
  },
  {
    title: 'Build a Suit Bench',
    text: 'Technology is the last step before the bench, and the bench is where every suit is made.',
    links: [{ book: 'getting_started/tech' }, { book: 'getting_started/suit_bench' }, { book: 'getting_started/character_insignias' }],
  },
  {
    title: 'Choose a suit',
    text: 'Look through the roster before you gather a thing, then let the planner add up the materials.',
    links: [
      { to: '/suits', label: 'Suit roster' },
      { book: 'getting_started/browsing_suits' },
      { to: '/planner', label: 'Craft planner' },
      { to: '/matchup', label: 'Matchup' },
    ],
  },
  {
    title: 'Learn your powers',
    text: 'Each suit has its own moves on a few keys. The ability pages give the numbers behind each one.',
    links: [{ to: '/abilities', label: 'All abilities' }, { to: '/mechanics/keybinds', label: 'Keybinds' }, { book: 'getting_started/miscellaneous_features' }],
  },
  {
    title: 'Get stronger',
    text: 'A suit rolls a rarity that moves its stats, standing near your collection adds a bonus, and some rolls come out shiny.',
    links: [
      { book: 'getting_started/suit_rarities' },
      { book: 'getting_started/stats' },
      { book: 'getting_started/synergy_collections' },
      { to: '/mechanics/shiny', label: 'Shinies' },
      { to: '/wiki/alts', label: 'Alternative suits' },
    ],
  },
  {
    title: 'Explore and fight',
    text: 'Structures, bosses and a whole dimension hold the rarer materials.',
    links: [
      { to: '/structures', label: 'Structures' },
      { to: '/wiki/mobs', label: 'Mobs' },
      { book: 'mobs/arkillo' },
      { book: 'dimensions/speed_force_dimension' },
    ],
  },
  {
    title: 'Play together',
    text: 'The official server adds claims, guilds, shops, game modes and a weekly fight over Gotham.',
    links: [
      { to: '/play', label: 'How to join' },
      { book: 'thematic_server_info/claiming' },
      { book: 'thematic_server_info/guilds' },
      { to: '/games', label: 'Games' },
      { to: '/territories', label: 'Territories' },
    ],
  },
]

function resolve(spec: StepLinkSpec): StepLink | undefined {
  if ('to' in spec) return { href: spec.to, label: spec.label }
  const [categoryId, entryId] = spec.book.split('/')
  const entry = getCategory(categoryId)?.entries.find((e) => e.id === entryId)
  return entry && { href: entry.href, label: entry.name, icon: entry.icon }
}

/** The steps, with book links named and iconed from the book itself; a link to an entry the book no longer has is dropped. */
export const walkthrough: Step[] = STEPS.map((s) => ({ ...s, links: s.links.map(resolve).filter((l): l is StepLink => !!l) }))
