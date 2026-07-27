import { createFileRoute, Link } from '@tanstack/react-router'

import { childCategories, topLevelCategories } from '../../lib/book'

export const Route = createFileRoute('/book/')({
  head: () => ({
    meta: [
      { title: 'Guidebook — Thematic' },
      { name: 'description', content: 'Thematic guidebook: mobs, structures, gadgets, constructs, arrows, status effects, and more.' },
    ],
  }),
  component: BookIndex,
})

// Suits have their own top-level page (and nav item) with all 529 of them, so leave that
// category out here entirely — listing it would show a confusing handful of leftovers.
const HIDDEN_CATEGORIES = new Set(['suit'])

function BookIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Guidebook</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        The in-game guidebook, readable here. Mobs, structures, gadgets, constructs, arrows, status effects, and how everything fits together.
      </p>

      <div className="mt-8 space-y-8">
        {topLevelCategories()
          .filter((c) => !HIDDEN_CATEGORIES.has(c.id) && c.entryCount > 0)
          .sort((a, b) => a.sortnum - b.sortnum)
          .map((category) => {
            const children = childCategories(category.id).filter((c) => !HIDDEN_CATEGORIES.has(c.id) && c.entryCount > 0)
            return (
              <section key={category.id}>
                <Link to="/book/$category" params={{ category: category.id }} className="text-lg font-semibold hover:underline">
                  {category.name} <span className="font-normal text-neutral-500">({category.entryCount})</span>
                </Link>
                {category.description && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{category.description}</p>}
                {children.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {children.map((child) => (
                      <li key={child.id}>
                        <Link to="/book/$category" params={{ category: child.id }} className="text-blue-600 hover:underline dark:text-blue-400">
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
