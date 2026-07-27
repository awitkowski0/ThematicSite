import { CONTRIBUTORS, SUPPORTERS, TEAM, TEAM_LAST_UPDATED, TeamMember, headUrl } from '../lib/team'

function PeopleGrid({ people }: { people: TeamMember[] }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {people.map((member) => (
        <li key={member.username} className="flex items-center gap-2.5">
          {/* alt="" on purpose: the username sits right next to it, so alt text would
              just duplicate it if minotar.net is unreachable. */}
          <img
            src={headUrl(member.username, 64)}
            alt=""
            width={32}
            height={32}
            loading="lazy"
            className="h-8 w-8 shrink-0 rounded bg-neutral-100 dark:bg-neutral-900"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{member.username}</span>
            {member.roles?.length ? <span className="block truncate text-xs text-neutral-500">{member.roles.join(' · ')}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Credits() {
  return (
    <>
      <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">Team</h2>
        <PeopleGrid people={TEAM} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Contributors</h2>
        <PeopleGrid people={CONTRIBUTORS} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Supporters</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Thanks to everyone supporting the server.</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {SUPPORTERS.map((member) => (
            <li key={member.username} className="flex items-center gap-2">
              <img
                src={headUrl(member.username, 64)}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                className="h-5 w-5 shrink-0 rounded bg-neutral-100 dark:bg-neutral-900"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-sm">{member.username}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs text-neutral-500">
        Credits last updated{' '}
        <time dateTime={TEAM_LAST_UPDATED}>
          {new Date(`${TEAM_LAST_UPDATED}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
        </time>
        . Missing or wrong? Let us know on Discord.
      </p>
    </>
  )
}
