import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts, Link } from '@tanstack/react-router'
import { Analytics } from '@vercel/analytics/react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Thematic — Superhero Suits for Minecraft (Fabric)' },
      {
        name: 'description',
        content:
          'Thematic is a Minecraft Fabric mod that adds craftable superhero and supervillain suits from DC, Marvel, The Boys, and Invincible, each with unique powers.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
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

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 text-sm font-medium">
            <Link to="/" className="text-base font-semibold">
              Thematic
            </Link>
            <Link to="/suits" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
              Suits
            </Link>
            <Link to="/abilities" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
              Abilities
            </Link>
            <Link to="/book" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
              Guidebook
            </Link>
            <Link to="/faq" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
              FAQ
            </Link>
            <Link
              to="/play"
              className="ml-auto rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Play Now
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 py-10 text-sm text-neutral-500 dark:text-neutral-500">
          Thematic is an unofficial fan project, not affiliated with or endorsed by Mojang, Microsoft, DC, Marvel, Amazon, Skybound, or any other rights
          holder. All characters and trademarks belong to their respective owners. Not an official Minecraft product.
        </footer>
        <Analytics />
        <Scripts />
      </body>
    </html>
  )
}
