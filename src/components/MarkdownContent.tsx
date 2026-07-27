import ReactMarkdown from 'react-markdown'

export function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-a:text-blue-600 dark:prose-a:text-blue-400">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  )
}
