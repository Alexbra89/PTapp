import { describe, it, expect } from 'vitest'
import { sokMatvarer, normaliser } from '@/lib/kosthold/sok'
import { lagLinje, linjerFraMal, endreMengde, nyId } from '@/lib/kosthold/linje'
import { summer, type Matvare } from '@/lib/kosthold/naering'

const mv = (o: Partial<Matvare>): Matvare => ({
  id: nyId(), bruker_id: 'u', navn: 'X', merke: null, strekkode: null, kilde: 'manuell', basis: '100g',
  kcal: 100, kj: null, protein: 10, karbohydrater: 10, fett: 1, sukker: null, mettet_fett: null, fiber: null, salt: null,
  porsjon_navn: null, porsjon_mengde: null, porsjon_enhet: null, stk_vekt: null, tetthet: null,
  favoritt: false, antall_bruk: 0, sist_brukt: null, sist_mengde: null, sist_enhet: null, opprettet: '', oppdatert: '', ...o,
})

describe('søk i egne matvarer', () => {
  const liste = [
    mv({ navn: 'Havregryn', merke: 'Axa', sist_brukt: '2026-10-10T08:00:00Z', antall_bruk: 9 }),
    mv({ navn: 'Lettmelk', merke: 'Tine', favoritt: true, sist_brukt: '2026-10-11T08:00:00Z', strekkode: '7038010009457' }),
    mv({ navn: 'Crème fraîche', merke: 'Tine' }),
    mv({ navn: 'Grove havrekjeks', merke: 'Wasa' }),
  ]
  it('finner på navn, merke og strekkode, uten aksenter', () => {
    expect(sokMatvarer(liste, 'creme').map(m => m.navn)).toEqual(['Crème fraîche'])
    expect(sokMatvarer(liste, 'tine').length).toBe(2)
    expect(sokMatvarer(liste, '70380100').map(m => m.navn)).toEqual(['Lettmelk'])
  })
  it('treff som starter med søket kommer først', () => {
    expect(sokMatvarer(liste, 'havr').map(m => m.navn)).toEqual(['Havregryn', 'Grove havrekjeks'])
  })
  it('favoritter og nylig brukte', () => {
    expect(sokMatvarer(liste, '', 'favoritter').map(m => m.navn)).toEqual(['Lettmelk'])
    expect(sokMatvarer(liste, '', 'nylig').map(m => m.navn)).toEqual(['Lettmelk', 'Havregryn'])
  })
  it('normaliserer', () => { expect(normaliser('  Crème   Fraîche ')).toBe('creme fraiche') })
})

describe('dagbokslinjer', () => {
  const sted = { brukerId: 'u', dato: '2026-10-12', maltid: 'frokost' as const }
  it('lager linje med øyeblikksbilde og basis-mengde', () => {
    const r = lagLinje(mv({ navn: 'Egg', kcal: 143, protein: 12.6, stk_vekt: 60 }), 2, 'stk', sted)
    expect(r.ok && r.linje).toMatchObject({ navn: 'Egg', basis_mengde: 120, kcal_100: 143, mengde: 2, enhet: 'stk' })
    expect(r.ok && summer([r.linje]).verdier.kcal).toBeCloseTo(171.6, 10)
  })
  it('endret mengde regnes fra øyeblikksbildet', () => {
    const r = lagLinje(mv({ kcal: 200 }), 100, 'g', sted)
    const e = r.ok && endreMengde(r.linje, 150, 'g')
    expect(e && e.ok && summer([e.linje]).verdier.kcal).toBe(300)
  })
  it('porsjon på en linje uten matvare krever matvaren', () => {
    const r = lagLinje(mv({}), 100, 'g', sted)
    expect(r.ok && endreMengde(r.linje, 1, 'porsjon').ok).toBe(false)
  })
  it('måltidsmal: alle linjer, slettede matvarer hoppes over', () => {
    const a = mv({ navn: 'Havregryn', kcal: 370 }), b = mv({ navn: 'Melk', basis: '100ml', kcal: 38 })
    const mal = { id: 'm', bruker_id: 'u', navn: 'Min faste frokost', maltid: 'frokost' as const, sist_brukt: null,
      linjer: [{ matvare_id: a.id, mengde: 60, enhet: 'g' as const }, { matvare_id: b.id, mengde: 250, enhet: 'ml' as const }, { matvare_id: 'slettet', mengde: 1, enhet: 'g' as const }] }
    const r = linjerFraMal(mal, [a, b], sted)
    expect(r.feil).toBeNull()
    expect(r.mangler).toBe(1)
    expect(r.linjer.map(l => l.navn)).toEqual(['Havregryn', 'Melk'])
    expect(new Set(r.linjer.map(l => l.id)).size).toBe(2)
    expect(summer(r.linjer).verdier.kcal).toBeCloseTo(222 + 95, 10)
  })
  it('ugyldig mengde i mal stopper hele malen', () => {
    const a = mv({ basis: '100ml' })
    const r = linjerFraMal({ id: 'm', bruker_id: 'u', navn: 'X', maltid: null, sist_brukt: null, linjer: [{ matvare_id: a.id, mengde: 100, enhet: 'g' }] }, [a], sted)
    expect(r.linjer).toEqual([])
    expect(r.feil).toBeTruthy()
  })
})
