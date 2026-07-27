import bookData from '../data/book.generated.json'

export interface BookCategory {
  id: string
  name: string
  description?: string
  sortnum: number
  parentId?: string
  entryCount: number
}

export interface BookEntry {
  id: string
  categoryId: string
  name: string
  textBlocks: string[]
}

interface BookData {
  categories: BookCategory[]
  entriesByCategory: Record<string, BookEntry[]>
}

const book = bookData as BookData

export const bookCategories = book.categories

export function getCategory(id: string): BookCategory | undefined {
  return bookCategories.find((c) => c.id === id)
}

export function entriesFor(categoryId: string): BookEntry[] {
  return book.entriesByCategory[categoryId] ?? []
}

export function getEntry(categoryId: string, id: string): BookEntry | undefined {
  return entriesFor(categoryId).find((e) => e.id === id)
}

export function topLevelCategories(): BookCategory[] {
  return bookCategories.filter((c) => !c.parentId)
}

export function childCategories(parentId: string): BookCategory[] {
  return bookCategories.filter((c) => c.parentId === parentId)
}
