import { createFileRoute } from '@tanstack/react-router'

import { ListingPage } from '../components/ListingPage'

export const Route = createFileRoute('/curseforge')({
  head: () => ({ meta: [{ title: 'CurseForge listing — Thematic' }, { name: 'robots', content: 'noindex' }] }),
  component: () => <ListingPage platform="curseforge" />,
})
