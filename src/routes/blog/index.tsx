import { createFileRoute, Link } from '@tanstack/react-router'

import { blogPosts } from '../../lib/blog'

export const Route = createFileRoute('/blog/')({
  head: () => ({
    meta: [{ title: 'Changelog — Thematic' }, { name: 'description', content: 'Release notes for every Thematic version, pulled straight from the mod\'s own changelog history.' }],
  }),
  component: BlogIndex,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function BlogIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Changelog</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">Every release, generated from the mod's own changelog history.</p>

      <ul className="mt-8 space-y-4">
        {blogPosts.map((post) => (
          <li key={post.version}>
            <Link
              to="/blog/$version"
              params={{ version: post.version }}
              className="block rounded-md border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
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
