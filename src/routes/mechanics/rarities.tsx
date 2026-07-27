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
    body: 'Below Common. This is what the starter suits use — you get them rather than craft them, so they sit outside the normal rarity ladder.',
  },
  {
    name: 'Mythic',
    body: "One step above Legendary. You won't get there by combining suits in an anvil.",
  },
  {
    name: 'Unique',
    body: 'The rarest tier. Only one copy of a Unique suit is meant to exist at a time — if you have it, nobody else does.',
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

      <h2 className="mt-10 text-lg font-semibold">Rarer than Legendary</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Three tiers you won't find in the in-game guidebook. They're rare, and mostly turn up through events or admins rather than normal crafting.
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
