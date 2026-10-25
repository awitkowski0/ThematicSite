// Pack-author docs: the files Thematic ships to pack authors (gradle/pack-docs.gradle), written as
// per-doc JSON for the /packs pages, plus the starter-pack zip and typings under public/packs/.
import fs from 'node:fs'
import path from 'node:path'
import GithubSlugger from 'github-slugger'

import { SITE_ROOT, SOURCE_ROOT } from './lib'

const DOCS = path.join(SOURCE_ROOT, 'docs')
const OUT_DATA = path.join(SITE_ROOT, 'src/data/packs')
const OUT_PUBLIC = path.join(SITE_ROOT, 'public/packs')

interface DocSpec {
  slug: string
  file: string
  title: string
  description: string
}

// Published reference pages, in nav order. Anything not listed here is internal and stays out.
const SPECS: DocSpec[] = [
  { slug: 'addon-format', file: 'addon-format.md', title: 'Addon format', description: 'How a pack is laid out and what every kind of content file holds: suits, abilities, items, blocks, entities and more.' },
  { slug: 'content-types', file: 'content-types.md', title: 'Content types', description: 'Every generic content type and its fields and hooks: items, blocks, entities, status effects and the rest.' },
  { slug: 'ability-types', file: 'ability-types.md', title: 'Ability types', description: 'Every ability type a definition can name, with its fields and the abilities that ship with Thematic.' },
  { slug: 'script-api', file: 'script-api.json', title: 'Script API', description: 'The functions and objects available to ability, hero and renderer scripts, with signatures.' },
  { slug: 'editor-setup', file: 'editor-setup.md', title: 'Editor setup', description: 'Autocomplete and type checks for scripts in VS Code, from the typings of the installed version.' },
  { slug: 'examples', file: 'examples/README.md', title: 'Examples', description: 'A minimal and a full example for each kind of content file, ready to copy into a pack.' },
]

const SLUG_BY_FILE = new Map(SPECS.filter((s) => s.file.endsWith('.md')).map((s) => [path.basename(s.file), s.slug]))
SLUG_BY_FILE.set('script-api.json', 'script-api')

export interface Heading {
  depth: number
  text: string
  id: string
}

/** Heading text as it renders, without inline markdown. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .replace(/\b_([^_]+)_\b/g, '$1')
    .trim()
}

/** Headings outside code fences; ids match rehype-slug (github-slugger on the text). */
function outline(markdown: string): Heading[] {
  const slugger = new GithubSlugger()
  const out: Heading[] = []
  let fence = ''
  for (const line of markdown.split('\n')) {
    const f = line.match(/^\s*(```+|~~~+)/)
    if (f) {
      if (!fence) fence = f[1][0]
      else if (f[1][0] === fence) fence = ''
      continue
    }
    if (fence) continue
    const m = line.match(/^(#{1,4})\s+(.+?)\s*#*$/)
    if (!m) continue
    const text = plain(m[2])
    out.push({ depth: m[1].length, text, id: slugger.slug(text) })
  }
  return out
}

/** Links to other published docs become site links; links to anything else become plain text. */
function rewriteLinks(markdown: string): string {
  const parts = markdown.split(/(^\s*(?:```+|~~~+)[\s\S]*?^\s*(?:```+|~~~+)\s*$)/m)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part
      return part.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, target: string) => {
        if (/^(https?:|mailto:|#)/.test(target)) return m
        const [file, frag] = target.split('#')
        const slug = SLUG_BY_FILE.get(path.basename(file))
        if (!slug) return label
        return `[${label}](/packs/${slug}${frag ? '#' + frag : ''})`
      })
    })
    .join('')
}

function write(name: string, data: unknown) {
  fs.writeFileSync(path.join(OUT_DATA, `${name}.json`), JSON.stringify(data))
}

// ---------- zip (store only) ----------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function listFiles(dir: string, prefix = ''): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.name === '.DS_Store') continue
    const rel = prefix + e.name
    if (e.isDirectory()) out.push(...listFiles(path.join(dir, e.name), rel + '/'))
    else out.push(rel)
  }
  return out
}

/** Zips `srcDir` with every entry under `rootName/`. */
function zipDir(srcDir: string, rootName: string): { bytes: Buffer; count: number } {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  const files = listFiles(srcDir)
  for (const rel of files) {
    const data = fs.readFileSync(path.join(srcDir, rel))
    const name = Buffer.from(`${rootName}/${rel}`)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // utf-8 names
    local.writeUInt16LE(0, 8) // stored
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0x21, 12) // 1980-01-01
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    chunks.push(local, name, data)
    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0)
    cen.writeUInt16LE(20, 4)
    cen.writeUInt16LE(20, 6)
    cen.writeUInt16LE(0x0800, 8)
    cen.writeUInt16LE(0x21, 14)
    cen.writeUInt32LE(crc, 16)
    cen.writeUInt32LE(data.length, 20)
    cen.writeUInt32LE(data.length, 24)
    cen.writeUInt16LE(name.length, 28)
    cen.writeUInt32LE(offset, 42)
    central.push(cen, name)
    offset += 30 + name.length + data.length
  }
  const cenBytes = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(cenBytes.length, 12)
  end.writeUInt32LE(offset, 16)
  return { bytes: Buffer.concat([...chunks, cenBytes, end]), count: files.length }
}

// ---------- script API ----------
interface ApiMethod { name: string; signature: string; params: string; returns: string; doc: string }
interface ApiGlobal { name: string; signature: string; returns: string; doc: string }
interface ApiType { type: string; doc: string; methods: ApiMethod[] }

export function exportPacks() {
  if (!fs.existsSync(path.join(DOCS, 'addon-format.md'))) {
    console.warn(`[export-packs] no pack docs under ${DOCS}; /packs will be empty`)
    fs.writeFileSync(path.join(SITE_ROOT, 'src/data/packs.generated.json'), '[]')
    return
  }
  fs.rmSync(OUT_DATA, { recursive: true, force: true })
  fs.mkdirSync(OUT_DATA, { recursive: true })
  fs.mkdirSync(OUT_PUBLIC, { recursive: true })

  const index: { slug: string; title: string; description: string }[] = []
  let lines = 0
  for (const spec of SPECS) {
    const src = path.join(DOCS, spec.file)
    if (!fs.existsSync(src)) continue
    index.push({ slug: spec.slug, title: spec.title, description: spec.description })
    if (spec.slug === 'script-api') {
      const api = JSON.parse(fs.readFileSync(src, 'utf-8')) as { about: string; globals: ApiGlobal[]; types: ApiType[] }
      const slugger = new GithubSlugger()
      const headings: Heading[] = [{ depth: 2, text: 'Globals', id: slugger.slug('Globals') }]
      for (const t of api.types) headings.push({ depth: 2, text: t.type, id: slugger.slug(t.type) })
      write(spec.slug, { ...spec, kind: 'api', about: api.about, globals: api.globals, types: api.types, headings })
      continue
    }
    const raw = fs.readFileSync(src, 'utf-8').replace(/\r\n/g, '\n')
    lines += raw.split('\n').length
    const all = outline(raw)
    // The first h1 is the page banner; the rest of the file starts below it.
    const body = rewriteLinks(raw.replace(/^# .*\n+/, ''))
    write(spec.slug, { ...spec, kind: 'md', markdown: body, headings: all.filter((h) => h.depth >= 2 && h.depth <= 3) })
  }

  // The starter pack's README is the landing page's body.
  const readme = fs.readFileSync(path.join(DOCS, 'pack-template/README.md'), 'utf-8').replace(/\r\n/g, '\n')
  const readmeBody = rewriteLinks(readme.replace(/^# .*\n+/, ''))
  write('pack-template', { markdown: readmeBody, headings: outline(readme).filter((h) => h.depth === 2) })

  fs.writeFileSync(path.join(SITE_ROOT, 'src/data/packs.generated.json'), JSON.stringify(index))

  // downloads
  const template = zipDir(path.join(DOCS, 'pack-template'), 'my_pack')
  fs.writeFileSync(path.join(OUT_PUBLIC, 'thematic-pack-template.zip'), template.bytes)
  const examples = zipDir(path.join(DOCS, 'examples'), 'thematic-examples')
  fs.writeFileSync(path.join(OUT_PUBLIC, 'thematic-examples.zip'), examples.bytes)
  fs.copyFileSync(path.join(DOCS, 'thematic.d.ts'), path.join(OUT_PUBLIC, 'thematic.d.ts'))
  for (const f of ['ability-types.json', 'content-types.json', 'script-api.json']) fs.copyFileSync(path.join(DOCS, f), path.join(OUT_PUBLIC, f))

  console.log(
    `[export-packs] ${index.length} docs (${lines} markdown lines), template zip ${template.count} files ` +
      `(${(template.bytes.length / 1024).toFixed(0)} KB), examples zip ${examples.count} files ` +
      `(${(examples.bytes.length / 1024).toFixed(0)} KB), thematic.d.ts + 3 reference JSON files`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) exportPacks()
