// The guidebook, as scripts/export-book.ts writes it from Thematic's in-game guide.
//   book.generated.json            the book's front page and every category with its entry list
//   book/<category>.generated.json the pages of that category's entries (loaded on demand)
import bookData from '../data/book.generated.json'

export interface BookEntrySummary {
  /** URL segment inside the category. */
  id: string
  name: string
  sort: number
  icon?: string
  /** Where the entry lives on the site (a suit's entry goes to its bespoke /suits page). */
  href: string
  pages: number
  /** The `[TAG]` the name starts with, e.g. PASSIVE. */
  tag?: string
  /** A suit entry's collection. */
  collection?: string
}

export interface BookCategory {
  id: string
  name: string
  /** Guide markup. */
  description: string
  icon?: string
  sort: number
  parent?: string
  entryCount: number
  entries: BookEntrySummary[]
}

interface BookData {
  book: { name: string; landing: string; icon?: string }
  categories: BookCategory[]
}

const book = bookData as BookData

export const bookInfo = book.book
export const bookCategories = book.categories

export function getCategory(id: string): BookCategory | undefined {
  return bookCategories.find((c) => c.id === id)
}

export function topLevelCategories(): BookCategory[] {
  return bookCategories.filter((c) => !c.parent)
}

export function childCategories(parentId: string): BookCategory[] {
  return bookCategories.filter((c) => c.parent === parentId)
}

/** A page as exported: `type` plus the fields that type carries (see scripts/export-book.ts). */
export type BookPage = { type: string; anchor?: string; title?: string } & Record<string, any>

export interface BookEntry {
  id: string
  path: string
  name: string
  category: string
  icon?: string
  pages: BookPage[]
}

const chapters = import.meta.glob<Record<string, BookEntry>>('../data/book/*.generated.json', { import: 'default' })

export async function loadEntries(categoryId: string): Promise<Record<string, BookEntry>> {
  const load = chapters[`../data/book/${categoryId}.generated.json`]
  return load ? await load() : {}
}

export async function loadEntry(categoryId: string, id: string): Promise<BookEntry | undefined> {
  return (await loadEntries(categoryId))[id]
}
