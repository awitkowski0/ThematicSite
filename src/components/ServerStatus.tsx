import { useState } from 'react'

import { SERVER_ADDRESS, useServerStatus, type RealmStatus } from '../lib/serverStatus'

function CopyAddress() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard
      ?.writeText(SERVER_ADDRESS)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700">
      <code className="px-3 py-1.5 text-sm font-medium">{SERVER_ADDRESS}</code>
      <button
        type="button"
        onClick={copy}
        className="border-l border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function JoinHero() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <CopyAddress />
      <span className="text-sm text-neutral-600 dark:text-neutral-400">Minecraft 1.20.1 · Fabric</span>
    </div>
  )
}

function Dot({ online }: { online: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-neutral-600'}`} />
}

function Names({ names, players }: { names: string[]; players: number }) {
  if (players === 0) return <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Nobody is online right now.</p>
  if (names.length === 0) return null
  return (
    <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
      {names.join(', ')}
      {players > names.length && ` and ${players - names.length} more`}
    </p>
  )
}

function RealmCard({ realm }: { realm: RealmStatus }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Dot online={realm.online} />
          {realm.label}
        </h3>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{realm.online ? 'Online' : 'Offline'}</span>
      </div>
      {realm.online ? (
        <>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {realm.players}
            <span className="text-sm font-normal text-neutral-500"> / {realm.max}</span>
          </div>
          <Names names={realm.sample} players={realm.players} />
        </>
      ) : (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Not responding.</p>
      )}
    </div>
  )
}

export function ServerStatus() {
  const { data, error, loading } = useServerStatus()

  if (loading && !data) return <p className="text-sm text-neutral-500 dark:text-neutral-400">Checking the server…</p>
  if (!data) return <p className="text-sm text-neutral-500 dark:text-neutral-400">Couldn't check the server right now{error ? ` (${error})` : ''}.</p>

  const { server, realms } = data

  return (
    <div>
      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Dot online={server.online} />
            {server.online ? 'Online' : 'Offline'}
          </h3>
          {server.online && server.latencyMs != null && (
            <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {server.version && `${server.version} · `}
              {server.latencyMs} ms
            </span>
          )}
        </div>
        {server.online ? (
          <>
            <div className="mt-3 text-3xl font-bold tabular-nums">
              {data.total}
              <span className="text-base font-normal text-neutral-500"> / {server.max} players</span>
            </div>
            {server.motd && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{server.motd}</p>}
            <Names names={server.sample} players={server.players} />
          </>
        ) : (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">The server isn't answering right now. It may be restarting; check back in a minute.</p>
        )}
      </div>

      {realms.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {realms.map((r) => (
            <RealmCard key={r.id} realm={r} />
          ))}
        </div>
      )}
    </div>
  )
}
