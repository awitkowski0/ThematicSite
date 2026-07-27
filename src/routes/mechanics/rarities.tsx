import { createFileRoute, Link } from '@tanstack/react-router'

import { entriesFor } from '../../lib/book'
import { MarkdownContent } from '../../components/MarkdownContent'

export const Route = createFileRoute('/mechanics/rarities')({
  head: () => ({
    meta: [{ title: 'Rarities — Thematic Mechanics' }, { name: 'description', content: 'All 8 suit rarity tiers in Thematic, from Starter to Unique, and how IV affects your stats.' }],
  }),
  component: RaritiesPage,
})

// Starter/Mythic/Unique exist in the mod's code (ArmorCodec.RarityLevel) but aren't covered
// anywhere in the in-game guidebook — this is new copy grounded in that code, not ported
// from the book like the 5 tiers above it.
const UNDOCUMENTED_TIERS = [
  {
    name: 'Starter',
    body: "The baseline tier, below Common. The mod's starter suits (see the guidebook's Starters section) sit here rather than being crafted at a rarity.",
  },
  {
    name: 'Mythic',
    body: "A tier above Legendary. Which suits or crafting paths can reach it isn't documented anywhere public.",
  },
  {
    name: 'Unique',
    body: 'The highest tier — reserved for single-owner suits, where only one copy of that specific suit is meant to exist at a time.',
  },
]

function RaritiesPage() {
  const entry = entriesFor('getting_started').find((e) => e.id === 'suit_rarities')

  return (
    <div>
      <Link to="/mechanics" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Mechanics
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Rarities</h1>

      <div className="mt-6 space-y-6">
        {entry?.textBlocks.map((block, i) => <MarkdownContent key={i} markdown={block} />)}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Higher tiers</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Three more tiers exist above Legendary in the mod's code but aren't explained in the in-game guidebook — noted here for completeness, not ported from
        anywhere.
      </p>
      <ul className="mt-4 space-y-4">
        {UNDOCUMENTED_TIERS.map((tier) => (
          <li key={tier.name}>
            <div className="font-medium">{tier.name}</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">{tier.body}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
