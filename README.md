# thematic.bond

Public site for the [Thematic](https://github.com/awitkowski0/Thematic) Minecraft mod. TanStack Start, deployed on Vercel.

The suit roster, collections, abilities, and recipes are **generated at build time** from Thematic's own source data (`scripts/export-suits.ts`) — nothing suit-related is hand-maintained here. `/md/mod-description` and `/md/faq` serve the same content as raw Markdown, for pasting into CurseForge/Modrinth.

## Local development

```sh
npm install
npm run dev   # runs the export script, then starts the dev server on :3000
```

To point the export script at a Thematic checkout somewhere else, set `THEMATIC_SOURCE_DIR`.

## How deploys work

Thematic is private; this repo is public so it can deploy on Vercel's free tier. Deploys run
on **Vercel's own git integration** — a push here builds normally. The catch is that Vercel
only clones *this* repo, so the build fetches the mod source itself:

1. `npm run build` → `prebuild` → `npm run export` → `scripts/fetch-source.mjs` first.
2. `fetch-source.mjs` no-ops locally (the source is already at `..`). On Vercel it does a
   blobless sparse clone of Thematic using `THEMATIC_REPO_TOKEN`, pulling only the ~57 MB the
   export scripts read rather than the full ~470 MB history.
3. The export scripts then run against it exactly as they do locally, and the site builds.

Pushes to **Thematic** don't touch this repo, so its `notify-site-rebuild.yml` workflow pings a
Vercel **deploy hook** to trigger a rebuild whenever mod data changes.

### Required Vercel environment variables

- `THEMATIC_REPO_TOKEN` — fine-grained PAT scoped to the **Thematic** repo with
  **Contents: Read**. Build-time only; it isn't `VITE_`-prefixed, so it's never exposed to the
  browser. Set it for Production (and Preview, if you want previews to build).
- `THEMATIC_SOURCE_DIR` — set to `./thematic-source` so the clone lands inside the build
  workspace instead of trying to write to the parent directory.

### Required secret in Thematic

- `VERCEL_DEPLOY_HOOK_URL` — from Vercel → Settings → Git → Deploy Hooks. The URL *is* the
  credential, so keep it a secret. `notify-site-rebuild.yml` declares `environment: Dev`, so it
  must exist in that environment (or at the repo level) to resolve.
