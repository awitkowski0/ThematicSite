// Single source for credits — rendered as avatars on the site by <Credits>, and flattened
// to plain text for the /md feeds, so the two can't drift apart.
export interface TeamMember {
  /** Minecraft username — also what the head avatar is looked up by. */
  username: string
  /** Can be more than one; some people wear several hats. Omit to show just the name. */
  roles?: string[]
}

// Bump this by hand whenever the lists below change — it's the date shown under the
// credits. Deliberately NOT the build date, which would keep "updating" on every
// unrelated deploy and imply the roster was reviewed when it wasn't.
export const TEAM_LAST_UPDATED = '2026-07-27'

export const TEAM: TeamMember[] = [
  { username: 'funalex', roles: ['Developer'] },
  { username: 'BBovard', roles: ['Lead Modeler'] },
  { username: 'ReadTheFish', roles: ['Modeler', 'Developer'] },
  { username: 'RealDerpyNarwhal', roles: ['Developer'] },
  { username: 'soanoki', roles: ['Developer'] },
  { username: 'qualnard1_', roles: ['Animator'] },
  { username: 'bardock1_', roles: ['Community Manager'] },
  { username: 'halflime_', roles: ['Builder'] },
]

// Roles are optional here — name a contribution when it's worth calling out, otherwise
// "Contributor" under a heading that already says Contributors is just noise.
export const CONTRIBUTORS: TeamMember[] = [
  { username: 'wonderman21', roles: ['Modeler'] },
  { username: 'robin_cosmic', roles: ['Developer'] },
  { username: 'dempsity', roles: ['Sounds'] },
  { username: '_beann', roles: ['Former Builder'] },
]

// Members of the `super` group on the official server, from `lp group super listmembers`.
// Alphabetised rather than left in LuckPerms' order so it doesn't read as a ranking.
// Hand-synced — LuckPerms has no public API here, so re-run that command and update this
// list (and TEAM_LAST_UPDATED) when it changes.
//
// Dropped from the raw output: a bare UUID (d8d5a923-…) that resolves to the account
// "Test", and funalex (the mod's own author). Other staff who support ARE listed here as
// well as above — leaving them out would undercount supporters.
export const SUPPORTERS: TeamMember[] = [
  { username: '_fungi' },
  { username: 'bardock1_' },
  { username: 'chasemate47' },
  { username: 'dempsity' },
  { username: 'devcoolfire' },
  { username: 'digitaldesign' },
  { username: 'halflime_' },
  { username: 'hooper_3000' },
  { username: 'infernal_hulk' },
  { username: 'jcr2k3' },
  { username: 'karakent' },
  { username: 'milkincereal' },
  { username: 'misterymouse' },
  { username: 'ninjagamer11755' },
  { username: 'qualnard1_' },
  { username: 'realderpynarwhal' },
  { username: 'robin_cosmic' },
  { username: 'somebody576' },
  { username: 'spoonder_man' },
  { username: 'starbornwolf' },
  { username: 'stumpbunch05' },
  { username: 'wonderman21' },
  { username: 'yerd_' },
]

// minotar.net renders a Minecraft player's head (helm layer included) straight from a
// username — no UUID lookup or API key needed. Unknown names fall back to the default
// Steve head rather than erroring, so a typo degrades quietly instead of breaking layout.
export function headUrl(username: string, size = 64): string {
  return `https://minotar.net/helm/${encodeURIComponent(username)}/${size}.png`
}

// Plain text only — this feeds /md/mod-description, which gets pasted into CurseForge and
// Modrinth. Avatars are a website affordance; a wall of inline <img> tags in a mod
// description reads badly and breaks if the head service is unreachable.
export function creditsMarkdown(): string {
  const line = (m: TeamMember) => (m.roles?.length ? `- ${m.username} — ${m.roles.join(', ')}` : `- ${m.username}`)
  return [
    '**Team**',
    '',
    ...TEAM.map(line),
    '',
    '**Contributors**',
    '',
    ...CONTRIBUTORS.map(line),
    '',
    '**Supporters**',
    '',
    SUPPORTERS.map((m) => m.username).join(', '),
    '',
    `*Credits last updated ${TEAM_LAST_UPDATED}.*`,
  ].join('\n')
}
