import type { ApiType, ApiGlobal } from '../lib/packs'

function Signature({ children }: { children: string }) {
  return <code className="tb-inset block overflow-x-auto whitespace-pre rounded-md px-2 py-1 text-xs text-amber-300">{children}</code>
}

function Entry({ signature, doc }: ApiGlobal) {
  return (
    <li className="border-b border-neutral-800 py-3 last:border-0">
      <Signature>{signature}</Signature>
      {doc && <p className="mt-1.5 text-sm text-neutral-300">{doc}</p>}
    </li>
  )
}

/** The script API reference: globals, then one section per object type with its methods. */
export function PackApi({ globals, types }: { globals: ApiGlobal[]; types: ApiType[] }) {
  return (
    <div>
      <h2 id="globals" className="scroll-mt-4">Globals</h2>
      <ul className="mt-2">{globals.map((g) => <Entry key={g.name} {...g} />)}</ul>
      {types.map((t) => (
        <section key={t.type}>
          <h2 id={t.type.toLowerCase().replace(/[^a-z0-9_-]/g, '')} className="mt-10 scroll-mt-4">{t.type}</h2>
          <p className="mt-1 text-sm text-neutral-300">{t.doc}</p>
          <ul className="mt-2">{t.methods.map((m) => <Entry key={m.name + m.signature} {...m} />)}</ul>
        </section>
      ))}
    </div>
  )
}
