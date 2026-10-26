import { createFileRoute } from '@tanstack/react-router'

import { ListingPage } from '../components/ListingPage'

export const Route = createFileRoute('/modrinth_/api')({
  head: () => ({ meta: [{ title: 'Modrinth listing (core) — Thematic' }, { name: 'robots', content: 'noindex' }] }),
  component: () => <ListingPage platform="modrinth" project="api" />,
})
