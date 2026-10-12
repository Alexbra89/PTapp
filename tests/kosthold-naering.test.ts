import { describe, it, expect } from 'vitest'
import {
  tilBasisMengde, beregnNaering, summer, summerPerMaltid, validerNaering, gyldigGtin, normaliserStrekkode,
  lesTall, tilgjengeligeEnheter, visGram, visKcal, standardMaltid, type Logglinje, type Mengdedata,
} from '@/lib/kosthold/naering'

const gram: Mengdedata = { basis: '100g', porsjon_mengde: null, porsjon_enhet: null, stk_vekt: null, tetthet: null }
const per100 = { kcal: 250, protein: 20, karbohydrater: 30, fett: 6, sukker: null, mettet_fett: null, fiber: null, salt: null }

const linje = (o: Partial<Logglinje>): Logglinje => ({
  id: 'x', bruker_id: 'u', dato: '2026-10-12', maltid: 'frokost', matvare_id: null, navn: 'Test', merke: null,
  basis: '100g', mengde: 100, enhet: 'g', basis_mengde: 100, kcal_100: 100, protein_100: 10, karbohydrater_100: 10,
  fett_100: 1, sukker_100: null, mettet_fett_100: null, fiber_100: null, salt_100: null, ...o,
})

describe('næring for valgt mengde', () => {
  it('oppgavens eksempel: 150 g av 250 kcal / 20 P / 30 K / 6 F per 100 g', () => {
    const r = tilBasisMengde(150, 'g', gram)
    expect(r).toEqual({ ok: true, basisMengde: 150 })
    const n = beregnNaering(per100, 150)
    expect(n.kcal).toBe(375)
    expect(n.protein).toBe(30)
    expect(n.karbohydrater).toBe(45)
    expect(n.fett).toBeCloseTo(9, 10)
  })

  it('ukjente verdier forblir ukjente (null), ikke 0', () => {
    expect(beregnNaering(per100, 150).sukker).toBeNull()
  })

  it('full presisjon internt, avrunding bare ved visning', () => {
    const n = beregnNaering({ ...per100, protein: 3.33 }, 37)
    expect(n.protein).toBeCloseTo(1.2321, 10)
    expect(visGram(n.protein)).toBe('1,2')
    expect(visKcal(beregnNaering(per100, 37).kcal)).toBe('93') // 92,5 → 93
    expect(visGram(123.6)).toBe('124')
  })
})

describe('enheter', () => {
  const drikk: Mengdedata = { basis: '100ml', porsjon_mengde: 330, porsjon_enhet: 'ml', stk_vekt: null, tetthet: null }

  it('ml på en drikke uten tetthet: rett i basis', () => {
    expect(tilBasisMengde(250, 'ml', drikk)).toEqual({ ok: true, basisMengde: 250 })
  })

  it('1 ml er ikke 1 g: gram på drikke krever tetthet', () => {
    const r = tilBasisMengde(250, 'g', drikk)
    expect(r.ok).toBe(false)
    const medTetthet = tilBasisMengde(103, 'g', { ...drikk, tetthet: 1.03 })
    expect(medTetthet.ok && medTetthet.basisMengde).toBeCloseTo(100, 10)
  })

  it('ml på fast vare krever tetthet', () => {
    expect(tilBasisMengde(100, 'ml', gram).ok).toBe(false)
    const olje = tilBasisMengde(10, 'ml', { ...gram, tetthet: 0.92 })
    expect(olje.ok && olje.basisMengde).toBeCloseTo(9.2, 10)
  })

  it('porsjoner med kjent størrelse', () => {
    expect(tilBasisMengde(2, 'porsjon', drikk)).toEqual({ ok: true, basisMengde: 660 })
    expect(tilBasisMengde(1.5, 'porsjon', { ...gram, porsjon_mengde: 40, porsjon_enhet: 'g' })).toEqual({ ok: true, basisMengde: 60 })
    expect(tilBasisMengde(1, 'porsjon', gram).ok).toBe(false)
  })

  it('antall når vekt per stykk er kjent', () => {
    expect(tilBasisMengde(3, 'stk', { ...gram, stk_vekt: 62 })).toEqual({ ok: true, basisMengde: 186 })
    expect(tilBasisMengde(3, 'stk', gram).ok).toBe(false)
  })

  it('avviser negative, null, uendelige og for store mengder', () => {
    for (const m of [-1, 0, NaN, Infinity, 10001]) expect(tilBasisMengde(m, 'g', gram).ok).toBe(false)
    expect(tilBasisMengde(5000, 'stk', { ...gram, stk_vekt: 5 }).ok).toBe(false) // 25 kg
  })

  it('tilgjengelige enheter følger dataene', () => {
    expect(tilgjengeligeEnheter(gram)).toEqual(['g'])
    expect(tilgjengeligeEnheter({ ...gram, stk_vekt: 60, porsjon_mengde: 30, porsjon_enhet: 'g' })).toEqual(['g', 'porsjon', 'stk'])
    expect(tilgjengeligeEnheter({ basis: '100ml', porsjon_mengde: null, porsjon_enhet: null, stk_vekt: null, tetthet: 1.03 })).toEqual(['g', 'ml'])
  })
})

describe('summer', () => {
  it('summerer en dag og per måltid med samme tall', () => {
    const linjer = [
      linje({ id: 'a', maltid: 'frokost', basis_mengde: 150, kcal_100: 250, protein_100: 20, karbohydrater_100: 30, fett_100: 6 }),
      linje({ id: 'b', maltid: 'lunsj', basis_mengde: 50, kcal_100: 100, protein_100: 10, karbohydrater_100: 5, fett_100: 2 }),
    ]
    const t = summer(linjer)
    expect(t.verdier.kcal).toBe(425)
    expect(t.verdier.protein).toBe(35)
    expect(t.verdier.karbohydrater).toBe(47.5)
    expect(t.verdier.fett).toBe(10)
    const perMaltid = summerPerMaltid(linjer)
    const sumAvMaltider = perMaltid.reduce((s, m) => s + m.totaler.verdier.kcal, 0)
    expect(sumAvMaltider).toBe(t.verdier.kcal)
    expect(perMaltid.map(m => m.id)).toEqual(['frokost', 'lunsj', 'middag', 'kveldsmat', 'mellommaltid'])
  })

  it('markerer næringsstoffer som mangler på minst én linje', () => {
    const t = summer([linje({ protein_100: null }), linje({})])
    expect(t.verdier.protein).toBe(10)
    expect(t.ufullstendig).toContain('protein')
    expect(t.ufullstendig).not.toContain('kcal')
  })

  it('tom dag gir 0', () => {
    expect(summer([]).verdier.kcal).toBe(0)
  })

  it('tåler tall som kommer som tekst fra databasen (numeric)', () => {
    expect(summer([linje({ basis_mengde: '150' as any })]).verdier.kcal).toBe(150)
  })
})

describe('validering', () => {
  it('godtar en vanlig vare', () => {
    expect(validerNaering({ ...per100, fiber: 3, salt: 1.2, sukker: 2, mettet_fett: 1 }, '100g').feil).toEqual([])
  })
  it('stopper negative og urimelige verdier', () => {
    expect(validerNaering({ ...per100, protein: -1 }, '100g').feil.length).toBeGreaterThan(0)
    expect(validerNaering({ ...per100, kcal: 2000 }, '100g').feil.length).toBeGreaterThan(0)
    expect(validerNaering({ ...per100, karbohydrater: 120 }, '100g').feil.length).toBeGreaterThan(0)
    expect(validerNaering({ ...per100, sukker: 40 }, '100g').feil.length).toBeGreaterThan(0)
    expect(validerNaering({ ...per100, fett: 6, mettet_fett: 8 }, '100g').feil.length).toBeGreaterThan(0)
    expect(validerNaering({ ...per100, kcal: NaN }, '100g').feil.length).toBeGreaterThan(0)
  })
  it('advarer når kJ og kcal eller makroer ikke henger sammen', () => {
    expect(validerNaering({ ...per100, kj: 1046 }, '100g').advarsler).toEqual([])
    expect(validerNaering({ ...per100, kj: 2000 }, '100g').advarsler.length).toBe(1)
    expect(validerNaering({ ...per100, kcal: 500 }, '100g').advarsler.length).toBe(1)
  })
})

describe('strekkoder', () => {
  it('kontrollsiffer for EAN-13, EAN-8 og UPC-A', () => {
    expect(gyldigGtin('7038010009457')).toBe(true)
    expect(gyldigGtin('7038010009458')).toBe(false)
    expect(gyldigGtin('96385074')).toBe(true)
    expect(gyldigGtin('036000291452')).toBe(true)
    expect(gyldigGtin('12345')).toBe(false)
    expect(gyldigGtin('70380100094a7')).toBe(false)
  })
  it('UPC-A og GTIN-14 normaliseres til EAN-13', () => {
    expect(normaliserStrekkode('036000291452')).toBe('0036000291452')
    expect(normaliserStrekkode('07038010009457')).toBe('7038010009457')
    expect(gyldigGtin(normaliserStrekkode('036000291452'))).toBe(true)
  })
})

describe('skjemafelt', () => {
  it('leser norsk komma, tomt er ukjent, tull er NaN', () => {
    expect(lesTall('7,5')).toBe(7.5)
    expect(lesTall(' 12 ')).toBe(12)
    expect(lesTall('')).toBeNull()
    expect(lesTall('abc')).toBeNaN()
    expect(lesTall('1,2,3')).toBeNaN()
  })
})

describe('standardmåltid', () => {
  it('foreslår måltid etter klokkeslett', () => {
    const kl = (t: number) => new Date(2026, 0, 1, t)
    expect(standardMaltid(kl(7))).toBe('frokost')
    expect(standardMaltid(kl(12))).toBe('lunsj')
    expect(standardMaltid(kl(17))).toBe('middag')
    expect(standardMaltid(kl(21))).toBe('kveldsmat')
    expect(standardMaltid(kl(2))).toBe('kveldsmat')
  })
})
