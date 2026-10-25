import { Link } from '@tanstack/react-router'

import { SECTIONS } from '../lib/sections'

/** Every area of the site with its pages, from the same map as the header. */
export function SiteIndex() {
  return (
    <section className="mt-10">
      <h2>Everything on the site</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <li key={s.id} className="tb-raised flex flex-col rounded-md p-4">
            <Link to={s.to} className="font-semibold text-white hover:underline">
              {s.label}
            </Link>
            <p className="mt-1 text-sm text-neutral-400">{s.description}</p>
            {s.tabs.length > 1 && (
              <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {s.tabs.map((t) => (
                  <li key={t.to}>
                    <Link to={t.to} title={t.description} className="text-blue-400 hover:underline">
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
