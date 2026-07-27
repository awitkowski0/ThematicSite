import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { accentForCollection, getSuit } from '../../lib/suits'
import { RecipeTree } from '../../components/RecipeTree'

export const Route = createFileRoute('/suits/$id')({
  loader: ({ params }) => {
    const suit = getSuit(params.id)
    if (!suit) throw notFound()
    return suit
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Thematic` },
          {
            name: 'description',
            content: `${loaderData.name} is a ${loaderData.collectionName} suit in the Thematic Minecraft mod (tier ${loaderData.tier}), with ${loaderData.abilities.length} abilities.`,
          },
        ]
      : [],
  }),
  component: SuitDetail,
  notFoundComponent: () => (
    <div>
      <h1 className="text-2xl font-bold">Suit not found</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        It might be work-in-progress and not released yet.{' '}
        <Link to="/suits" className="text-blue-600 hover:underline dark:text-blue-400">
          Browse all suits
        </Link>
        .
      </p>
    </div>
  ),
})

function SuitDetail() {
  const suit = Route.useLoaderData()

  return (
    <div>
      <Link to="/suits" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← All suits
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accentForCollection(suit.collection) }} />
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            {suit.name}
            {suit.wip && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                Work in Progress
              </span>
            )}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {suit.collectionName} · Tier {suit.tier}
          </p>
        </div>
      </div>

      {suit.stats.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Stats</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            The range each stat rolls in — a higher{' '}
            <Link to="/mechanics/rarities" className="text-blue-600 hover:underline dark:text-blue-400">
              rarity
            </Link>{' '}
            pushes you toward the top of it. See{' '}
            <Link to="/mechanics/stats" className="text-blue-600 hover:underline dark:text-blue-400">
              how stats work
            </Link>
            .
          </p>
          <ul className="mt-3 max-w-md space-y-2">
            {suit.stats.map((stat) => (
              <li key={stat.id} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-neutral-600 dark:text-neutral-400">{stat.label}</span>
                <span className="relative h-2 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-900">
                  <span
                    className="absolute h-2 rounded-full"
                    style={{
                      left: `${stat.minimum}%`,
                      width: `${Math.max(stat.maximum - stat.minimum, 1)}%`,
                      backgroundColor: accentForCollection(suit.collection),
                    }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right tabular-nums text-neutral-500">
                  {stat.minimum}–{stat.maximum}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {suit.abilities.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Abilities</h2>
          <ul className="mt-3 space-y-3">
            {suit.abilities.map((ability) => (
              <li key={ability.id}>
                <div className="font-medium">{ability.name}</div>
                {ability.description && <div className="text-sm text-neutral-600 dark:text-neutral-400">{ability.description}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {suit.recipe && suit.recipe.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Suit Bench recipe</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Click any ingredient to see how to craft it.</p>
          <div className="mt-3">
            <RecipeTree ingredients={suit.recipe} />
          </div>
        </section>
      )}

    </div>
  )
}
