import { createFileRoute, Link } from '@tanstack/react-router'

import { cardLinkClass } from '../../components/controls'

import { blogPosts } from '../../lib/blog'
import { formatDate } from '../../lib/format'

export const Route = createFileRoute('/blog/')({
  head: () => ({
    meta: [{ title: 'Changelog — Thematic' }, { name: 'description', content: 'Release notes for every Thematic version, pulled straight from the mod\'s own changelog history.' }],
  }),
  component: BlogIndex,
})

function BlogIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Changelog</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">What's new in each Thematic release.</p>

      <ul className="mt-8 space-y-4">
        {blogPosts.map((post) => (
          <li key={post.version}>
            <Link
              to="/blog/$version"
              params={{ version: post.version }}
              className={cardLinkClass}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{post.version}</span>
                <span className="text-sm text-neutral-500">{formatDate(post.date)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
