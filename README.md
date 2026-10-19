# thematic.bond

Public site for the [Thematic](https://github.com/awitkowski0/Thematic) Minecraft mod. TanStack Start, self-hosted.

The suit roster, collections, abilities, recipes and the guidebook are **generated at build time** from Thematic's own source data (`scripts/export-*.ts`) — nothing suit- or guide-related is hand-maintained here. `/md/mod-description` and `/md/faq` serve the same content as raw Markdown, for pasting into CurseForge/Modrinth.

## Local development

```sh
npm install
npm run dev   # runs the export scripts, then starts the dev server on :3000
```

The export scripts read a Thematic checkout (the multiversion layout: `src/common/resources` plus the shipped packs under `src/packs`). By default that is `..` (this repo cloned inside a Thematic checkout); set `THEMATIC_SOURCE_DIR` to point somewhere else.

`npm run typecheck` runs `tsc --noEmit`.

## The guidebook

`/book` is the in-game guide (`assets/thematic/guide/thematic/en_us/{book.json,categories,entries}` in Thematic; format reference `docs/guide-book.md` there). `scripts/export-book.ts` reads it the way the game does, hides anything marked `requires: "op"`, resolves links to site URLs, writes `src/data/book.generated.json` plus one `src/data/book/<category>.generated.json` per chapter, and prints a validation summary (categories, entries, pages by type, unresolved links, unknown page types). The markup parser is `src/lib/guideMarkup.ts`; the page renderers are `src/components/GuidePages.tsx`.

## How it is deployed

The site runs on the same machine as the Thematic servers. A script there rebuilds it whenever `main` of this repo or the `v1.20.1` branch of Thematic moves, using a local checkout of Thematic as the source, and swaps the new build in (rolling back if it does not answer). Pushing to `main` is therefore the deploy.

For a build somewhere that has no Thematic checkout, `scripts/fetch-source.mjs` can clone the paths the export scripts need, using `THEMATIC_REPO_TOKEN` (a read-only fine-grained token with Contents: Read on the Thematic repo; build-time only, never exposed to the browser).
