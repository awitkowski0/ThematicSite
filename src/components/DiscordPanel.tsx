import { useEffect, useState } from 'react'

// Fetched client-side only — online counts change constantly, so this has no business
// being baked into the build. Discord's widget.json endpoint is CORS-open by design for
// exactly this kind of embed (confirmed against the real guild before shipping this).
const WIDGET_URL = 'https://discord.com/api/guilds/705669454943486034/widget.json'
const POLL_INTERVAL_MS = 60_000

interface DiscordWidget {
  name: string
  instant_invite: string | null
  presence_count: number
  members: { id: string; username: string; avatar_url: string }[]
}

export function DiscordPanel() {
  const [widget, setWidget] = useState<DiscordWidget | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(WIDGET_URL)
        if (!res.ok) throw new Error(`widget.json ${res.status}`)
        const data = (await res.json()) as DiscordWidget
        if (!cancelled) {
          setWidget(data)
          setFailed(false)
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Fails quiet — the Discord widget being unreachable (server setting off, network
  // hiccup) shouldn't leave a broken-looking box on the homepage.
  if (failed || !widget) return null

  return (
    <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{widget.name}</div>
        {widget.presence_count > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {widget.presence_count} online
          </div>
        )}
      </div>

      {widget.members.length > 0 && (
        <div className="mt-4 flex -space-x-2">
          {widget.members.slice(0, 12).map((member) => (
            <img
              key={member.id}
              src={member.avatar_url}
              alt={member.username}
              title={member.username}
              className="h-8 w-8 rounded-full border-2 border-white dark:border-neutral-950"
            />
          ))}
        </div>
      )}

      {widget.instant_invite && (
        <a
          href={widget.instant_invite}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-md bg-[#5865F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752C4]"
        >
          Join the Discord
        </a>
      )}
    </div>
  )
}
