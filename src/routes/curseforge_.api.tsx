import { createFileRoute } from '@tanstack/react-router'

import { ListingPage } from '../components/ListingPage'

export const Route = createFileRoute('/curseforge_/api')({
  head: () => ({ meta: [{ title: 'CurseForge listing (core) — Thematic' }, { name: 'robots', content: 'noindex' }] }),
  component: () => <ListingPage platform="curseforge" project="api" />,
})
