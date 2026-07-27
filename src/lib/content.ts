import modDescriptionRaw from '../content/mod-description.md?raw'
import faqRaw from '../content/faq.md?raw'
import playRaw from '../content/play.md?raw'
import stats from '../data/stats.generated.json'
import { creditsMarkdown } from './team'

const CONTENT: Record<string, string> = {
  'mod-description': modDescriptionRaw,
  faq: faqRaw,
  play: playRaw,
}

export const SLUGS = Object.keys(CONTENT)

/**
 * @param variant 'web' renders for a page on this site, where the <Credits> component draws
 * the team with avatars — so {{credits}} collapses to nothing. 'feed' renders for
 * /md/$slug (pasted into CurseForge/Modrinth), where there's no component to do that job,
 * so {{credits}} becomes a plain text list instead.
 */
export function getMarkdown(slug: string, variant: 'web' | 'feed' = 'web'): string | undefined {
  const raw = CONTENT[slug]
  if (!raw) return undefined
  return raw
    .replaceAll('{{suitCount}}', String(stats.suitCount))
    .replaceAll('{{collectionCount}}', String(stats.collectionCount))
    .replaceAll('{{credits}}', variant === 'feed' ? creditsMarkdown() : '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export { stats }
