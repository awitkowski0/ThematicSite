// Community-contributed pages. Anything dropped into src/content/guides/*.md becomes a
// page automatically — the point is that adding one is a Markdown PR, not a code change.
import stats from '../data/stats.generated.json'

// Vite resolves this glob at build time, so new files are picked up on the next build with
// no registry to update.
const FILES = import.meta.glob('../content/guides/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export interface Guide {
  slug: string
  title: string
  /** First paragraph, for listings. */
  summary: string
  markdown: string
}

function interpolate(md: string): string {
  return md.replaceAll('{{suitCount}}', String(stats.suitCount)).replaceAll('{{collectionCount}}', String(stats.collectionCount))
}

function parse(path: string, raw: string): Guide {
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const markdown = interpolate(raw)
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  // First non-heading, non-empty line, trimmed to something list-sized.
  const summaryLine =
    markdown
      .split('\n')
      .find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('```')) ?? ''
  return {
    slug,
    title: titleMatch?.[1]?.trim() ?? slug,
    summary: summaryLine.replace(/[*_`[\]]/g, '').trim().slice(0, 160),
    markdown,
  }
}

// README.md documents the folder for contributors — it isn't a guide itself.
export const guides: Guide[] = Object.entries(FILES)
  .filter(([path]) => !path.endsWith('/README.md'))
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => a.title.localeCompare(b.title))

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug)
}
