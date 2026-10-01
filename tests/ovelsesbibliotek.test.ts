import { describe, it, expect } from 'vitest'
import {
  OVELSER, finnOvelse, finnOvelseNavn, muskler, visesBakfra, utstyrType, utvalg, froFraDato, MUSKELNAVN,
} from '@/data/ovelsesbibliotek'

const kategorier = Array.from(new Set(OVELSER.map(o => o.kategori)))

describe('øvelsesbiblioteket', () => {
  it('har unike id-er', () => {
    expect(new Set(OVELSER.map(o => o.id)).size).toBe(OVELSER.length)
  })

  it('gir hver øvelse minst én gyldig primærmuskel', () => {
    for (const o of OVELSER) {
      const { primaer, sekundaer } = muskler(o)
      expect(primaer.length, o.id).toBeGreaterThan(0)
      for (const m of [...primaer, ...sekundaer]) expect(MUSKELNAVN[m], `${o.id}: ${m}`).toBeDefined()
    }
  })

  it('gir hver øvelse en utstyrstype', () => {
    for (const o of OVELSER) expect(utstyrType(o), o.id).toBeTruthy()
  })

  it('viser bakfra når flest muskler er på baksiden', () => {
    expect(visesBakfra(['lats', 'ovreRygg'])).toBe(true)
    expect(visesBakfra(['bryst', 'triceps'])).toBe(false)
  })

  it('finner øvelse på URL-kodet id og på navn', () => {
    const o = OVELSER[0]
    expect(finnOvelse(encodeURIComponent(o.id))?.id).toBe(o.id)
    expect(finnOvelseNavn(`  ${o.navn.toUpperCase()} `)?.id).toBe(o.id)
    expect(finnOvelse('%E0%A4%A')).toBeUndefined() // ugyldig koding skal ikke kaste
  })
})

describe('utvalg', () => {
  it('gir øvelser for alle kategorier', () => {
    for (const k of kategorier) expect(utvalg(k, 'alle', 3).length, k).toBeGreaterThan(0)
  })

  it('respekterer kategori, sted og antall', () => {
    const r = utvalg('bryst', 'hjemme', 4)
    expect(r.length).toBeLessThanOrEqual(4)
    for (const o of r) {
      expect(o.kategori).toBe('bryst')
      expect(['hjemme', 'begge']).toContain(o.sted)
    }
  })

  it('gir samme utvalg for samme frø og ingen duplikater', () => {
    const fro = froFraDato('2026-09-30')
    const a = utvalg('rygg', 'alle', 5, fro).map(o => o.id)
    expect(utvalg('rygg', 'alle', 5, fro).map(o => o.id)).toEqual(a)
    expect(new Set(a).size).toBe(a.length)
  })

  it('gir ulike frø for ulike datoer', () => {
    expect(froFraDato('2026-09-30')).not.toBe(froFraDato('2026-10-01'))
  })
})

describe('tidligere navn', () => {
  it('finner øvelser under gammelt navn og gir alle navn til historikk', async () => {
    const { finnOvelseNavn, alleNavn } = await import('@/data/ovelsesbibliotek')
    expect(finnOvelseNavn('Incline benkpress')?.navn).toBe('Skråbenkpress')
    expect(finnOvelseNavn('leg curl')?.navn).toBe('Lårcurl')
    expect(alleNavn('Lårcurl')).toEqual(expect.arrayContaining(['Lårcurl', 'Leg curl']))
    expect(alleNavn('Ukjent øvelse')).toEqual(['Ukjent øvelse'])
  })
})
