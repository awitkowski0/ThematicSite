import modDescriptionRaw from '../content/mod-description.md?raw'
import faqRaw from '../content/faq.md?raw'
import playRaw from '../content/play.md?raw'
import stats from '../data/stats.generated.json'

const CONTENT: Record<string, string> = {
  'mod-description': modDescriptionRaw,
  faq: faqRaw,
  play: playRaw,
}

export const SLUGS = Object.keys(CONTENT)

export function getMarkdown(slug: string): string | undefined {
  const raw = CONTENT[slug]
  if (!raw) return undefined
  return raw.replaceAll('{{suitCount}}', String(stats.suitCount)).replaceAll('{{collectionCount}}', String(stats.collectionCount))
}

export { stats }
