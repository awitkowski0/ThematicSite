import type { PackHeading } from '../lib/packs'

function List({ headings }: { headings: PackHeading[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {headings.map((h) => (
        <li key={h.id} className={h.depth === 3 ? 'pl-3' : ''}>
          <a href={`#${h.id}`} className={`block truncate hover:text-blue-400 hover:underline ${h.depth === 3 ? 'text-neutral-500' : 'text-neutral-300'}`}>
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** "On this page": collapsed above the content on small screens, sticky beside it on wide ones. */
export function PackToc({ headings }: { headings: PackHeading[] }) {
  if (headings.length === 0) return null
  return (
    <>
      <details className="tb-inset mb-6 rounded-md p-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-neutral-300">On this page</summary>
        <div className="mt-3 max-h-80 overflow-y-auto">
          <List headings={headings} />
        </div>
      </details>
      <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] self-start overflow-y-auto lg:block">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">On this page</div>
        <List headings={headings} />
      </aside>
    </>
  )
}
