import { Fragment, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { isBreak, parse, themedColor } from '../lib/guideMarkup'
import type { Run } from '../lib/guideMarkup'

// Draws the in-game guide's inline markup (src/lib/guideMarkup.ts) as React. Link targets were
// resolved to site URLs by scripts/export-book.ts: a target starting with "/" is a page here,
// "dead:" is one that names nothing (shown as plain text), http(s) is external, "tip:" is a hover
// tooltip and "copy:" copies its text when clicked.

function CopyChip({ text, children }: { text: string; children: ReactNode }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      title={`Copy: ${text}`}
      onClick={() => {
        try {
          void navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          // clipboard unavailable: the text is still on the page
        }
      }}
      className="rounded bg-neutral-100 px-1 font-mono text-[0.9em] hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
    >
      {children}
      {done && <span className="ml-1 text-xs text-green-600 dark:text-green-400">copied</span>}
    </button>
  )
}

function RunView({ run }: { run: Run }) {
  let node: ReactNode = run.text
  const themed = themedColor(run.color)
  const style = themed ? ({ '--gc-l': themed.light, '--gc-d': themed.dark } as CSSProperties) : undefined
  const classes = [run.bold ? 'font-bold' : '', run.italic ? 'italic' : '', themed ? 'gc' : ''].filter(Boolean).join(' ') || undefined
  const link = run.link
  if (link) {
    if (link.startsWith('tip:')) {
      node = (
        <span className={`gtip ${classes ?? ''}`} style={style} tabIndex={0} data-tip={link.slice(4)} title={link.slice(4)}>
          {run.text}
        </span>
      )
      return node
    }
    if (link.startsWith('copy:')) {
      return (
        <CopyChip text={link.slice(5)}>
          <span className={classes} style={style}>
            {run.text}
          </span>
        </CopyChip>
      )
    }
    if (link.startsWith('dead:')) {
      return (
        <span className={classes} style={style}>
          {run.text}
        </span>
      )
    }
    const external = /^https?:\/\//.test(link)
    return (
      <a
        href={link}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={`text-blue-600 underline decoration-blue-600/40 hover:decoration-current dark:text-blue-400 ${classes ?? ''}`}
        style={style}
      >
        {run.text}
      </a>
    )
  }
  return classes ? (
    <span className={classes} style={style}>
      {node}
    </span>
  ) : (
    <>{node}</>
  )
}

/** Splits runs into lines at the break runs. */
function lines(runs: Run[]): Run[][] {
  const out: Run[][] = [[]]
  for (const r of runs) {
    if (isBreak(r)) out.push([])
    else out[out.length - 1].push(r)
  }
  return out
}

export function GuideText({ markup, className }: { markup?: string | null; className?: string }) {
  if (!markup) return null
  const rows = lines(parse(markup))
  return (
    <div className={`space-y-0.5 leading-relaxed ${className ?? ''}`}>
      {rows.map((row, i) => {
        if (row.length === 0 || row.every((r) => r.text.trim() === '')) return <div key={i} className="h-2" aria-hidden />
        const bullet = row[0].text.startsWith('•')
        return (
          <div key={i} className={bullet ? 'pl-4 -indent-3' : undefined}>
            {row.map((r, j) => (
              <RunView key={j} run={r} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** Markup on one line (headings, labels): breaks become spaces. */
export function GuideInline({ markup }: { markup?: string | null }) {
  if (!markup) return null
  return (
    <>
      {parse(markup).map((r, i) => (
        <Fragment key={i}>{isBreak(r) ? ' ' : <RunView run={r} />}</Fragment>
      ))}
    </>
  )
}
