import ReactMarkdown from 'react-markdown'

export function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-a:text-blue-400 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  )
}
