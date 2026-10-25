import index from '../data/packs.generated.json'

export interface PackHeading {
  depth: number
  text: string
  id: string
}

export interface PackDocMeta {
  slug: string
  title: string
  description: string
}

export interface ApiMethod { name: string; signature: string; params: string; returns: string; doc: string }
export interface ApiGlobal { name: string; signature: string; returns: string; doc: string }
export interface ApiType { type: string; doc: string; methods: ApiMethod[] }

export type PackDoc = PackDocMeta & { headings: PackHeading[] } & (
  | { kind: 'md'; markdown: string }
  | { kind: 'api'; about: string; globals: ApiGlobal[]; types: ApiType[] }
)

export const packDocs = index as PackDocMeta[]

export interface PackReadme {
  markdown: string
  headings: PackHeading[]
}

const docFiles = import.meta.glob<{ default: unknown }>('../data/packs/*.json')

async function load<T>(name: string): Promise<T | undefined> {
  const loader = docFiles[`../data/packs/${name}.json`]
  return loader ? ((await loader()).default as T) : undefined
}

export const getPackDoc = (slug: string) => load<PackDoc>(slug)
export const getPackReadme = () => load<PackReadme>('pack-template')
