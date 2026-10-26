import modDescriptionRaw from '../content/mod-description.md?raw'
import faqRaw from '../content/faq.md?raw'
import playRaw from '../content/play.md?raw'
import listingRaw from '../content/listing.md?raw'
import listingApiRaw from '../content/listing-api.md?raw'
import stats from '../data/stats.generated.json'
import { creditsMarkdown } from './team'

const CONTENT: Record<string, string> = {
  'mod-description': modDescriptionRaw,
  faq: faqRaw,
  play: playRaw,
}

export const SITE_URL = 'https://thematic.bond'

/** The platforms the mod is listed on. */
export const PLATFORMS = {
  curseforge: { name: 'CurseForge', app: 'The CurseForge app' },
  modrinth: { name: 'Modrinth', app: 'The Modrinth App' },
} as const
export type Platform = keyof typeof PLATFORMS

/** The two projects on each platform: the suits, and the core they run on. */
export const PROJECTS = {
  heroes: {
    name: 'Thematic: Heroes',
    raw: listingRaw,
    urls: { curseforge: 'https://www.curseforge.com/minecraft/mc-mods/thematic-superheroes', modrinth: 'https://modrinth.com/mod/thematic-superheroes' },
  },
  api: {
    name: 'Thematic (core)',
    raw: listingApiRaw,
    urls: { curseforge: 'https://www.curseforge.com/minecraft/mc-mods/thematic-api', modrinth: 'https://modrinth.com/mod/thematic-api' },
  },
} as const
export type Project = keyof typeof PROJECTS

/** The /md slug of one listing: "curseforge" for the suits, "curseforge-api" for the core. */
export function listingSlug(platform: Platform, project: Project): string {
  return project === 'heroes' ? platform : `${platform}-${project}`
}

const LISTING_SLUGS = (Object.keys(PROJECTS) as Project[]).flatMap((project) => (Object.keys(PLATFORMS) as Platform[]).map((platform) => ({ slug: listingSlug(platform, project), platform, project })))

/** Raw feeds at /md/<slug>: the pages, then one listing per platform and project. */
export const SLUGS = [...Object.keys(CONTENT), ...LISTING_SLUGS.map((l) => l.slug)]

function fill(raw: string, variant: 'web' | 'feed'): string {
  const out = raw
    .replaceAll('{{suitCount}}', String(stats.suitCount))
    .replaceAll('{{collectionCount}}', String(stats.collectionCount))
    .replaceAll('{{craftableCount}}', String(stats.craftableCount))
    .replaceAll('{{credits}}', variant === 'feed' ? creditsMarkdown() : '')
  // outside the site a link to /suits leads nowhere, so feeds point at the site itself
  return (variant === 'feed' ? out.replace(/\]\(\//g, `](${SITE_URL}/`) : out).replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * @param variant 'web' renders for a page on this site, where the <Credits> component draws
 * the team with avatars — so {{credits}} collapses to nothing. 'feed' renders for
 * /md/$slug (pasted into CurseForge/Modrinth), where there's no component to do that job,
 * so {{credits}} becomes a plain text list instead, and site links become absolute.
 */
export function getMarkdown(slug: string, variant: 'web' | 'feed' = 'web'): string | undefined {
  const listing = LISTING_SLUGS.find((l) => l.slug === slug)
  if (listing) return getListing(listing.platform, listing.project)
  const raw = CONTENT[slug]
  return raw === undefined ? undefined : fill(raw, variant)
}

/** One project's description for one platform, ready to paste. */
export function getListing(platform: Platform, project: Project = 'heroes'): string {
  const other = project === 'heroes' ? 'api' : 'heroes'
  return fill(
    PROJECTS[project].raw.replaceAll('{{app}}', PLATFORMS[platform].app).replaceAll('{{otherProjectUrl}}', PROJECTS[other].urls[platform]),
    'feed',
  )
}

/** The one-line summary a platform shows under the project name. */
export function getSummary(project: Project = 'heroes'): string {
  if (project === 'api') return 'The engine behind Thematic: suits, abilities, the Suit Bench and the tablet, plus a pack format for making your own heroes.'
  return `${stats.craftableCount} craftable superhero and supervillain armors from DC, Marvel, The Boys and Invincible, each with its own powers.`
}

export { stats }
