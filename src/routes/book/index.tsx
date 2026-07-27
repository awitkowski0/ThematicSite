import { createFileRoute, Link } from '@tanstack/react-router'

import { childCategories, topLevelCategories } from '../../lib/book'

export const Route = createFileRoute('/book/')({
  head: () => ({
    meta: [
      { title: 'Guidebook — Thematic' },
      { name: 'description', content: "The Thematic in-game guidebook's content, ported to the web: mobs, structures, gadgets, constructs, arrows, status effects, and more." },
    ],
  }),
  component: BookIndex,
})

// The in-game "Suits" category has a much better home already — link straight to it
// instead of a generic listing that would just duplicate a worse version of /suits.
function categoryHref(categoryId: string): string {
  return categoryId === 'suit' ? '/suits' : `/book/${categoryId}`
}

function BookIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Guidebook</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Everything from the in-game Patchouli guidebook, generated from the same data the mod ships with.
      </p>

      <div className="mt-8 space-y-8">
        {topLevelCategories()
          .sort((a, b) => a.sortnum - b.sortnum)
          .map((category) => {
            const children = childCategories(category.id)
            return (
              <section key={category.id}>
                <Link to={categoryHref(category.id)} className="text-lg font-semibold hover:underline">
                  {category.name} <span className="font-normal text-neutral-500">({category.entryCount})</span>
                </Link>
                {category.description && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{category.description}</p>}
                {children.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {children.map((child) => (
                      <li key={child.id}>
                        <Link to={categoryHref(child.id)} className="text-blue-600 hover:underline dark:text-blue-400">
                          {child.name} ({child.entryCount})
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
      </div>
    </div>
  )
}
