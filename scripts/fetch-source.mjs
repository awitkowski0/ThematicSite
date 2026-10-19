// Makes the private Thematic mod source available to the export scripts.
//
// Locally: no-op when the source is already there. THEMATIC_SOURCE_DIR points at a Thematic
// checkout (default: "..", i.e. this repo cloned inside one). The box that serves the site builds
// this way, from a checkout it keeps up to date.
//
// Otherwise, with THEMATIC_REPO_TOKEN set (a read-only fine-grained PAT, Contents: Read on the
// Thematic repo; build-time only, never committed, never exposed to the browser), it does a
// blobless sparse clone of just the paths the export scripts read.
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
  // Current multiversion layout: the engine, plus each pack's resources. Cone-mode sparse
  // checkout takes whole directories, so this also pulls the wip/starwars packs (the export
  // itself only reads the packs that ship, per src/common/resources/packs.json).
  'src/common/resources/data/thematic',
  'src/common/resources/assets/thematic/guide',
  'src/common/resources/assets/thematic/lang',
  'src/common/resources/assets/thematic/textures/armor',
  'src/common/resources/assets/thematic/textures/item',
  'src/common/resources/assets/thematic/textures/block',
  'src/packs',
]

// If the source is not already there and we actually need to clone, never clone into ".."
// blindly: it always exists and is never empty, so fall back to a dedicated subdirectory. An
// explicit THEMATIC_SOURCE_DIR always wins either way.
const checkTarget = path.resolve(EXPLICIT_TARGET ?? '..')

if (fs.existsSync(path.join(checkTarget, 'src/common/resources'))) {
  console.log(`[fetch-source] mod source already present at ${checkTarget} — nothing to fetch`)
  process.exit(0)
}

const resolved = EXPLICIT_TARGET ? checkTarget : path.resolve('thematic-source')

if (!TOKEN) {
  console.error(
    `[fetch-source] No mod source at ${resolved} and THEMATIC_REPO_TOKEN is not set.\n` +
      `  Locally: point THEMATIC_SOURCE_DIR at a Thematic checkout (or clone this repo inside one).\n` +
      `  Or set THEMATIC_REPO_TOKEN (fine-grained PAT, Contents: Read on ${REPO}) to clone it.`,
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
