import { useState } from 'react'

import { MarkdownContent } from './MarkdownContent'
import { PLATFORMS, PROJECTS, Platform, Project, SITE_URL, getListing, getSummary, listingSlug } from '../lib/content'

/** What each project's own settings should say, so the listing matches the mod. */
const SETTINGS: Record<Project, [string, string][]> = {
  heroes: [
    ['Loader', 'Fabric'],
    ['Game version', '1.20.1'],
    ['Required dependencies', 'Thematic (core), Fabric API'],
    ['Not a dependency', 'Pehkui (bundled in the core), GeckoLib, Patchouli, Point Blank'],
    ['Website', SITE_URL],
    ['Discord', 'https://discord.gg/gXk4AJz8qM'],
  ],
  api: [
    ['Loader', 'Fabric'],
    ['Game version', '1.20.1'],
    ['Required dependency', 'Fabric API'],
    ['Not a dependency', 'Pehkui (bundled in the jar), GeckoLib, Patchouli, Point Blank'],
    ['Website', `${SITE_URL}/packs`],
    ['Discord', 'https://discord.gg/gXk4AJz8qM'],
  ],
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })}
      className="tb-raised rounded-md px-2.5 py-1 text-sm"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** The text and settings for one project page on one platform, ready to copy in. */
export function ListingPage({ platform, project = 'heroes' }: { platform: Platform; project?: Project }) {
  const p = PLATFORMS[platform]
  const summary = getSummary(project)
  const description = getListing(platform, project)
  const slug = listingSlug(platform, project)
  const [source, setSource] = useState(false)

  return (
    <div>
      <h1>{p.name} listing</h1>
      <nav className="mt-2 flex gap-2">
        {(Object.keys(PROJECTS) as Project[]).map((k) => (
          <a key={k} href={k === 'heroes' ? `/${platform}` : `/${platform}/${k}`} className={`tb-raised rounded-md px-2.5 py-1 text-sm ${k === project ? 'text-amber-400' : ''}`}>
            {PROJECTS[k].name}
          </a>
        ))}
      </nav>
      <p className="mt-4 text-neutral-400">
        The text for the{' '}
        <a href={PROJECTS[project].urls[platform]} className="text-blue-400 hover:underline">
          {PROJECTS[project].name} page on {p.name}
        </a>
        , built from the mod's data so the numbers stay current. Paste each part into the project's settings.
      </p>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2>Summary</h2>
          <CopyButton text={summary} />
        </div>
        <p className="tb-inset mt-2 rounded-md p-3 text-sm">{summary}</p>
        <p className="mt-1 text-xs text-neutral-500">{summary.length} characters</p>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Description</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSource((s) => !s)} className="text-sm text-blue-400 hover:underline">
              {source ? 'Preview' : 'Markdown'}
            </button>
            <a href={`/md/${slug}`} className="text-sm text-blue-400 hover:underline">
              Raw
            </a>
            <CopyButton text={description} />
          </div>
        </div>
        {source ? (
          <pre className="tb-inset mt-2 overflow-x-auto whitespace-pre-wrap rounded-md p-4 text-xs leading-relaxed">{description}</pre>
        ) : (
          <div className="tb-raised mt-2 rounded-md p-6">
            {/* the site's own images aren't at thematic.bond until it deploys, so the preview reads them from here */}
            <MarkdownContent markdown={description.replaceAll(`${SITE_URL}/`, '/')} />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2>Project settings</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {SETTINGS[project].map(([label, value]) => (
            <div key={label}>
              <dt className="tb-label">{label}</dt>
              <dd className="mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
