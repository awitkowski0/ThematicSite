import { Link } from '@tanstack/react-router'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

function Heading({ level, id, children }: { level: 2 | 3 | 4; id?: string; children?: React.ReactNode }) {
  const Tag = `h${level}` as const
  return (
    <Tag id={id} className="group scroll-mt-4">
      {children}
      {id && (
        <a href={`#${id}`} aria-label="Link to this section" className="ml-2 text-neutral-600 no-underline opacity-0 group-hover:opacity-100 focus:opacity-100">
          #
        </a>
      )}
    </Tag>
  )
}

const components: Components = {
  h2: ({ id, children }) => <Heading level={2} id={id}>{children}</Heading>,
  h3: ({ id, children }) => <Heading level={3} id={id}>{children}</Heading>,
  h4: ({ id, children }) => <Heading level={4} id={id}>{children}</Heading>,
  a: ({ href, children }) => {
    if (href?.startsWith('/packs/')) {
      const [to, hash] = href.split('#')
      return <Link to={to} hash={hash}>{children}</Link>
    }
    const external = href?.startsWith('http')
    return <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>
  },
  // Wide tables scroll inside their own box instead of stretching the page.
  table: ({ children }) => (
    <div className="not-prose tb-inset my-4 overflow-x-auto rounded-md">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-divider px-3 py-1.5 align-bottom text-xs font-semibold uppercase tracking-wide text-neutral-300">{children}</th>,
  td: ({ children }) => <td className="border-b border-neutral-800 px-3 py-1.5 align-top [&_code]:text-amber-300">{children}</td>,
  pre: ({ children }) => (
    <pre className="not-prose tb-inset my-4 overflow-x-auto rounded-md p-3 text-xs leading-relaxed text-neutral-100">{children}</pre>
  ),
}

/** Long reference markdown: GFM tables, heading anchors, code blocks in the site's inset style. */
export function DocMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-a:text-blue-400 prose-code:before:content-none prose-code:after:content-none prose-code:text-sm prose-h2:mt-10 prose-h3:mt-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
