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

Thematic is private; this repo is public so it can deploy on Vercel's free tier. Vercel's own git integration is **not** used — it never gets access to Thematic. Instead, `.github/workflows/deploy.yml`:

1. Triggers on a `repository_dispatch` sent by Thematic's `notify-site-rebuild.yml` workflow whenever its `main` changes (or via manual `workflow_dispatch`).
2. Checks out this repo, then checks out Thematic read-only via a deploy key.
3. Runs `vercel build` (which runs `scripts/export-suits.ts` against that checkout, then the framework build) and `vercel deploy --prebuilt`.

### Required repo secrets

- `THEMATIC_SOURCE_DEPLOY_KEY` — private half of a read-only SSH deploy key added to Thematic (Settings → Deploy keys).
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — from `vercel link` against this project.

And in Thematic itself: `SITE_DISPATCH_TOKEN` — a fine-grained PAT scoped to **this** repo
(ThematicSite, the dispatch target — not Thematic) with **Contents: Read and write**, which is
what GitHub requires for `repository_dispatch`. Anything less returns a 403. Note that
`notify-site-rebuild.yml` declares `environment: Dev`, so the secret must exist in that
environment (or at the repo level) to resolve.
