import { createFileRoute, Link } from '@tanstack/react-router'

import { bookInfo, childCategories, topLevelCategories } from '../../lib/book'
import { GuideInline, GuideText } from '../../components/GuideText'

export const Route = createFileRoute('/book/')({
  head: () => ({
    meta: [
      { title: 'Guidebook — Thematic' },
      { name: 'description', content: 'The Thematic guidebook: getting started, mobs, structures, dimensions, starters, suits, abilities, gadgets, arrows, status effects, and more.' },
    ],
  }),
  component: BookIndex,
})

function BookIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Guidebook</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">The in-game guidebook, readable here.</p>
      <div className="mt-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <GuideText markup={bookInfo.landing} />
      </div>

      <div className="mt-8 space-y-8">
        {topLevelCategories().map((category) => {
          const children = childCategories(category.id)
          return (
            <section key={category.id}>
              <Link to="/book/$category" params={{ category: category.id }} className="flex items-center gap-2 text-lg font-semibold hover:underline">
                {category.icon && <img src={category.icon} alt="" className="h-6 w-6 [image-rendering:pixelated]" />}
                <span>
                  {category.name} <span className="font-normal text-neutral-500">({category.entryCount})</span>
                </span>
              </Link>
              {category.description && (
                <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  <GuideInline markup={category.description} />
                </div>
              )}
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
