// Generates book.generated.json — a generic port of the in-game Patchouli guidebook's
// readable content (899 entries across 13 categories at last count), grouped the same way
// the book itself is (categories/*.json, sortnum + parent). Suit and Ability entries are
// flagged so the site can link them to their existing bespoke pages (/suits/$id,
// /abilities/$id) instead of duplicating that content generically.
import fs from 'node:fs'
import path from 'node:path'

import {
  OUT_DATA_DIR,
  PATCHOULI_CATEGORIES_DIR,
  PATCHOULI_ENTRIES_DIR,
  readJson,
  requireSourceExists,
  sanitizePatchouliText,
  stripNamespace,
  titleCase,
  walkJsonFiles,
} from './lib'

requireSourceExists()

interface BookCategory {
  id: string
  name: string
  description?: string
  sortnum: number
  parentId?: string
}

interface BookEntry {
  id: string
  categoryId: string
  name: string
  textBlocks: string[]
}

interface RawCategory {
  name: string
  description?: string
  icon?: string
  sortnum?: number
  parent?: string
}

interface RawPage {
  type?: string
  title?: string
  text?: string
}

interface RawEntry {
  name: string
  category?: string
  icon?: string
  pages?: (string | RawPage)[]
}

// Page types with real, generically-portable prose. Everything else (patchouli:relations
// cross-ref lists, patchouli:entity's usually-blank caption, and thematic's own
// live-rendered pages like thematic:stats/thematic:recipe/thematic:ability_data) is skipped
// rather than guessed at — see the skip-count summary this script logs at the end.
const TEXT_PAGE_TYPES = new Set(['patchouli:text', 'patchouli:spotlight'])

function loadCategories(): Map<string, BookCategory> {
  const map = new Map<string, BookCategory>()
  for (const file of walkJsonFiles(PATCHOULI_CATEGORIES_DIR)) {
    const id = path.basename(file, '.json')
    const raw = readJson<RawCategory>(file)
    map.set(id, {
      id,
      name: raw.name,
      description: raw.description ? sanitizePatchouliText(raw.description) : undefined,
      sortnum: raw.sortnum ?? 9999,
      parentId: raw.parent ? stripNamespace(raw.parent) : undefined,
    })
  }
  // Sub-categories (parent set, no own sortnum) sort after their parent, alphabetically among siblings.
  return map
}

function flattenPages(pages: (string | RawPage)[] | undefined, skipCounts: Map<string, number>): string[] {
  const blocks: string[] = []
  for (const page of pages ?? []) {
    if (typeof page === 'string') {
      const text = sanitizePatchouliText(page)
      if (text) blocks.push(text)
      continue
    }
    const type = page.type ?? 'unknown'
    if (TEXT_PAGE_TYPES.has(type) && page.text) {
      const text = sanitizePatchouliText(page.text)
      if (text) blocks.push(page.title ? `**${page.title}**\n\n${text}` : text)
    } else {
      skipCounts.set(type, (skipCounts.get(type) ?? 0) + 1)
    }
  }
  return blocks
}

export function exportBook() {
  const categories = loadCategories()
  const entriesByCategory = new Map<string, BookEntry[]>()
  const skipCounts = new Map<string, number>()
  let total = 0
  let uncategorized = 0

  // Bucket by each entry's own declared `category` field, NOT by which physical subfolder
  // it lives in — those don't always match (e.g. entries/abilities/ + entries/suits/ are
  // plural folder names for the singular categories/ability.json + categories/suit.json).
  for (const file of walkJsonFiles(PATCHOULI_ENTRIES_DIR)) {
    const id = path.basename(file, '.json')
    const raw = readJson<RawEntry>(file)
    const categoryId = raw.category ? stripNamespace(raw.category) : undefined
    if (!categoryId || !categories.has(categoryId)) {
      uncategorized++
      continue
    }

    const entry: BookEntry = {
      id,
      categoryId,
      name: raw.name ?? titleCase(id),
      textBlocks: flattenPages(raw.pages, skipCounts),
    }
    const list = entriesByCategory.get(categoryId) ?? []
    list.push(entry)
    entriesByCategory.set(categoryId, list)
    total++
  }
  for (const entries of entriesByCategory.values()) entries.sort((a, b) => a.name.localeCompare(b.name))
  if (uncategorized > 0) {
    console.warn(`[export-book] ${uncategorized} entries had no "category" field matching a known categories/*.json — skipped`)
  }

  const categoriesOut = [...categories.values()]
    .filter((c) => (entriesByCategory.get(c.id)?.length ?? 0) > 0)
    .sort((a, b) => {
      const aTop = a.parentId ? (categories.get(a.parentId)?.sortnum ?? 9999) : a.sortnum
      const bTop = b.parentId ? (categories.get(b.parentId)?.sortnum ?? 9999) : b.sortnum
      if (aTop !== bTop) return aTop - bTop
      if (!a.parentId !== !b.parentId) return a.parentId ? 1 : -1 // parent category before its own sub-categories
      return a.name.localeCompare(b.name)
    })
    .map((c) => ({ ...c, entryCount: entriesByCategory.get(c.id)?.length ?? 0 }))

  const book = {
    categories: categoriesOut,
    entriesByCategory: Object.fromEntries(entriesByCategory),
  }

  fs.mkdirSync(OUT_DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DATA_DIR, 'book.generated.json'), JSON.stringify(book, null, 2))

  console.log(`[export-book] wrote ${total} entries across ${categoriesOut.length} categories`)
  const skipSummary = [...skipCounts.entries()].sort((a, b) => b[1] - a[1])
  if (skipSummary.length > 0) {
    console.log(`[export-book] skipped pages by type (no generic text mapping): ${skipSummary.map(([t, n]) => `${t}=${n}`).join(', ')}`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportBook()
}
