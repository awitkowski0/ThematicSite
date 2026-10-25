import modDescriptionRaw from '../content/mod-description.md?raw'
import faqRaw from '../content/faq.md?raw'
import playRaw from '../content/play.md?raw'
import listingRaw from '../content/listing.md?raw'
import stats from '../data/stats.generated.json'
import { creditsMarkdown } from './team'

const CONTENT: Record<string, string> = {
  'mod-description': modDescriptionRaw,
  faq: faqRaw,
  play: playRaw,
}

export const SITE_URL = 'https://thematic.bond'

/** The mod listings the site writes the description for. */
export const PLATFORMS = {
  curseforge: { name: 'CurseForge', project: 'https://www.curseforge.com/minecraft/mc-mods/thematic-superheroes', installHint: 'The CurseForge app installs it with Thematic.' },
  modrinth: { name: 'Modrinth', project: 'https://modrinth.com/mod/thematic-superheroes', installHint: 'The Modrinth App installs it with Thematic.' },
} as const
export type Platform = keyof typeof PLATFORMS

/** Raw feeds at /md/<slug>: the pages, then one listing per platform. */
export const SLUGS = [...Object.keys(CONTENT), ...Object.keys(PLATFORMS)]

function fill(raw: string, variant: 'web' | 'feed'): string {
  const out = raw
    .replaceAll('{{suitCount}}', String(stats.suitCount))
    .replaceAll('{{collectionCount}}', String(stats.collectionCount))
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
  if (slug in PLATFORMS) return getListing(slug as Platform)
  const raw = CONTENT[slug]
  return raw === undefined ? undefined : fill(raw, variant)
}

/** The project description for one platform, ready to paste. */
export function getListing(platform: Platform): string {
  return fill(listingRaw.replaceAll('{{installHint}}', PLATFORMS[platform].installHint), 'feed')
}

/** The one-line summary both platforms show under the project name. */
export function getSummary(): string {
  return `${stats.suitCount} superhero and supervillain suits from DC, Marvel, The Boys and Invincible, each with its own powers. Craft them in survival.`
}

export { stats }
