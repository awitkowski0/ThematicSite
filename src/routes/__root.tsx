import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts, Link, useRouterState } from '@tanstack/react-router'

import { SECTIONS, sectionFor } from '../lib/sections'
import { SiteSearch } from '../components/SiteSearch'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Thematic: superhero suits for Minecraft' },
      {
        name: 'description',
        content:
          'Thematic is a Minecraft Fabric mod that adds craftable superhero and supervillain suits from DC, Marvel, The Boys, and Invincible, each with unique powers.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      // the pixel face for banners and labels, after the tablet's Minecraft font
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap' },
      // The mod's own CurseForge project icon, checked in at public/icon.png so the site
      // doesn't depend on forgecdn being reachable at page load.
      { rel: 'icon', type: 'image/png', href: '/icon.png' },
      { rel: 'apple-touch-icon', href: '/icon.png' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

/** The open area's tabs across the top of the page, when it has more than one. */
function SectionTabs() {
  const path = useRouterState({ select: (st) => st.location.pathname })
  const here = sectionFor(path)
  if (!here || here.section.tabs.length < 2) return null
  return (
    <nav aria-label={here.section.label} className="-mt-2 mb-6 flex flex-wrap gap-x-1 border-b border-neutral-800 text-sm">
      {here.section.tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={`-mb-px border-b-2 px-2.5 py-2 ${t === here.tab ? 'border-selected text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

function HeaderNav() {
  const path = useRouterState({ select: (st) => st.location.pathname })
  const active = sectionFor(path)?.section.id
  return (
    <>
      {SECTIONS.map((s) => (
        <Link
          key={s.id}
          to={s.to}
          className={`border-b-2 px-2 py-1.5 ${s.id === active ? 'border-accent text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}
        >
          {s.label}
        </Link>
      ))}
    </>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen">
        {/* the tablet's header bar */}
        <header className="sticky top-0 z-20 border-b border-divider bg-header/95 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2 text-sm font-medium">
            <Link to="/" className="mr-3 font-pixel text-lg font-bold tracking-wide text-white [text-shadow:2px_2px_0_#0a0a0c]">
              THEMATIC
            </Link>
            <HeaderNav />
            <div className="ml-auto flex items-center gap-2">
              <SiteSearch />
              <Link to="/play" className="tb-button px-3 py-1.5">
                Play Now
              </Link>
            </div>
          </nav>
        </header>
        {/* the page: the wiki's reading column */}
        <main className="mx-auto max-w-5xl border-x border-b border-divider bg-paper px-4 py-8 shadow-[0_8px_24px_rgb(0_0_0/0.4)] sm:px-8 sm:py-10">
          <SectionTabs />
          {children}
        </main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-500 sm:px-8">
          Thematic is an unofficial fan project, not affiliated with or endorsed by Mojang, Microsoft, DC, Marvel, Amazon, Skybound, or any other rights
          holder. All characters and trademarks belong to their respective owners. Not an official Minecraft product.
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
