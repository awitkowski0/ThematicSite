// Site-wide search: a precomputed index over suits, abilities, guidebook entries, pages and pack docs, with typo-tolerant ranking.
import type { BookCategory } from './book'
import type { PackDocMeta } from './packs'
import type { Section } from './sections'
import type { Suit } from './suits'

export type Kind = 'suit' | 'ability' | 'book' | 'page' | 'pack'

export const KIND_LABEL: Record<Kind, string> = { suit: 'Suits', ability: 'Abilities', book: 'Wiki', page: 'Pages', pack: 'Packs' }

export interface SearchInput {
  suits: Pick<Suit, 'id' | 'name' | 'collectionName' | 'wip' | 'parent' | 'abilities'>[]
  bookCategories: Pick<BookCategory, 'id' | 'name' | 'parent' | 'entries'>[]
  sections: Pick<Section, 'label' | 'to' | 'description' | 'tabs'>[]
  /** Pack docs, once src/lib/packs.ts exposes them. */
  packDocs?: Pick<PackDocMeta, 'slug' | 'title' | 'description'>[]
}

interface Key {
  n: string
  ns: string
  words: string[]
  initials: string
}

export interface SearchItem {
  kind: Kind
  id: string
  name: string
  secondary: string
  href: string
  icon?: string
  /** Slot or guidebook tag, shown as a small label. */
  tag?: string
  alt: boolean
  keys: Key[]
  /** Normalised low-weight text. */
  desc: string
}

export interface SearchIndex {
  items: SearchItem[]
  /** Words of primary names, for "did you mean". */
  vocab: Map<string, number>
}

export interface SearchResult {
  item: SearchItem
  score: number
  /** [start, end) ranges of `item.name` to highlight. */
  ranges: [number, number][]
}

export interface SearchResponse {
  results: SearchResult[]
  suggestion?: string
}

// Nicknames; each expansion is a real name in the data.
export const ALIASES: Record<string, string> = {
  supes: 'superman',
  bats: 'batman',
  gl: 'green lantern',
  ww: 'wonder woman',
  jl: 'justice league',
  ga: 'green arrow',
}

const SLOT_LABEL: Record<string, string> = {
  active: 'Active', ultimate: 'Ultimate', passive: 'Passive', equip: 'Equip', cosmetic: 'Cosmetic', utility: 'Utility',
}

// ---------- normalising ----------

/** One char out per char in, so ranges line up with the display text. */
function fold(s: string): string {
  let out = ''
  for (const c of s) {
    const b = c.normalize('NFD')[0].toLowerCase()
    out += /[a-z0-9]/.test(b) ? b : ' '
  }
  return out
}

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function makeKey(name: string): Key {
  const n = normalize(name)
  const words = n ? n.split(' ') : []
  return { n, ns: n.replace(/ /g, ''), words, initials: words.map((w) => w[0]).join('') }
}

const stripTag = (name: string) => name.replace(/^\[[^\]]+\]\s*/, '')
const tagOf = (name: string) => /^\[([^\]]+)\]/.exec(name)?.[1]

// ---------- edit distance ----------

/** Damerau-Levenshtein (optimal string alignment), bailing out above `max`. Returns max+1 when over. */
export function distance(a: string, b: string, max: number): number {
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > max) return max + 1
  let prev2: number[] = []
  let prev = Array.from({ length: lb + 1 }, (_, j) => j)
  for (let i = 1; i <= la; i++) {
    const cur = [i]
    let min = i
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur[j] = v
      if (v < min) min = v
    }
    if (min > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[lb]
}

/** Allowed typos for a token: none under 4 chars, 1 up to 7, 2 beyond. */
const allowed = (len: number) => (len < 4 ? 0 : len < 8 ? 1 : 2)

// ---------- building ----------

export function buildIndex(input: SearchInput): SearchIndex {
  const items: SearchItem[] = []
  const add = (it: Omit<SearchItem, 'keys' | 'desc'> & { names?: string[]; desc?: string }) => {
    const { names, desc, ...rest } = it
    items.push({ ...rest, keys: [it.name, ...(names ?? [])].map(makeKey), desc: normalize(desc ?? '') })
  }

  const byId = new Map(input.suits.map((s) => [s.id, s]))
  const abilities = new Map<string, { name: string; slot: string; desc?: string; count: number }>()
  for (const s of input.suits) {
    if (s.wip) continue
    const alt = s.parent ? byId.get(s.parent) : undefined
    add({
      kind: 'suit',
      id: s.id,
      name: s.name,
      secondary: alt ? `Alt of ${alt.name} · ${s.collectionName}` : s.collectionName,
      href: `/suits/${s.id}`,
      alt: !!s.parent,
      desc: `${s.collectionName} ${s.abilities.map((a) => stripTag(a.name)).join(' ')}`,
    })
    for (const a of s.abilities) {
      const seen = abilities.get(a.id)
      if (seen) seen.count++
      else abilities.set(a.id, { name: stripTag(a.name), slot: a.slot, desc: a.description, count: 1 })
    }
  }

  const bookAbilities = new Set(input.bookCategories.find((c) => c.id === 'ability')?.entries.map((e) => e.id))
  for (const [id, a] of abilities) {
    add({
      kind: 'ability',
      id,
      name: a.name,
      secondary: `${SLOT_LABEL[a.slot] ?? 'Ability'} · ${a.count} ${a.count === 1 ? 'suit' : 'suits'}`,
      href: bookAbilities.has(id) ? `/wiki/ability/${id}` : `/abilities?q=${encodeURIComponent(a.name)}`,
      tag: SLOT_LABEL[a.slot],
      alt: false,
      desc: a.desc,
    })
  }

  for (const c of input.bookCategories) {
    if (c.id === 'suit') continue
    for (const e of c.entries) {
      if (c.id === 'ability' && abilities.has(e.id)) continue
      add({
        kind: 'book',
        id: `${c.id}/${e.id}`,
        name: stripTag(e.name),
        secondary: c.name,
        href: e.href,
        icon: e.icon,
        tag: e.tag,
        alt: false,
      })
    }
  }

  const pages = new Map<string, { label: string; names: string[]; description: string }>()
  for (const s of input.sections) {
    const hit = pages.get(s.to)
    if (hit) hit.names.push(s.label)
    else pages.set(s.to, { label: s.label, names: [], description: s.description })
    for (const t of s.tabs) {
      const tab = pages.get(t.to)
      if (tab) tab.names.push(t.label)
      else pages.set(t.to, { label: t.label, names: [], description: t.description })
    }
  }
  for (const [to, p] of pages) {
    if (input.packDocs?.length && to.startsWith('/packs/')) continue // the pack docs below cover these
    add({ kind: 'page', id: to, name: p.label, secondary: p.description, href: to, alt: false, names: p.names, desc: p.description })
  }

  // pack docs live at /packs/<slug>
  for (const d of input.packDocs ?? []) {
    add({ kind: 'pack', id: d.slug, name: d.title, secondary: d.description, href: `/packs/${d.slug}`, alt: false, desc: d.description })
  }

  const vocab = new Map<string, number>()
  for (const it of items) {
    if (it.kind === 'book' && it.id.startsWith('decorative_blocks')) continue
    for (const w of it.keys[0].words) if (w.length >= 4) vocab.set(w, (vocab.get(w) ?? 0) + 1)
  }
  return { items, vocab }
}

// ---------- scoring ----------

interface Query {
  n: string
  ns: string
  tokens: string[]
  /** Subtracted from scores, so a nickname's expansion outranks a literal near-miss. */
  penalty: number
}

const makeQuery = (n: string, penalty = 0): Query => ({ n, ns: n.replace(/ /g, ''), tokens: n ? n.split(' ') : [], penalty })

const KIND_BOOST: Record<Kind, number> = { suit: 40, ability: 30, pack: 15, book: 10, page: 0 }

function isSubsequence(q: string, s: string): boolean {
  let i = 0
  for (let j = 0; j < s.length && i < q.length; j++) if (s[j] === q[i]) i++
  return i === q.length
}

/** Score of one name against the query, 0 for no match. */
function scoreKey(k: Key, q: Query): number {
  if (k.n === q.n || k.ns === q.ns) return 1000
  if (k.n.startsWith(q.n) || k.ns.startsWith(q.ns)) return 900 - Math.min(80, k.ns.length - q.ns.length)

  // every token against some word: prefix, substring, or typo
  let worst = 3
  let typos = 0
  for (const t of q.tokens) {
    let best = 0
    let bestTypos = 0
    const max = allowed(t.length)
    for (const w of k.words) {
      let s = 0
      let d = 0
      if (w.startsWith(t)) s = 3
      else if (t.length >= 3 && w.includes(t)) s = 2
      else if (max) {
        const dist = Math.min(distance(t, w, max), w.length > t.length ? distance(t, w.slice(0, t.length), max) : max + 1)
        if (dist <= max) {
          s = 1
          d = dist
        }
      }
      if (s > best || (s === best && s === 1 && d < bestTypos)) {
        best = s
        bestTypos = d
      }
      if (best === 3) break
    }
    if (!best) {
      worst = 0
      break
    }
    worst = Math.min(worst, best)
    typos += bestTypos
  }
  if (worst === 3) return 800 - (k.words.length - q.tokens.length) * 4
  if (worst === 2) return 600 - (k.words.length - q.tokens.length) * 4
  if (worst === 1) return 400 - typos * 30 - (k.words.length - q.tokens.length) * 2

  // whole-query typo, ignoring spaces ("supermna", "spidermna")
  const max = allowed(q.ns.length)
  if (max) {
    const d = distance(q.ns, k.ns, max)
    if (d <= max) return 420 - d * 30
    if (k.ns.length > q.ns.length) {
      const p = distance(q.ns, k.ns.slice(0, q.ns.length), max)
      if (p <= max) return 400 - p * 30
    }
  }
  // initials ("bb" -> Batman Beyond), then loose subsequence
  if (q.ns.length >= 2 && q.ns.length <= 6 && /^[a-z]+$/.test(q.ns) && k.words.length >= 2 && k.initials.startsWith(q.ns)) {
    return 300 - (k.initials.length - q.ns.length) * 10
  }
  if (q.ns.length >= 3 && q.ns[0] === k.ns[0] && k.ns.length <= q.ns.length * 2 + 2 && isSubsequence(q.ns, k.ns)) return 200
  return 0
}

function scoreDesc(desc: string, q: Query): number {
  if (!desc) return 0
  const toks = q.tokens.filter((t) => t.length >= 3)
  if (!toks.length || toks.length < q.tokens.length) return 0
  const hay = ` ${desc}`
  for (const t of toks) if (!hay.includes(` ${t}`)) return 0
  return 100 + toks.length
}

function scoreItem(it: SearchItem, qs: Query[]): number {
  let best = 0
  for (const q of qs) {
    const penalty = q.penalty
    for (const [ki, k] of it.keys.entries()) {
      const s = scoreKey(k, q) - penalty - (ki ? 2 : 0)
      if (s > best) best = s
    }
    if (best < 150) best = Math.max(best, scoreDesc(it.desc, q) - penalty)
  }
  if (!best) return 0
  const len = it.keys[0].n.length
  return best + KIND_BOOST[it.kind] - (it.alt ? 25 : 0) - len * 0.1
}

/** The query as typed, plus the version with nicknames expanded when it has one. */
function queryVariants(norm: string): Query[] {
  const tokens = norm.split(' ')
  if (!tokens.some((t) => ALIASES[t])) return [makeQuery(norm)]
  const whole = !!ALIASES[norm]
  return [makeQuery(norm, whole ? 300 : 0), makeQuery(tokens.map((t) => ALIASES[t] ?? t).join(' '), whole ? 0 : 5)]
}

// ---------- highlighting ----------

function highlight(name: string, qs: Query[]): [number, number][] {
  const f = fold(name)
  const spans: [number, number][] = []
  const wordStarts: [number, string][] = []
  for (const m of f.matchAll(/[a-z0-9]+/g)) wordStarts.push([m.index!, m[0]])

  for (const q of qs) {
    const before = spans.length
    for (const t of q.tokens) {
      const max = allowed(t.length)
      const w = wordStarts.find(([, w]) => w.startsWith(t))
      if (w) {
        spans.push([w[0], w[0] + t.length])
        continue
      }
      const at = t.length >= 3 ? f.indexOf(t) : -1
      if (at >= 0) {
        spans.push([at, at + t.length])
        continue
      }
      if (max) {
        const fz = wordStarts.find(([, w]) => distance(t, w, max) <= max || (w.length > t.length && distance(t, w.slice(0, t.length), max) <= max))
        if (fz) spans.push([fz[0], fz[0] + Math.min(fz[1].length, Math.max(t.length, 1))])
      }
    }
    if (spans.length > before) break
    // run-together query ("spiderman"): span from the first to the last matching letter
    const letters: number[] = []
    for (let i = 0; i < f.length; i++) if (f[i] !== ' ') letters.push(i)
    const joined = letters.map((i) => f[i]).join('')
    const at = q.ns ? joined.indexOf(q.ns) : -1
    if (at >= 0) spans.push([letters[at], letters[at + q.ns.length - 1] + 1])
  }
  spans.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const s of spans) {
    const last = merged[merged.length - 1]
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1])
    else merged.push([s[0], s[1]])
  }
  return merged
}

// ---------- did you mean ----------

function suggest(index: SearchIndex, q: Query): string | undefined {
  let changed = false
  const out: string[] = []
  for (const t of q.tokens) {
    const max = allowed(t.length)
    let best = t
    if (max && !index.vocab.has(t)) {
      let bestD = max + 1
      let bestFreq = 0
      let startsWith = false
      for (const [w, freq] of index.vocab) {
        if (w.startsWith(t)) {
          startsWith = true
          break
        }
        const d = distance(t, w, max)
        if (d < bestD || (d === bestD && freq > bestFreq)) {
          bestD = d
          bestFreq = freq
          best = w
        }
      }
      if (startsWith || bestD > max) best = t
    }
    if (best !== t) changed = true
    out.push(best)
  }
  return changed ? out.join(' ') : undefined
}

// ---------- entry point ----------

export function search(index: SearchIndex, query: string, limit = 200): SearchResponse {
  const norm = normalize(query)
  if (!norm) return { results: [] }
  const qs = queryVariants(norm)

  const scored: { item: SearchItem; score: number }[] = []
  for (const item of index.items) {
    const score = scoreItem(item, qs)
    if (score > 0) scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))

  const results = scored.slice(0, limit).map((r) => ({ ...r, ranges: highlight(r.item.name, qs) }))
  const top = scored[0]?.score ?? 0
  const suggestion = top < 500 ? suggest(index, qs[0]) : undefined
  return { results, suggestion: suggestion && suggestion !== norm ? suggestion : undefined }
}
