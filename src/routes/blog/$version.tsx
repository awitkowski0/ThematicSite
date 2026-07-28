import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { formatChangelogMarkdown, getBlogPost } from '../../lib/blog'
import { formatDate } from '../../lib/format'
import { MarkdownContent } from '../../components/MarkdownContent'

export const Route = createFileRoute('/blog/$version')({
  loader: ({ params }) => {
    const post = getBlogPost(params.version)
    if (!post) throw notFound()
    return post
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.version} — Thematic Changelog` }, { name: 'description', content: `Release notes for Thematic ${loaderData.version}.` }] : [],
  }),
  component: BlogPostPage,
  notFoundComponent: () => (
    <div>
      <h1 className="text-2xl font-bold">Post not found</h1>
      <Link to="/blog" className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400">
        ← Changelog
      </Link>
    </div>
  ),
})

function BlogPostPage() {
  const post = Route.useLoaderData()

  return (
    <div>
      <Link to="/blog" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Changelog
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{post.version}</h1>
      <p className="text-sm text-neutral-500">{formatDate(post.date)}</p>
      <div className="mt-6">
        <MarkdownContent markdown={formatChangelogMarkdown(post.content)} />
      </div>
    </div>
  )
}
