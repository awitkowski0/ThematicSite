// Makes the private Thematic mod source available to the export scripts.
//
// Locally: no-op — you already have it, since this repo is cloned inside a Thematic
// checkout (THEMATIC_SOURCE_DIR defaults to "..").
//
// On Vercel: Vercel only clones THIS repo, and Thematic is private, so the build fetches
// it here using THEMATIC_REPO_TOKEN (a read-only fine-grained PAT set as a Vercel
// environment variable — never committed, and not exposed to the browser since it isn't
// prefixed VITE_).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const REPO = process.env.THEMATIC_REPO ?? 'thematicarmor/Thematic'
const EXPLICIT_TARGET = process.env.THEMATIC_SOURCE_DIR
const TOKEN = process.env.THEMATIC_REPO_TOKEN

// Only the paths the export scripts actually read — a full working tree is far larger.
// Directories only: sparse-checkout's default cone mode rejects file paths ("not a
// directory") and already includes every root-level file anyway, which is how
// changelog.txt (needed by export-blog.ts) ends up present without being listed.
const SPARSE_PATHS = [
  'src/main/resources/data/thematic',
  'src/main/resources/assets/thematic/patchouli_books',
  'src/main/resources/assets/thematic/textures/armor',
  'src/main/resources/assets/thematic/textures/item',
  'src/main/resources/assets/thematic/textures/block',
]

// Local-dev convention: this repo is cloned inside a Thematic checkout, so ".." already has the
// mod source and there's nothing to fetch. If that's not the case (e.g. on Vercel, which only
// clones this repo in isolation) and we actually need to clone, never clone into ".." blindly —
// it always exists and is never empty (it's a real parent directory — on Vercel that's the
// build's own root, not a place we can write into), so fall back to a dedicated subdirectory
// instead. An explicit THEMATIC_SOURCE_DIR always wins either way.
const checkTarget = path.resolve(EXPLICIT_TARGET ?? '..')

if (fs.existsSync(path.join(checkTarget, 'src/main/resources'))) {
  console.log(`[fetch-source] mod source already present at ${checkTarget} — nothing to fetch`)
  process.exit(0)
}

const resolved = EXPLICIT_TARGET ? checkTarget : path.resolve('thematic-source')

if (!TOKEN) {
  console.error(
    `[fetch-source] No mod source at ${resolved} and THEMATIC_REPO_TOKEN is not set.\n` +
      `  Locally: clone this repo inside a Thematic checkout, or set THEMATIC_SOURCE_DIR.\n` +
      `  On Vercel: add THEMATIC_REPO_TOKEN (fine-grained PAT, Contents: Read on ${REPO}).`,
  )
  process.exit(1)
}

function git(args, opts = {}) {
  // stdio 'inherit' for stderr would risk echoing the tokenized URL on failure; capture instead.
  return execFileSync('git', args, { encoding: 'utf-8', ...opts })
}

console.log(`[fetch-source] fetching ${REPO} into ${resolved}`)

try {
  // --filter=blob:none keeps the FULL commit history (needed by export-blog.ts, which walks
  // changelog.txt's history) while downloading file contents lazily, so we don't pay for the
  // whole repo. --sparse limits the working tree to SPARSE_PATHS.
  git([
    'clone',
    '--filter=blob:none',
    '--sparse',
    '--quiet',
    `https://x-access-token:${TOKEN}@github.com/${REPO}.git`,
    resolved,
  ])
  git(['sparse-checkout', 'set', ...SPARSE_PATHS], { cwd: resolved })

  // Drop the tokenized remote URL so it can't leak into later git output or the build cache.
  git(['remote', 'set-url', 'origin', `https://github.com/${REPO}.git`], { cwd: resolved })

  console.log('[fetch-source] done')
} catch (err) {
  // Scrub the token from anything we print, in case git echoed the URL back.
  const message = String(err?.message ?? err).replaceAll(TOKEN, '***')
  console.error(`[fetch-source] clone failed: ${message}`)
  process.exit(1)
}
