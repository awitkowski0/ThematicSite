// The in-game guide's inline text markup, ported from Thematic's GuideMarkup.java
// (bond.thematic.api.guide.GuideMarkup) and GuideTokens.java. Shared by the export script
// (which rewrites link targets and fills placeholders at build time) and the site (which
// turns the markup into React nodes), so both read the text the way the game does.
//
//   **bold**  *italic*  {#rrggbb} / {#rgb} / {gold} ... {/}  colour spans
//   [label](target)       link: an entry or category id, an https:// URL,
//                         tip:text (hover tooltip) or copy:text (click copies the text)
//   \n                    line break (two in a row is a paragraph gap)
//   "- " at line start    a bullet
//   \ before a marker     writes the marker literally
//   {{key|fallback}}      a live number; the web fills a few from the ability sheet,
//                         the rest show their fallback words

export interface Run {
  text: string
  bold: boolean
  italic: boolean
  /** 0xRRGGBB, or -1 for the page's default colour. */
  color: number
  link: string | null
}

export const isBreak = (r: Run) => r.text === '\n'

const NAMES = ['black', 'dark_blue', 'dark_green', 'dark_aqua', 'dark_red', 'dark_purple', 'gold', 'gray', 'dark_gray', 'blue', 'green', 'aqua', 'red', 'light_purple', 'yellow', 'white']
const RGB = [0x000000, 0x0000aa, 0x00aa00, 0x00aaaa, 0xaa0000, 0xaa00aa, 0xffaa00, 0xaaaaaa, 0x555555, 0x5555ff, 0x55ff55, 0x55ffff, 0xff5555, 0xff55ff, 0xffff55, 0xffffff]

/** A colour written as #rgb, #rrggbb or a Minecraft colour name; -1 when it is none of those. */
export function colorOf(spec: string): number {
  const s = spec.trim().toLowerCase()
  if (s.startsWith('#') && (s.length === 7 || s.length === 4) && /^#[0-9a-f]+$/.test(s)) {
    if (s.length === 7) return parseInt(s.slice(1), 16)
    const v = parseInt(s.slice(1), 16)
    return ((((v >> 8) & 15) * 17) << 16) | ((((v >> 4) & 15) * 17) << 8) | ((v & 15) * 17)
  }
  const i = NAMES.indexOf(s)
  return i >= 0 ? RGB[i] : -1
}

export function parse(source: string | undefined | null): Run[] {
  const out: Run[] = []
  if (source) run(source, false, false, -1, null, out)
  return out
}

/** The text with every marker removed and breaks as spaces: for descriptions and blurbs. */
export function plain(source: string | undefined | null): string {
  return parse(source)
    .map((r) => (isBreak(r) ? ' ' : r.text))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function flush(text: string[], bold: boolean, italic: boolean, color: number, link: string | null, out: Run[]) {
  if (text.length > 0) {
    out.push({ text: text.join(''), bold, italic, color, link })
    text.length = 0
  }
}

/** The index of the `]` that starts a `](` after the `[` at `open`, or -1. */
function closing(s: string, open: number): number {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    const c = s[i]
    if (c === '\\') i++
    else if (c === '[') depth++
    else if (c === ']' && --depth === 0) return i + 1 < s.length && s[i + 1] === '(' ? i : -1
  }
  return -1
}

function run(s: string, bold: boolean, italic: boolean, color: number, link: string | null, out: Run[]) {
  const text: string[] = []
  let lineStart = true
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '\\' && i + 1 < s.length) {
      text.push(s[++i])
      lineStart = false
    } else if (c === '\n') {
      flush(text, bold, italic, color, link, out)
      out.push({ text: '\n', bold: false, italic: false, color: -1, link: null })
      lineStart = true
    } else if (c === '-' && lineStart && i + 1 < s.length && s[i + 1] === ' ') {
      text.push('•')
      lineStart = false
    } else if (c === '*') {
      flush(text, bold, italic, color, link, out)
      if (i + 1 < s.length && s[i + 1] === '*') {
        bold = !bold
        i++
      } else italic = !italic
      lineStart = false
    } else if (c === '{' && s.indexOf('}', i) > i) {
      const end = s.indexOf('}', i)
      const spec = s.slice(i + 1, end)
      const parsed = spec === '/' ? -1 : colorOf(spec)
      if (spec === '/' || parsed >= 0) {
        flush(text, bold, italic, color, link, out)
        color = parsed
        i = end
      } else text.push(c)
      lineStart = false
    } else if (c === '[' && link === null) {
      const mid = closing(s, i)
      const close = mid < 0 ? -1 : s.indexOf(')', mid)
      if (close > 0) {
        flush(text, bold, italic, color, link, out)
        run(s.slice(i + 1, mid), bold, italic, color, s.slice(mid + 2, close).trim(), out)
        i = close
      } else text.push(c)
      lineStart = false
    } else {
      text.push(c)
      if (c !== ' ') lineStart = false
    }
  }
  flush(text, bold, italic, color, link, out)
}

/** Replaces every link target in the markup with `fn(target)`; everything else is left byte for byte. */
export function rewriteLinks(source: string, fn: (target: string) => string): string {
  let out = ''
  let last = 0
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (c === '\\') i++
    else if (c === '[') {
      const mid = closing(source, i)
      const close = mid < 0 ? -1 : source.indexOf(')', mid)
      if (close > 0) {
        const raw = source.slice(mid + 2, close)
        out += source.slice(last, mid + 2) + fn(raw.trim())
        last = close
        i = close - 1
      }
    }
  }
  return out + source.slice(last)
}

// ---------- placeholders ----------

const TOKEN = /\{\{(?:([a-z0-9_]+):)?([a-z0-9_]+)(?:\|([^}]*))?\}\}/g

function number(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return String(rounded)
}

/**
 * Fills `{{key|fallback}}` (the entry's own ability) and `{{ability:key|fallback}}`. `resolve` gets
 * (ability id, key) and returns the value or undefined; undefined or negative shows the fallback words.
 */
export function fillTokens(text: string, entryAbility: string | undefined, resolve: (ability: string, key: string) => number | undefined): string {
  if (!text.includes('{{')) return text
  return text.replace(TOKEN, (_m, ability: string | undefined, key: string, fallback: string | undefined) => {
    const id = ability ?? entryAbility
    const value = id ? resolve(id, key) : undefined
    return value === undefined || Number.isNaN(value) || value < 0 ? (fallback ?? '') : number(value)
  })
}

// ---------- colours on a page with a light and a dark theme ----------

function toHsl(rgb: number): [number, number, number] {
  const r = ((rgb >> 16) & 255) / 255
  const g = ((rgb >> 8) & 255) / 255
  const b = (rgb & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * The game draws all its text in one dark ink on a light page, so a colour in the markup is picked
 * for that. On this site the page can be either, so each colour gets a light-theme and a dark-theme
 * value with enough contrast, and black (the ink itself) is left to the page's own text colour.
 */
export function themedColor(rgb: number): { light: string; dark: string } | null {
  if (rgb < 0 || rgb === 0) return null
  const [h, s, l] = toHsl(rgb)
  return { light: hex(h, s, Math.min(l, 0.4)), dark: hex(h, s, Math.max(l, 0.68)) }
}
