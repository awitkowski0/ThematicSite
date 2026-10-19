import type { ReactNode } from 'react'

import type { BookPage } from '../lib/book'
import { GuideInline, GuideText } from './GuideText'

// One component per page type of the in-game guide (GuideSchema.java). The game draws some of them
// from live data (a suit's stats, an ability's numbers); the export writes that data out, so the
// web version shows the same things as plain content. What cannot be drawn on a web page (a 3D
// figure, a turnable structure model, an animation preview) shows a short note in its place.

const muted = 'text-neutral-500 dark:text-neutral-400'
const link = 'text-blue-600 hover:underline dark:text-blue-400'

function Heading({ page }: { page: BookPage }) {
  if (!page.title) return null
  return (
    <h2 className="mb-2 text-lg font-semibold">
      {page.icon && <img src={page.icon} alt="" className="mr-2 inline h-6 w-6 align-text-bottom [image-rendering:pixelated]" />}
      <GuideInline markup={page.title} />
    </h2>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className={`rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 ${muted}`}>{children}</p>
}

function Tile({ name, icon, count, options }: { name: string; icon?: string; count?: number; options?: string[] }) {
  const title = options?.length ? `${name}: ${options.join(', ')}` : name
  return (
    <span
      title={title}
      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-neutral-300 bg-neutral-100 p-0.5 text-center text-[9px] leading-tight dark:border-neutral-700 dark:bg-neutral-900"
    >
      {icon ? <img src={icon} alt={name} loading="lazy" className="h-9 w-9 [image-rendering:pixelated]" /> : <span className="line-clamp-4 break-words">{name}</span>}
      {count !== undefined && count > 1 && <span className="absolute bottom-0 right-0.5 text-[10px] font-bold">{count}</span>}
    </span>
  )
}

function ItemRow({ item }: { item: { name: string; icon?: string } }) {
  return (
    <span className="inline-flex items-center gap-3">
      <Tile name={item.name} icon={item.icon} />
      <span className="font-medium">{item.name}</span>
    </span>
  )
}

function Recipe({ recipe }: { recipe: BookPage }) {
  if (recipe.missing) {
    return (
      <Note>
        Recipe <code>{recipe.id}</code> ({recipe.name}) is a vanilla Minecraft recipe, so it is not listed in Thematic&apos;s data.
      </Note>
    )
  }
  return (
    <div className="inline-block max-w-full">
      <p className={`mb-1 text-xs uppercase tracking-wide ${muted}`}>{recipe.label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${recipe.cols}, 3rem)` }}>
          {recipe.cells.map((cell: any, i: number) => (cell ? <Tile key={i} name={cell.name} icon={cell.icon} options={cell.options} /> : <span key={i} className="h-12 w-12 rounded border border-dashed border-neutral-200 dark:border-neutral-800" />))}
        </div>
        <span aria-hidden className={muted}>
          →
        </span>
        <Tile name={recipe.result.name} icon={recipe.result.icon} count={recipe.result.count} />
        <span className="text-sm font-medium">{recipe.result.name}</span>
      </div>
    </div>
  )
}

function PageBody({ page }: { page: BookPage }) {
  switch (page.type) {
    case 'text':
      return (
        <>
          <Heading page={page} />
          <GuideText markup={page.text} />
        </>
      )
    case 'spotlight':
      return (
        <>
          <Heading page={page} />
          <div className="mb-3">
            <ItemRow item={page.item} />
          </div>
          <GuideText markup={page.text} />
        </>
      )
    case 'crafting':
      return (
        <>
          <Heading page={page} />
          <div className="space-y-4">
            {page.recipes.map((r: BookPage, i: number) => (
              <Recipe key={i} recipe={r} />
            ))}
          </div>
          {page.text && (
            <div className="mt-3">
              <GuideText markup={page.text} />
            </div>
          )}
        </>
      )
    case 'image':
      return (
        <>
          <Heading page={page} />
          <div className="space-y-3">
            {page.images.map((img: { src: string | null; alt: string }, i: number) =>
              img.src ? (
                <img key={i} src={img.src} alt={img.alt} loading="lazy" className={`max-w-full ${page.border ? 'rounded border border-neutral-300 p-1 dark:border-neutral-700' : ''}`} />
              ) : (
                <Note key={i}>Picture &ldquo;{img.alt}&rdquo; is not available on the web.</Note>
              ),
            )}
          </div>
          <div className="mt-3">
            <GuideText markup={page.text} />
          </div>
        </>
      )
    case 'figure':
      return (
        <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
          {page.suit ? (
            <>
              <p className="text-lg font-semibold">
                {page.suit.href ? (
                  <a href={page.suit.href} className={link}>
                    {page.name ?? page.suit.name}
                  </a>
                ) : (
                  (page.name ?? page.suit.name)
                )}
              </p>
              {page.suit.collection && (
                <p className={`text-sm ${muted}`}>
                  {page.suit.collection}
                  {page.suit.tier !== undefined && ` · Tier ${page.suit.tier}`}
                </p>
              )}
            </>
          ) : (
            <p className="text-lg font-semibold">{page.name ?? page.entity?.name}</p>
          )}
          {page.text && (
            <div className="mt-2">
              <GuideText markup={page.text} />
            </div>
          )}
          <p className={`mt-2 text-xs ${muted}`}>{page.suit ? 'The 3D model of this suit is shown in game.' : 'The 3D model is shown in game.'}</p>
        </div>
      )
    case 'structure':
      return (
        <>
          <Heading page={page} />
          <Note>The turnable 3D model of the {page.structure.name} structure is only shown in game.</Note>
          <div className="mt-3">
            <GuideText markup={page.text} />
          </div>
        </>
      )
    case 'ore':
      return (
        <>
          <Heading page={page} />
          <div className="mb-3">
            <ItemRow item={page.item} />
          </div>
          <GuideText markup={page.text} />
          {page.placements?.length > 0 && (
            <table className="mt-3 w-full max-w-md border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-1 pr-4 font-medium">Vein</th>
                  <th className="py-1 pr-4 font-medium">Y levels</th>
                  <th className="py-1 font-medium">Veins per chunk</th>
                </tr>
              </thead>
              <tbody>
                {page.placements.map((p: { variant: string; min: number; max: number; veins?: number }, i: number) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-1 pr-4">{p.variant}</td>
                    <td className="py-1 pr-4">
                      {p.min} to {p.max}
                    </td>
                    <td className="py-1">{p.veins ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )
    case 'links':
      return (
        <>
          <Heading page={page} />
          <ul className="grid gap-1 sm:grid-cols-2">
            {page.entries.map((e: { label: string; href: string | null; icon?: string }, i: number) => (
              <li key={i}>
                {e.href ? (
                  <a href={e.href} className={`flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600 ${link}`}>
                    {e.icon && <img src={e.icon} alt="" className="h-5 w-5 [image-rendering:pixelated]" />}
                    {e.label}
                  </a>
                ) : (
                  <span className="block px-3 py-1.5 text-sm">{e.label}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <GuideText markup={page.text} />
          </div>
        </>
      )
    case 'suit_recipe':
      return (
        <>
          <Heading page={page} />
          {page.ingredients ? (
            <div className="flex flex-wrap gap-1">
              {page.ingredients.map((r: { name: string; count: number; icon?: string; options?: string[] }, i: number) => (
                <Tile key={i} name={r.name} icon={r.icon} count={r.count} options={r.options} />
              ))}
            </div>
          ) : (
            <Note>The recipe for this suit is not listed here.</Note>
          )}
          {page.ingredients && (
            <ul className={`mt-2 columns-1 text-sm sm:columns-2 ${muted}`}>
              {page.ingredients.map((r: { name: string; count: number }, i: number) => (
                <li key={i}>
                  {r.count} × {r.name}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <GuideText markup={page.text} />
          </div>
          {page.benchHref && (
            <p className="mt-2 text-sm">
              <a href={page.benchHref} className={link}>
                About the Suit Bench
              </a>
            </p>
          )}
        </>
      )
    case 'suit_stats':
      return (
        <>
          <Heading page={page} />
          {page.stats ? (
            <table className="w-full max-w-md border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="py-1 pr-4 font-medium">Stat</th>
                  <th className="py-1 pr-4 font-medium text-blue-700 dark:text-blue-400">Base (Common)</th>
                  <th className="py-1 font-medium text-amber-600 dark:text-amber-400">Max (Legendary)</th>
                </tr>
              </thead>
              <tbody>
                {page.stats.map((s: { label: string; min: number; max: number }, i: number) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-1 pr-4">{s.label}</td>
                    <td className="py-1 pr-4">{s.min}</td>
                    <td className="py-1">{s.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Note>Suit data is not available for this suit.</Note>
          )}
        </>
      )
    case 'suit_abilities':
      return (
        <>
          <Heading page={page} />
          {page.abilities.length === 0 ? (
            <p className={`text-sm italic ${muted}`}>No abilities listed.</p>
          ) : (
            <ul className="space-y-2">
              {page.abilities.map((a: { label: string; href: string; brief?: string }, i: number) => (
                <li key={i}>
                  <a href={a.href} className={`font-medium ${link}`}>
                    {a.label}
                  </a>
                  {a.brief && <p className={`text-sm ${muted}`}>{a.brief}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )
    case 'ability_data':
      return (
        <div className="space-y-3">
          <Heading page={page} />
          {page.stats.length > 0 && (
            <div>
              <p className="font-semibold text-blue-700 dark:text-blue-400">{page.title ? '' : 'Ability Stats'}</p>
              <ul className="text-sm">
                {page.stats.map((s: { label: string; value: string }, i: number) => (
                  <li key={i}>
                    {s.label}: {s.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {page.rulesText && (
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400">Ability Description</p>
              <GuideText markup={page.rulesText} />
            </div>
          )}
          {page.rulesSteps.length > 0 && (
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400">Ability Steps</p>
              <ul className="list-disc pl-5">
                {page.rulesSteps.map((s: string, i: number) => (
                  <li key={i}>
                    <GuideText markup={s} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(page.damageContext || page.damageNote) && (
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400">Damage Model</p>
              {page.damageContext && <p>{page.damageContext}</p>}
              {page.damageNote && <GuideText markup={`Note: ${page.damageNote}`} />}
            </div>
          )}
        </div>
      )
    case 'passive_description':
      return (
        <>
          <GuideText markup={page.description} />
          {page.effects.length > 0 && (
            <div className="mt-3">
              <p className="font-semibold text-amber-600 dark:text-amber-400">Relevant Effects</p>
              <ul className="list-disc pl-5">
                {page.effects.map((e: { label: string; href: string | null }, i: number) => (
                  <li key={i}>
                    {e.href ? (
                      <a href={e.href} className={link}>
                        {e.label}
                      </a>
                    ) : (
                      e.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )
    case 'ability_keybinds':
      return (
        <>
          <h2 className="mb-2 text-lg font-semibold text-amber-600 dark:text-amber-400">{page.title ?? 'Keybinds'}</h2>
          <ul className="space-y-1.5">
            {page.rows.map((r: { action: string; keys: { key?: string; name: string }[]; note?: string }, i: number) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {r.action && <span className="font-medium">{r.action}:</span>}
                {r.keys.length === 0 ? (
                  <span className={muted}>N/A</span>
                ) : (
                  r.keys.map((k, j) => (
                    <span key={j} className="inline-flex items-center gap-1" title={k.name}>
                      <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-800">{k.key ?? k.name}</kbd>
                      {k.key && <span className={`text-xs ${muted}`}>{k.name}</span>}
                    </span>
                  ))
                )}
                {r.note && <span className={muted}>— {r.note}</span>}
              </li>
            ))}
          </ul>
          {page.footer && (
            <div className="mt-2">
              <GuideText markup={page.footer} />
            </div>
          )}
        </>
      )
    case 'ability_animation_api':
      return (
        <>
          <Heading page={page} />
          <ul className="list-disc pl-5 text-sm">
            {page.animations.map((a: { label: string }, i: number) => (
              <li key={i}>{a.label}</li>
            ))}
          </ul>
          <div className="mt-2">
            <Note>These animations can be previewed in game from the guide.</Note>
          </div>
        </>
      )
    case 'ability_items':
      return (
        <>
          <Heading page={page} />
          <div className="mb-2 flex flex-wrap gap-1">
            {page.items.map((it: { name: string; icon?: string }, i: number) => (
              <Tile key={i} name={it.name} icon={it.icon} />
            ))}
          </div>
          <GuideText markup={page.text} />
        </>
      )
    default:
      return <Note>This part of the guide ({page.original ?? page.type}) is only shown in game.</Note>
  }
}

/** An entry's pages as one column, like the game: a block per page with a hairline between. */
export function GuidePages({ pages }: { pages: BookPage[] }) {
  return (
    <div className="mt-6">
      {pages.map((page, i) => (
        <section key={i} id={page.anchor ?? `p${i}`} className="scroll-mt-4 border-t border-neutral-200 py-5 first:border-t-0 first:pt-0 dark:border-neutral-800">
          <PageBody page={page} />
        </section>
      ))}
    </div>
  )
}
