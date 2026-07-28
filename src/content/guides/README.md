# Community guides

Drop a `.md` file in this folder and it becomes a page on the site — no code changes, no
build config. The filename is the URL (`shiny-grinding.md` → `/guides/shiny-grinding`), and
the first `#` heading is the page title.

This file itself is skipped, so it won't show up as a guide.

## Writing one

Plain Markdown. Headings, lists, links, tables, code blocks, and images all work.

```markdown
# Getting your first suit

Start by crafting a Suit Bench...

## Where to mine

| Ore | Depth |
| --- | ----- |
| Titanium | Y -30 to 60 |
```

You can link to anywhere on the site with a normal relative link — `[the planner](/planner)`,
`[Superman](/suits/superman)`, `[ore depths](/mechanics/ores)`.

## Placeholders

These get filled in automatically, so counts never go stale:

- `{{suitCount}}` — number of released suits
- `{{collectionCount}}` — number of collections

## Contributing

Open a pull request against
[ThematicSite](https://github.com/awitkowski0/ThematicSite) adding your file here. Guides are
reviewed before merging, so nothing goes live unchecked.
