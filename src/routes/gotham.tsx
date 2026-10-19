import { createFileRoute, redirect } from '@tanstack/react-router'

// The old Gotham page (live map + leaderboards) became /server.
export const Route = createFileRoute('/gotham')({
  beforeLoad: () => {
    throw redirect({ to: '/server', statusCode: 301 })
  },
})
