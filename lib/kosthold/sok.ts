// Søk og filter i brukerens egne matvarer (ingen nettverk – alt ligger allerede i cachen).
import type { Matvare } from './naering'

export type Filter = 'alle' | 'favoritter' | 'nylig'

export const normaliser = (s: string) =>
  s.toLocaleLowerCase('nb').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

const tid = (s: string | null) => (s ? Date.parse(s) || 0 : 0)

export function sokMatvarer(matvarer: Matvare[], q: string, filter: Filter = 'alle', maks = 60): Matvare[] {
  const ord = normaliser(q).split(' ').filter(Boolean)
  let liste = matvarer
  if (filter === 'favoritter') liste = liste.filter(m => m.favoritt)
  if (filter === 'nylig') liste = liste.filter(m => m.sist_brukt)
  if (ord.length) {
    liste = liste.filter(m => {
      const tekst = normaliser(`${m.navn} ${m.merke ?? ''} ${m.strekkode ?? ''}`)
      return ord.every(o => tekst.includes(o))
    })
  }
  const forst = ord[0] ?? ''
  return [...liste].sort((a, b) => {
    if (forst) {
      const sa = normaliser(a.navn).startsWith(forst) ? 0 : 1, sb = normaliser(b.navn).startsWith(forst) ? 0 : 1
      if (sa !== sb) return sa - sb
    }
    if (filter === 'favoritter' && !forst) return a.navn.localeCompare(b.navn, 'nb')
    if (a.favoritt !== b.favoritt && filter === 'alle' && !forst) return a.favoritt ? -1 : 1
    return tid(b.sist_brukt) - tid(a.sist_brukt) || (b.antall_bruk - a.antall_bruk) || a.navn.localeCompare(b.navn, 'nb')
  }).slice(0, maks)
}
