import { createFileRoute } from '@tanstack/react-router'

import { ListingPage } from '../components/ListingPage'

export const Route = createFileRoute('/modrinth')({
  head: () => ({ meta: [{ title: 'Modrinth listing — Thematic' }, { name: 'robots', content: 'noindex' }] }),
  component: () => <ListingPage platform="modrinth" />,
})
