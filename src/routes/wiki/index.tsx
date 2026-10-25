import { createFileRoute, Link } from '@tanstack/react-router'

import { childCategories, topLevelCategories } from '../../lib/book'
import { walkthrough } from '../../lib/walkthrough'
import { GuideInline } from '../../components/GuideText'

export const Route = createFileRoute('/wiki/')({
  head: () => ({
    meta: [
      { title: 'Wiki — Thematic' },
      { name: 'description', content: 'The Thematic wiki: getting started, mobs, structures, dimensions, starters, suits, abilities, gadgets, arrows, status effects, and more.' },
    ],
  }),
  component: WikiIndex,
})

function WikiIndex() {
  return (
    <div>
      <h1>Wiki</h1>

      <ol className="relative mt-2 space-y-6 before:absolute before:bottom-2 before:left-[0.95rem] before:top-2 before:w-px before:bg-neutral-800">
        {walkthrough.map((step, i) => (
          <li key={step.title} className="relative grid grid-cols-[2rem_1fr] gap-4">
            <span className="tb-chip z-10 flex h-8 w-8 items-center justify-center !text-sm">{i + 1}</span>
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-0.5 text-sm text-neutral-400">{step.text}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {step.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="tb-raised inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm">
                      {l.icon && <img src={l.icon} alt="" className="h-4 w-4 [image-rendering:pixelated]" />}
                      <GuideInline markup={l.label} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-12 border-t border-neutral-800 pt-6">
        <h2>The whole wiki</h2>
        <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {topLevelCategories().map((category) => {
            const children = childCategories(category.id)
            return (
              <li key={category.id}>
                <Link to="/wiki/$category" params={{ category: category.id }} className="flex items-center gap-2 font-semibold text-white hover:underline">
                  {category.icon && <img src={category.icon} alt="" className="h-5 w-5 [image-rendering:pixelated]" />}
                  <GuideInline markup={category.name} />
                  <span className="text-sm font-normal text-neutral-500">{category.entryCount}</span>
                </Link>
                {children.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-7 text-sm">
                    {children.map((child) => (
                      <li key={child.id}>
                        <Link to="/wiki/$category" params={{ category: child.id }} className="text-blue-400 hover:underline">
                          <GuideInline markup={child.name} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
