// Header search: a trigger plus a command-palette dialog over suits, abilities, the wiki, pages and pack docs.
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { Kind, SearchIndex, SearchResult } from '../lib/search'

const GROUP_SIZE = 8

const SHORTCUTS = [
  { name: 'Roster', secondary: 'Every suit and how to craft it', href: '/suits' },
  { name: 'Abilities', secondary: 'Every ability with its numbers', href: '/abilities' },
  { name: 'Wiki', secondary: 'Every page of the in-game wiki', href: '/wiki' },
  { name: 'Packs', secondary: 'Make your own suits and abilities', href: '/packs' },
]

// The index is built once, on first use, so the header does not carry the data.
let indexPromise: Promise<{ index: SearchIndex; run: typeof import('../lib/search').search; labels: typeof import('../lib/search').KIND_LABEL }> | undefined

function loadIndex() {
  indexPromise ??= Promise.all([
    import('../lib/search'),
    import('../lib/suits'),
    import('../lib/book'),
    import('../lib/sections'),
    import('../lib/packs'),
  ]).then(([search, suits, book, sections, packs]) => ({
    index: search.buildIndex({
      suits: suits.suits,
      bookCategories: book.bookCategories,
      sections: sections.SECTIONS,
      packDocs: packs.packDocs, // pack docs: /packs/<slug>
    }),
    run: search.search,
    labels: search.KIND_LABEL,
  }))
  return indexPromise
}

interface Row {
  key: string
  name: string
  secondary: string
  href: string
  icon?: string
  tag?: string
  ranges: [number, number][]
}

interface Group {
  kind: Kind | 'shortcuts'
  label: string
  total: number
  rows: Row[]
}

function Highlighted({ text, ranges }: { text: string; ranges: [number, number][] }) {
  if (!ranges.length) return <>{text}</>
  const parts: React.ReactNode[] = []
  let at = 0
  for (const [a, b] of ranges) {
    if (a > at) parts.push(text.slice(at, a))
    parts.push(
      <span key={a} className="font-semibold text-white">
        {text.slice(a, b)}
      </span>,
    )
    at = b
  }
  if (at < text.length) parts.push(text.slice(at))
  return <>{parts}</>
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 4 4" strokeLinecap="round" />
    </svg>
  )
}

function isTyping(el: Element | null) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable
}

export function SiteSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [engine, setEngine] = useState<Awaited<ReturnType<typeof loadIndex>>>()
  const [mac, setMac] = useState(true)
  const navigate = useNavigate()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const listId = useId()

  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), [])

  const show = useCallback(() => {
    returnTo.current = document.activeElement as HTMLElement | null
    setOpen(true)
  }, [])
  const hide = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
    setExpanded(new Set())
    const back = returnTo.current?.isConnected ? returnTo.current : trigger.current
    back?.focus()
  }, [])

  // global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        return open ? hide() : show()
      }
      if (e.key === '/' && !open && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(document.activeElement)) {
        e.preventDefault()
        show()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, show, hide])

  // load the data on first open and lock page scroll while it is up
  useEffect(() => {
    if (!open) return
    let live = true
    loadIndex().then((e) => live && setEngine(e))
    input.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      live = false
      document.body.style.overflow = overflow
    }
  }, [open])

  const response = useMemo(() => (engine && query.trim() ? engine.run(engine.index, query) : undefined), [engine, query])

  const groups = useMemo<Group[]>(() => {
    if (!query.trim()) {
      return [{ kind: 'shortcuts', label: 'Jump to', total: SHORTCUTS.length, rows: SHORTCUTS.map((s) => ({ key: s.href, ranges: [], ...s })) }]
    }
    if (!response || !engine) return []
    const byKind = new Map<Kind, SearchResult[]>()
    for (const r of response.results) byKind.set(r.item.kind, [...(byKind.get(r.item.kind) ?? []), r])
    // groups ordered by their best hit
    return [...byKind.entries()]
      .sort((a, b) => b[1][0].score - a[1][0].score)
      .map(([kind, list]) => ({
        kind,
        label: engine.labels[kind],
        total: list.length,
        rows: (expanded.has(kind) ? list : list.slice(0, GROUP_SIZE)).map((r) => ({
          key: `${kind}:${r.item.id}`,
          name: r.item.name,
          secondary: r.item.secondary,
          href: r.item.href,
          icon: r.item.icon,
          tag: r.item.tag,
          ranges: r.ranges,
        })),
      }))
  }, [query, response, engine, expanded])

  const rows = useMemo(() => groups.flatMap((g) => g.rows), [groups])
  const rowIndex = (key: string) => rows.findIndex((r) => r.key === key)

  const choose = useCallback(
    (row: Row) => {
      hide()
      const url = new URL(row.href, 'http://x')
      const search = Object.fromEntries(url.searchParams)
      navigate({ to: url.pathname, search: Object.keys(search).length ? search : undefined, hash: url.hash.slice(1) || undefined } as never)
    },
    [hide, navigate],
  )

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!rows.length) return
      const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length
      setActive(next)
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (rows[active]) choose(rows[active])
    }
  }

  // Esc closes; Tab stays inside the panel
  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      hide()
    } else if (e.key === 'Tab') {
      const stops = [...(panel.current?.querySelectorAll<HTMLElement>('input, button:not([tabindex="-1"])') ?? [])]
      if (!stops.length) return
      const first = stops[0]
      const last = stops[stops.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const hint = mac ? '⌘K' : 'Ctrl K'

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={show}
        onMouseEnter={() => void loadIndex()}
        onFocus={() => void loadIndex()}
        aria-label="Search the site"
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-md border border-divider bg-paper px-2.5 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-hover-row hover:text-white"
      >
        <SearchIcon className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden font-sans text-xs text-neutral-500 md:inline">{hint}</kbd>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh]" onKeyDown={onPanelKey}>
            <div className="absolute inset-0 bg-black/60" onMouseDown={hide} aria-hidden="true" />
            <div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className="relative flex max-h-[80vh] w-full max-w-xl flex-col border border-divider bg-paper shadow-xl shadow-black/40"
            >
              <div className="flex items-center gap-2 border-b border-divider p-3">
                <input
                  ref={input}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActive(0)
                  }}
                  onKeyDown={onInputKey}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
                  aria-autocomplete="list"
                  placeholder="Search suits, abilities, the wiki…"
                  autoComplete="off"
                  spellCheck={false}
                  className="tb-inset min-w-0 flex-1 px-3 py-2 text-base text-white placeholder:text-neutral-500 focus:outline-none"
                />
                <button type="button" onClick={hide} className="px-2 py-1 text-xs text-neutral-400 hover:text-white">
                  Esc
                </button>
              </div>

              <div id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-2">
                {!engine && query.trim() && <p className="px-2 py-6 text-center text-sm text-neutral-500">Loading…</p>}

                {response?.suggestion && (
                  <p className="px-2 pb-2 pt-1 text-sm text-neutral-400">
                    Did you mean{' '}
                    <button
                      type="button"
                      className="font-semibold text-white underline decoration-neutral-600 underline-offset-2 hover:decoration-white"
                      onClick={() => {
                        setQuery(response.suggestion!)
                        setActive(0)
                        input.current?.focus()
                      }}
                    >
                      {response.suggestion}
                    </button>
                    ?
                  </p>
                )}

                {engine && query.trim() && !rows.length && (
                  <p className="px-2 py-6 text-center text-sm text-neutral-500">No results for “{query.trim()}”.</p>
                )}

                {groups.map((g) => (
                  <section key={g.kind} aria-label={g.label} className="mb-2 last:mb-0">
                    <h2 className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-selected">{g.label}</h2>
                    {g.rows.map((row) => {
                      const i = rowIndex(row.key)
                      return (
                        <a
                          key={row.key}
                          id={`${listId}-${i}`}
                          role="option"
                          aria-selected={i === active}
                          href={row.href}
                          tabIndex={-1}
                          onMouseMove={() => i !== active && setActive(i)}
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return
                            e.preventDefault()
                            choose(row)
                          }}
                          className={`flex items-center gap-3 px-2 py-1.5 ${i === active ? 'bg-pressed' : 'hover:bg-hover-row'}`}
                        >
                          {row.icon && <img src={row.icon} alt="" className="size-5 shrink-0 [image-rendering:pixelated]" loading="lazy" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-neutral-300">
                              <Highlighted text={row.name} ranges={row.ranges} />
                            </span>
                            <span className="block truncate text-xs text-neutral-500">{row.secondary}</span>
                          </span>
                          {row.tag && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{row.tag}</span>}
                        </a>
                      )
                    })}
                    {g.total > g.rows.length && g.kind !== 'shortcuts' && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpanded((s) => new Set(s).add(g.kind))
                          input.current?.focus()
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs text-neutral-400 hover:bg-hover-row hover:text-white"
                      >
                        Show all {g.total}
                      </button>
                    )}
                  </section>
                ))}
              </div>

              <div className="hidden items-center gap-4 border-t border-divider px-3 py-2 text-xs text-neutral-500 sm:flex">
                <span>↑↓ to move</span>
                <span>Enter to open</span>
                <span>Esc to close</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
