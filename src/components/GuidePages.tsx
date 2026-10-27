import type { ReactNode } from 'react'

import type { BookPage } from '../lib/book'
import { GuideInline, GuideText } from './GuideText'
import { SuitStill } from './SuitStill'
import { getSuit } from '../lib/suits'

// One component per page type of the in-game guide (GuideSchema.java). The game draws some of them
// from live data (a suit's stats, an ability's numbers); the export writes that data out, so the
// web version shows the same things as plain content. What cannot be drawn on a web page (a 3D
// structure model, an animation preview) shows a short note in its place; suit figures are drawn.

const muted = 'text-neutral-400'
const link = 'text-blue-400 hover:underline'

function Heading({ page }: { page: BookPage }) {
  if (!page.title) return null
  return (
    <h2 className="mb-3 flex items-center gap-2">
      {page.icon && <img src={page.icon} alt="" className="h-5 w-5 [image-rendering:pixelated]" />}
      <GuideInline markup={page.title} />
    </h2>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="tb-note">{children}</p>
}

function Tile({ name, icon, count, options }: { name: string; icon?: string; count?: number; options?: string[] }) {
  const title = options?.length ? `${name}: ${options.join(', ')}` : name
  return (
    <span
      title={title}
      className="tb-slot relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden p-0.5 text-center text-[9px] leading-tight text-neutral-400"
    >
      {icon ? <img src={icon} alt={name} loading="lazy" className="h-9 w-9 [image-rendering:pixelated]" /> : <span className="line-clamp-4 break-words">{name}</span>}
      {count !== undefined && count > 1 && <span className="absolute bottom-0 right-0.5 text-[11px] font-bold text-white [text-shadow:1px_1px_0_#000]">{count}</span>}
    </span>
  )
}

function ItemRow({ item }: { item: { name: string; icon?: string } }) {
  return (
    <span className="inline-flex items-center gap-3">
      <Tile name={item.name} icon={item.icon} />
      <span className="font-semibold text-white">{item.name}</span>
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
      <p className="tb-label mb-2">{recipe.label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${recipe.cols}, 3rem)` }}>
          {recipe.cells.map((cell: any, i: number) => (cell ? <Tile key={i} name={cell.name} icon={cell.icon} options={cell.options} /> : <span key={i} className="tb-slot h-12 w-12" />))}
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

/** A figure page: the suit inked in a newsprint panel with its name under it; a mob is named, its model is in game only. */
function FigureCard({ page, shiny }: { page: BookPage; shiny?: boolean }) {
  const suit = page.suit ? getSuit(page.suit.id) : undefined
  const texture = shiny ? suit?.shinyTexturePath : suit?.texturePath
  const label = page.name ?? page.suit?.name ?? page.entity?.name
  return (
    <figure>
      {suit?.geoPath && texture ? (
        <div className="tb-panel">
          <SuitStill geoPath={suit.geoPath} texturePath={texture} hiddenBones={suit.hiddenBones} cape={suit.cape} shiny={shiny} name={`${page.suit.name}${shiny ? ' (shiny)' : ''}`} />
        </div>
      ) : null}
      <figcaption className="mt-2 text-sm">
        {page.suit?.href ? (
          <a href={page.suit.href} className="font-semibold text-white hover:underline">
            {shiny ? 'Shiny' : label}
          </a>
        ) : (
          <span className="font-semibold text-white">{label}</span>
        )}
        {page.suit && !shiny && page.name && page.name !== page.suit.name && <span className="block text-xs text-neutral-500">{page.suit.name}</span>}
        {!suit?.geoPath && <span className="tb-note block">{page.suit ? 'The 3D model of this suit is shown in game.' : 'The 3D model is shown in game.'}</span>}
      </figcaption>
      {page.text && (
        <div className="mt-2 text-sm">
          <GuideText markup={page.text} />
        </div>
      )}
    </figure>
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
                <img key={i} src={img.src} alt={img.alt} loading="lazy" className={`max-w-full ${page.border ? 'tb-inset p-1' : ''}`} />
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
      return <FigureCard page={page} />
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
            <table className="tb-table mt-3 max-w-md">
              <thead>
                <tr>
                  <th>Vein</th>
                  <th>Y levels</th>
                  <th>Veins per chunk</th>
                </tr>
              </thead>
              <tbody>
                {page.placements.map((p: { variant: string; min: number; max: number; veins?: number }, i: number) => (
                  <tr key={i}>
                    <td>{p.variant}</td>
                    <td>
                      {p.min} to {p.max}
                    </td>
                    <td>{p.veins ?? '—'}</td>
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
                  <a href={e.href} className="tb-raised flex items-center gap-2 rounded-md px-3 py-1.5 text-sm">
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
            <table className="tb-table max-w-md">
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>Base (Common)</th>
                  <th>Max (Legendary)</th>
                </tr>
              </thead>
              <tbody>
                {page.stats.map((s: { label: string; min: number; max: number }, i: number) => (
                  <tr key={i}>
                    <td>{s.label}</td>
                    <td>{s.min}</td>
                    <td>{s.max}</td>
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
            <Note>No abilities listed.</Note>
          ) : (
            <ul className="space-y-2">
              {page.abilities.map((a: { label: string; href: string; brief?: string }, i: number) => (
                <li key={i}>
                  <a href={a.href} className="font-semibold text-white hover:underline">
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
              {!page.title && <p className="tb-label mb-2">Ability stats</p>}
              <dl className="tb-inset grid grid-cols-2 gap-x-6 gap-y-2 rounded-md p-3 text-sm sm:grid-cols-3">
                {page.stats.map((s: { label: string; value: string }, i: number) => (
                  <div key={i}>
                    <dt className="text-xs text-neutral-500">{s.label}</dt>
                    <dd className="font-semibold tabular-nums text-white">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {page.rulesText && (
            <div>
              <p className="tb-label mb-1">What it does</p>
              <GuideText markup={page.rulesText} />
            </div>
          )}
          {page.rulesSteps.length > 0 && (
            <div>
              <p className="tb-label mb-1">Step by step</p>
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
              <p className="tb-label mb-1">Damage</p>
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
              <p className="tb-label mb-1">Related effects</p>
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
          <h2 className="mb-3">{page.title ?? 'Keybinds'}</h2>
          <ul className="space-y-1.5">
            {page.rows.map((r: { action: string; keys: { key?: string; name: string }[]; note?: string }, i: number) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {r.action && <span className="font-semibold text-white">{r.action}:</span>}
                {r.keys.length === 0 ? (
                  <span className={muted}>N/A</span>
                ) : (
                  r.keys.map((k, j) => (
                    <span key={j} className="inline-flex items-center gap-1" title={k.name}>
                      <kbd className="tb-raised rounded-md px-1.5 py-0.5 font-mono text-xs text-white">{k.key ?? k.name}</kbd>
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

/** Pages in order, with each run of figure pages gathered into one grid (an alt list, a shiny pair). */
function blocks(pages: BookPage[]): ({ figures: BookPage[]; at: number } | { page: BookPage; at: number })[] {
  const out: ({ figures: BookPage[]; at: number } | { page: BookPage; at: number })[] = []
  pages.forEach((page, at) => {
    const last = out[out.length - 1]
    if (page.type === 'figure' && last && 'figures' in last) last.figures.push(page)
    else out.push(page.type === 'figure' ? { figures: [page], at } : { page, at })
  })
  return out
}

/** An entry's pages as one column, like the game: a block per page with a hairline between. {@code shinies} shows each suit beside its shiny look. */
export function GuidePages({ pages, shinies }: { pages: BookPage[]; shinies?: boolean }) {
  return (
    <div className="mt-2">
      {blocks(pages).map((block) => (
        <section
          key={block.at}
          id={'page' in block ? (block.page.anchor ?? `p${block.at}`) : `p${block.at}`}
          className="scroll-mt-20 border-t border-neutral-800 py-6 first:border-t-0 first:pt-0"
        >
          {'page' in block ? (
            <PageBody page={block.page} />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {block.figures.flatMap((f, i) => {
                const cards = [<FigureCard key={i} page={f} />]
                if (shinies && f.suit && getSuit(f.suit.id)?.shinyTexturePath) cards.push(<FigureCard key={`${i}s`} page={f} shiny />)
                return cards
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
