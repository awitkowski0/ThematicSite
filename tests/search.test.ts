import assert from 'node:assert/strict'
import { test } from 'node:test'

import bookData from '../src/data/book.generated.json'
import packData from '../src/data/packs.generated.json'
import suitsData from '../src/data/suits.generated.json'
import { buildIndex, search } from '../src/lib/search'

// sections.ts pulls in vite-only globs via packs.ts, so the test uses a slice of its shape
const SECTIONS = [
  { label: 'Suits', to: '/suits', description: 'Every suit, what it does, and how it stacks up.', tabs: [
    { to: '/suits', label: 'Roster', description: 'Every suit, its abilities, stats, and how to craft it.' },
    { to: '/matchup', label: 'Matchup', description: 'Pit two suits against each other and see how the fight goes.' },
  ] },
  { label: 'Packs', to: '/packs', description: 'Make your own suits and abilities as a content pack.', tabs: [
    { to: '/packs/script-api', label: 'Script API', description: 'Functions available to scripts.' },
  ] },
]

const index = buildIndex({
  suits: suitsData as any,
  bookCategories: (bookData as any).categories,
  sections: SECTIONS,
  packDocs: packData as any,
})
const top = (q: string, kind?: string) => search(index, q).results.filter((r) => !kind || r.item.kind === kind)[0]?.item
const names = (q: string, n = 5) => search(index, q).results.slice(0, n).map((r) => r.item.name)

test('spelling variants of Omni-Man agree', () => {
  for (const q of ['omniman', 'omni man', 'Omni-Man', 'OMNI-MAN', 'omni  man']) assert.equal(top(q)?.id, 'omni_man', q)
  assert.equal(top('kiteman')?.name, 'Kite-Man')
})

test('no-space form matches parenthesised names', () => {
  assert.equal(top('green lantern hal jordan')?.id, 'hal_jordan')
  assert.equal(top('greenlanternhaljordan')?.id, 'hal_jordan')
  assert.equal(top('batman netherite')?.id, 'netherite_batman')
})

test('one typo still finds the right suit first', () => {
  assert.equal(top('supermna')?.name, 'Superman')
  assert.equal(top('batmna')?.name, 'Batman')
  assert.equal(top('wondr woman')?.name, 'Wonder Woman')
})

test('nicknames expand', () => {
  assert.equal(top('supes')?.name, 'Superman')
  assert.equal(top('bats')?.name, 'Batman')
  assert.equal(top('ww')?.name, 'Wonder Woman')
  assert.match(top('gl')!.name, /^Green Lantern/)
  assert.equal(top('ga')?.name, 'Green Arrow')
})

test('multi-word queries match in any order', () => {
  assert.equal(top('lantern green')?.kind, 'suit')
  assert.match(top('lantern green')!.name, /^Green Lantern/)
  assert.match(top('america captain')!.name, /^Captain America/)
})

test('an ability is found by name', () => {
  const a = top('wall run', 'ability')
  assert.equal(a?.name, 'Wall Run')
  assert.equal(a?.href, '/wiki/ability/wall_run')
  assert.equal(top('speedster punches', 'ability')?.tag, 'Active')
})

test('slot prefixes are not part of the name', () => {
  assert.equal(top('super speed', 'ability')?.name, 'Super Speed')
  assert.equal(search(index, 'passive').results.every((r) => r.item.name !== '[PASSIVE] Super Speed'), true)
})

test('short queries do not fuzz into noise', () => {
  for (const q of ['xq', 'zzz', 'qpx']) assert.equal(search(index, q).results.length, 0, q)
  // 3-letter tokens get no typo tolerance
  assert.equal(names('bxt').length, 0)
})

test('the bare name ranks the base suit above its alts', () => {
  for (const q of ['batman', 'green arrow', 'batgirl']) {
    const r = search(index, q).results.filter((x) => x.item.kind === 'suit')
    assert.equal(r[0].item.alt, false, q)
  }
  assert.equal(top('batman', 'suit')?.name, 'Batman')
})

test('wip suits are hidden and alts say what they are alts of', () => {
  const wip = new Set((suitsData as any[]).filter((s) => s.wip).map((s) => s.id))
  assert.equal(index.items.some((i) => i.kind === 'suit' && wip.has(i.id)), false)
  const alt = index.items.find((i) => i.kind === 'suit' && i.name === 'Batman (Hush)')!
  assert.match(alt.secondary, /^Alt of Batman/)
})

test('suit book entries are skipped, subcategory entries kept', () => {
  assert.equal(index.items.some((i) => i.kind === 'book' && i.id.startsWith('suit/')), false)
  assert.equal(index.items.some((i) => i.kind === 'book' && i.id.startsWith('alts/')), true)
})

test('pages and pack docs are searchable', () => {
  assert.equal(top('matchup')?.href, '/matchup')
  assert.equal(top('script api')?.href, '/packs/script-api')
})

test('did you mean offers a correction when nothing matches well', () => {
  assert.equal(search(index, 'wondr womn').suggestion, 'wonder woman')
})

test('highlight ranges cover the matched part of the name', () => {
  const r = search(index, 'omniman').results[0]
  assert.equal(r.item.name, 'Omni-Man')
  assert.deepEqual(r.ranges, [[0, r.item.name.length]])
  const p = search(index, 'bat').results[0]
  assert.deepEqual(p.ranges[0], [0, 3])
})

test('a keystroke is fast', () => {
  search(index, 'warm up')
  const t = performance.now()
  for (const q of ['spid', 'supermna', 'green lan', 'zzzzzzzz', 'wall']) search(index, q)
  assert.ok((performance.now() - t) / 5 < 25, 'avg ms per query')
})
