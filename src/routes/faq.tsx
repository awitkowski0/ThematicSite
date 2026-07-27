import { createFileRoute } from '@tanstack/react-router'

import { MarkdownContent } from '../components/MarkdownContent'
import { getMarkdown } from '../lib/content'

// Parses "### Question\n\nAnswer text..." pairs out of faq.md for FAQPage JSON-LD.
// One source (the Markdown) drives both the rendered page and the structured data.
function parseQaPairs(markdown: string): { question: string; answer: string }[] {
  const sections = markdown.split(/^### /m).slice(1)
  return sections.map((section) => {
    const [question, ...rest] = section.split('\n')
    const answer = rest
      .join('\n')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip markdown links down to their text
      .replace(/[#*`]/g, '')
      .trim()
    return { question: question.trim(), answer }
  })
}

export const Route = createFileRoute('/faq')({
  head: () => {
    const markdown = getMarkdown('faq') ?? ''
    const pairs = parseQaPairs(markdown)
    return {
      meta: [{ title: 'FAQ — Thematic' }],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: pairs.map((p) => ({
              '@type': 'Question',
              name: p.question,
              acceptedAnswer: { '@type': 'Answer', text: p.answer },
            })),
          }),
        },
      ],
    }
  },
  component: Faq,
})

function Faq() {
  const markdown = getMarkdown('faq') ?? ''
  return <MarkdownContent markdown={markdown} />
}
