[![Thematic: the Justice League and friends](/listing/cover.jpg)](/)

[![Join the Discord](/badge/discord)](https://discord.gg/gXk4AJz8qM) [![Make your own pack](/badge/packs)](/packs) [![Craftable armors](/badge/armors)](/suits)

This is the core of Thematic. It runs the suits, abilities, the Suit Bench, the tablet, guns, mobs and the rest, but it has no superheroes of its own. Those come in packs.

**Looking for the suits?** Install [Thematic: Heroes]({{otherProjectUrl}}). {{app}} adds this core with it, so most players never need this page.

## Packs

A pack adds content to Thematic: suits, abilities, items, blocks, mobs, status effects and more. You don't need to write Java or set up a mod project.

- Suits, items and most abilities are JSON files.
- Abilities that need their own behaviour are short JavaScript files.
- Models are Blockbench geo files and textures are PNGs.

Thematic: Heroes is a pack built the same way, so every suit in it is an example you can open and copy.

Pack support arrives in Thematic 1.7.0.

## Making one

1. Download the [starter pack](/packs/thematic-pack-template.zip). It's a small working pack: a suit with its abilities, a gun and a HUD.
2. Rename it and change what you need. The [addon format](/packs/addon-format) explains every file.
3. Put it in `.minecraft/thematic/packs/` while you work on it. Ability and suit edits apply on `/reload`, and `/thematic packs reload` tells you what changed. New suits and items need a restart.

For autocomplete and type checks in VS Code, add [thematic.d.ts](/packs/thematic.d.ts) to your project. The [editor setup](/packs/editor-setup) page shows how.

## Reference

- [Addon format](/packs/addon-format): how a pack is laid out, and what each kind of file holds
- [Content types](/packs/content-types): items, blocks, entities, effects and their fields
- [Ability types](/packs/ability-types): every ability type, with the abilities that already use it
- [Script API](/packs/script-api): the functions scripts can call
- [Examples](/packs/examples): a small and a full example of each kind of file, plus a [zip of all of them](/packs/thematic-examples.zip)

## Sharing a pack

Upload it as a `.zip`, or as a `.jar` with no `fabric.mod.json` if a site only takes jars. Players drop it in their `mods` folder like any other mod. A pack that only changes abilities, effects or existing suits can also go in a world's `datapacks` folder.

## Requirements

- Minecraft 1.20.1 with Fabric
- [Fabric API](https://modrinth.com/mod/fabric-api)
- Pehkui is included, so you don't need to install it

Questions about packs? Ask in the [Discord](https://discord.gg/gXk4AJz8qM).

{{credits}}
