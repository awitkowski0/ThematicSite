// Generates blog.generated.json from git history of ThematicThird's changelog.txt — one
// post per version. The file gets overwritten each release rather than appended to, so a
// full-file snapshot at each commit that touched it naturally recovers each historical
// version's notes as they looked at the time. Not run alongside the other export-*.ts
// scripts (needs `git log` against the source checkout, not just its file contents).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { OUT_DATA_DIR, SOURCE_ROOT, requireSourceExists } from './lib'

requireSourceExists()

const CHANGELOG_PATH = 'changelog.txt'
// Newer entries are Markdown headers ("# v1.6.2"); older ones are a bare version line
// ("v1.5.1", no "#") — the "#" is optional here to cover both eras. Requires an actual
// digit after "v" so unrelated lines starting with a v-word ("Various", "Vehicle" — real
// first lines found in very early history) don't get mistaken for a version.
const VERSION_HEADER = /^#?\s*(v\d[\d.]*)/i

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: SOURCE_ROOT, maxBuffer: 1024 * 1024 * 64, encoding: 'utf-8' })
}

interface CommitRef {
  hash: string
  date: string // ISO
}

function listCommits(): CommitRef[] {
  const out = git(['log', '--follow', '--format=%H|%cI', '--', CHANGELOG_PATH]).trim()
  if (!out) return []
  return out.split('\n').map((line) => {
    const [hash, date] = line.split('|')
    return { hash, date }
  })
}

function readFileAtCommit(hash: string): string | undefined {
  try {
    return git(['show', `${hash}:${CHANGELOG_PATH}`])
  } catch {
    return undefined // file may not exist yet at this point in history (e.g. a rename edge case)
  }
}

export function exportBlog() {
  const commits = listCommits() // newest first

  const posts: { version: string; date: string; content: string }[] = []
  const seenVersions = new Set<string>()

  for (const commit of commits) {
    const content = readFileAtCommit(commit.hash)
    if (!content) continue

    const lines = content.split('\n')
    const headerIndex = lines.findIndex((l) => VERSION_HEADER.test(l))
    if (headerIndex === -1) continue

    const version = lines[headerIndex].match(VERSION_HEADER)![1]
    if (seenVersions.has(version)) continue // walking newest->oldest, so the first hit is the final content for this version
    seenVersions.add(version)

    const body = lines.slice(headerIndex + 1).join('\n').trim()
    if (!body) continue

    posts.push({ version, date: commit.date, content: body })
  }

  fs.mkdirSync(OUT_DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DATA_DIR, 'blog.generated.json'), JSON.stringify(posts, null, 2))
  console.log(`[export-blog] wrote ${posts.length} version posts from ${commits.length} commits touching changelog.txt`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportBlog()
}
