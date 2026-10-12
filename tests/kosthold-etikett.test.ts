import { describe, it, expect } from 'vitest'
import { tolkEtikett, normaliserLinje } from '@/lib/kosthold/etikett'
import { fraOpenFoodFacts, lesMengde, offBasis } from '@/lib/kosthold/openfoodfacts'

// Typiske OCR-resultater fra norske etiketter (skrevet av slik Tesseract leverer dem, med støy).
const TO_KOLONNER = `
NÆRINGSINNHOLD Per 100 g Per porsjon (30 g)
Energi 1550 kJ / 370 kcal 465 kJ / 111 kcal
Fett 7,0 g 2,1 g
hvorav mettede fettsyrer 1,2 g 0,4 g
hvorav enumettede fettsyrer 2,5 g 0,8 g
Karbohydrat 60 g 18 g
hvorav sukkerarter 1,1 g 0,3 g
Kostfiber 10 g 3,0 g
Protein 13 g 3,9 g
Salt 0,01 g 0 g`

describe('etikett med per 100 g og per porsjon', () => {
  const r = tolkEtikett(TO_KOLONNER)

  it('finner begge kolonnene og bruker per 100 g', () => {
    expect(r.kolonner).toEqual(['100g', 'porsjon'])
    expect(r.valgtKolonne).toBe('100g')
    expect(r.basis).toBe('100g')
    expect(r.porsjon).toEqual({ mengde: 30, enhet: 'g' })
    expect(r.fantTabell).toBe(true)
  })

  it('leser riktige tall fra riktig kolonne – blander ikke porsjon inn', () => {
    const v = Object.fromEntries(Object.entries(r.verdier).map(([k, f]) => [k, f.verdi]))
    expect(v).toEqual({ kcal: 370, kj: 1550, protein: 13, karbohydrater: 60, sukker: 1.1, fett: 7, mettet_fett: 1.2, fiber: 10, salt: 0.01 })
    expect(Object.values(r.verdier).every(f => !f.usikker)).toBe(true)
  })
})

describe('etikett per 100 ml (drikke)', () => {
  it('basis blir 100 ml, og manglende felt er null – ikke 0', () => {
    const r = tolkEtikett(`Næringsinnhold pr. 100 ml\nEnergi 180 kJ/42 kcal\nFett 0 g\nKarbohydrater 10,6 g\nhvorav sukkerarter 10,6 g\nProtein 0 g\nSalt 0 g`)
    expect(r.basis).toBe('100ml')
    expect(r.verdier.kcal.verdi).toBe(42)
    expect(r.verdier.fiber.verdi).toBeNull()
    expect(r.verdier.mettet_fett.verdi).toBeNull()
    expect(r.verdier.fiber.usikker).toBe(false)
  })
})

describe('dårlig bilde / OCR-støy', () => {
  it('retter O→0 i tall og q→g', () => {
    expect(normaliserLinje('Fett O,5q')).toBe('fett 0,5 g')
    expect(normaliserLinje('Protein 1O g')).toBe('protein 10 g')
    expect(normaliserLinje('Energi 1 550 kJ')).toBe('energi 1550 kj')
  })

  it('energi fordelt på flere linjer', () => {
    const r = tolkEtikett(`Per 100 g\nEnergi\n1550 kJ\n370 kcal\nProtein 13 g\nFett 7 g\nKarbohydrat 60 g`)
    expect(r.verdier.kj.verdi).toBe(1550)
    expect(r.verdier.kcal.verdi).toBe(370)
  })

  it('«mindre enn» merkes som usikkert', () => {
    const r = tolkEtikett(`Per 100 g\nEnergi 1600 kJ / 380 kcal\nFett <0,5 g\nKarbohydrat 90 g\nProtein 4 g`)
    expect(r.verdier.fett.verdi).toBe(0.5)
    expect(r.verdier.fett.usikker).toBe(true)
  })

  it('tapt komma (7,0 → 70) fanges av sammenhengskontrollen', () => {
    const r = tolkEtikett(`Per 100 g\nEnergi 1550 kJ / 370 kcal\nFett 70 g\nhvorav mettede fettsyrer 1,2 g\nKarbohydrat 60 g\nProtein 13 g`)
    expect(r.verdier.fett.verdi).toBe(70) // verdien endres ikke …
    expect(r.verdier.kcal.usikker).toBe(true) // … men energien stemmer ikke med makroene
    expect(r.merknader.join(' ')).toMatch(/henger ikke sammen/)
  })

  it('kJ og kcal som ikke stemmer, merkes begge', () => {
    const r = tolkEtikett(`Per 100 g\nEnergi 1550 kJ / 870 kcal\nProtein 13 g`)
    expect(r.verdier.kcal.usikker).toBe(true)
    expect(r.verdier.kj.usikker).toBe(true)
  })

  it('bare kJ: kcal regnes ut og merkes som beregnet', () => {
    const r = tolkEtikett(`Per 100 g\nEnergi 1550 kJ\nProtein 13 g\nFett 7 g\nKarbohydrat 60 g`)
    expect(r.verdier.kcal.verdi).toBeCloseTo(370.46, 1)
    expect(r.verdier.kcal.beregnet).toBe(true)
  })

  it('%RI-kolonnen blandes ikke inn som verdier', () => {
    const r = tolkEtikett(`Per 100 g %RI*\nEnergi 1550 kJ / 370 kcal 19 %\nFett 7,0 g 10 %\nProtein 13 g 26 %\nKarbohydrat 60 g 23 %`)
    expect(r.verdier.fett.verdi).toBe(7)
    expect(r.verdier.protein.verdi).toBe(13)
    expect(r.verdier.fett.usikker).toBe(false)
  })

  it('uten kolonneoverskrift: basis ukjent, brukeren må velge', () => {
    const r = tolkEtikett(`Energi 1550 kJ / 370 kcal\nFett 7 g\nProtein 13 g`)
    expect(r.basis).toBeNull()
    expect(r.merknader.join(' ')).toMatch(/Velg selv/)
  })

  it('bare per porsjon med størrelse: regnes om til per 100 og merkes beregnet', () => {
    const r = tolkEtikett(`Per porsjon (250 ml)\nEnergi 450 kJ / 105 kcal\nKarbohydrat 26 g\nProtein 0 g\nFett 0 g`)
    expect(r.basis).toBe('100ml')
    expect(r.verdier.kcal.verdi).toBeCloseTo(42, 5)
    expect(r.verdier.kcal.beregnet).toBe(true)
  })

  it('bare per porsjon uten størrelse: ber om porsjonsstørrelse, gjetter ikke', () => {
    const r = tolkEtikett(`Per porsjon\nEnergi 450 kJ / 105 kcal\nProtein 2 g`)
    expect(r.trengerPorsjonsstorrelse).toBe(true)
    expect(r.basis).toBeNull()
    expect(r.verdier.kcal.verdi).toBe(105)
  })

  it('helt uleselig bilde gir ingen verdier', () => {
    const r = tolkEtikett('~~ ,. ;; \n ll1 ||')
    expect(r.fantTabell).toBe(false)
    expect(Object.values(r.verdier).every(f => f.verdi === null)).toBe(true)
  })

  it('færre tall enn kolonner merkes usikkert', () => {
    const r = tolkEtikett(`Per 100 g Per porsjon (30 g)\nEnergi 1550 kJ / 370 kcal 465 kJ / 111 kcal\nProtein 13 g`)
    expect(r.verdier.protein.verdi).toBe(13)
    expect(r.verdier.protein.usikker).toBe(true)
  })
})

describe('Open Food Facts', () => {
  it('mapper et produkt per 100 g, med porsjon og uten å finne på manglende verdier', () => {
    const u = fraOpenFoodFacts({
      code: '7038010009457', product_name: 'Lettmelk', brands: 'Tine,Tine SA', quantity: '1 l', product_quantity_unit: 'ml',
      serving_size: '250 ml', nutriments: { 'energy-kcal_100g': 38, 'energy-kj_100g': 161, proteins_100g: 3.5, carbohydrates_100g: 4.5, sugars_100g: 4.5, fat_100g: 1, 'saturated-fat_100g': 0.6, salt_100g: 0.1 },
    })
    expect(u.basis).toBe('100ml')
    expect(u.merke).toBe('Tine')
    expect(u.naering).toEqual({ kcal: 38, protein: 3.5, karbohydrater: 4.5, fett: 1, sukker: 4.5, mettet_fett: 0.6, fiber: null, salt: 0.1 })
    expect(u.porsjon_mengde).toBe(250)
    expect(u.porsjon_enhet).toBe('ml')
    expect(u.mangler).toEqual([])
  })

  it('produkt uten næringsdata gir tomme felt og liste over mangler', () => {
    const u = fraOpenFoodFacts({ code: '7038010009457', product_name: 'Ukjent', nutriments: {} })
    expect(u.naering.kcal).toBeNull()
    expect(u.mangler).toEqual(['kcal', 'protein', 'karbohydrater', 'fett'])
  })

  it('kcal fra kJ og salt fra natrium er merket', () => {
    const u = fraOpenFoodFacts({ code: '96385074', product_name: 'X', nutriments: { 'energy-kj_100g': 1000, sodium_100g: 0.4 } })
    expect(u.naering.kcal).toBeCloseTo(239, 0)
    expect(u.naering.salt).toBeCloseTo(1, 10)
    expect(u.merknader.length).toBe(2)
  })

  it('leser mengder', () => {
    expect(lesMengde('1 skive (35 g)')).toEqual({ mengde: 35, enhet: 'g' })
    expect(lesMengde('33 cl')).toEqual({ mengde: 330, enhet: 'ml' })
    expect(lesMengde('0,5 l')).toEqual({ mengde: 500, enhet: 'ml' })
    expect(lesMengde('stor')).toBeNull()
    expect(offBasis({ quantity: '500 g' })).toBe('100g')
    expect(offBasis({ quantity: '1,5 l' })).toBe('100ml')
  })
})

// Ekte utdata fra Tesseract (nor, PSM 6) for en skarp, digital etikett – med de vanlige feilene:
// g lest som 9, tapt komma, «kcal» på egen linje og l i stedet for 1.
const EKTE_OCR_NOR = `Næringsinnhold

Per 100 9    Per porsjon -
Energi                         1550 kJ / 370  620 kJ / 148 kcal

kcal

Fett                                         7,09g                 2,89
hvorav mettede
fettsyrer                                   129                 0,59
Karbohydrat                                60 g                  249
hvorav sukkerarter                       l,1g                 0,4g
Kostfiber                                    10 g                 4,0g
Protein                                      13g                 529
Salt                                        0,01g                    Og`

const EKTE_OCR_ENG = `Neeringsinnhold
Per 100 g    Per porsjon a.
Energi                         1550 kJ /370  620 kJ / 148 kcal
kcal
Fett                                         7,09                 2,89
hvorav mettede
fettsyrer                                   1.29                 059
Karbohydrat                                60 g                  24g
hvorav sukkerarter                       119                 0,49
Kostfiber                                    10g                 4,09
Protein                                      13 9                 529
Salt                                        0,01g                    0g`

describe('ekte OCR-utdata', () => {
  for (const [navn, tekst] of [['nor', EKTE_OCR_NOR], ['eng', EKTE_OCR_ENG]] as const) {
    it(`${navn}: per 100 g-kolonnen, energi parret riktig, og hver verdi er riktig eller merket usikker`, () => {
      const r = tolkEtikett(tekst)
      expect(r.kolonner).toEqual(['100g', 'porsjon'])
      expect(r.basis).toBe('100g')
      expect(r.verdier.kcal).toMatchObject({ verdi: 370, usikker: false })
      expect(r.verdier.kj).toMatchObject({ verdi: 1550, usikker: false })
      const riktig = { kcal: 370, kj: 1550, fett: 7, mettet_fett: 1.2, karbohydrater: 60, sukker: 1.1, fiber: 10, protein: 13, salt: 0.01 }
      for (const [k, v] of Object.entries(riktig)) {
        const f = r.verdier[k as keyof typeof riktig]
        // Aldri en stille feil: enten riktig, eller merket usikker (eller ukjent)
        expect(f.verdi === null || Math.abs(f.verdi - v) < 1e-9 || f.usikker, `${k}=${f.verdi}`).toBe(true)
      }
      expect(r.verdier.karbohydrater).toMatchObject({ verdi: 60, usikker: false })
      expect(r.verdier.fiber).toMatchObject({ verdi: 10, usikker: false })
      expect(r.verdier.salt).toMatchObject({ verdi: 0.01, usikker: false })
    })
  }

  it('«g» lest som 9 tolkes, men merkes alltid usikker', () => {
    const r = tolkEtikett(EKTE_OCR_NOR)
    expect(r.verdier.fett).toMatchObject({ verdi: 7, usikker: true })
    expect(r.verdier.fett.grunn).toMatch(/tolket/)
    expect(r.verdier.sukker).toMatchObject({ verdi: 1.1, usikker: false }) // «l,1g» → 1,1 g (l→1 er trygt)
    const eng = tolkEtikett(EKTE_OCR_ENG)
    expect(eng.verdier.protein).toMatchObject({ verdi: 13, usikker: true }) // «13 9»
  })

  it('kcal uten enhet godtas ikke hvis det ikke stemmer med kJ', () => {
    const r = tolkEtikett('Per 100 g\nEnergi 1550 kJ / 120\nProtein 13 g\nFett 7 g\nKarbohydrat 60 g')
    expect(r.verdier.kcal.usikker).toBe(true)
  })
})

describe('regresjon F2: tekst utenfor tabellen', () => {
  it('reklametekst over tabellen overstyrer ikke tabellverdien', () => {
    const r = tolkEtikett('Høyt proteininnhold: 20 g protein\nNæringsinnhold per 100 g\nEnergi 1550 kJ / 370 kcal\nFett 7 g\nKarbohydrat 60 g\nProtein 13 g')
    expect(r.verdier.protein).toMatchObject({ verdi: 13, usikker: false })
  })
  it('samme næringsstoff to ganger med ulike tall merkes usikkert', () => {
    const r = tolkEtikett('Per 100 g\nEnergi 1550 kJ / 370 kcal\nFett 7 g\nKarbohydrat 60 g\nProtein 13 g\n* Protein 15 g ved tilberedning')
    expect(r.verdier.protein).toMatchObject({ verdi: 13, usikker: true })
    expect(r.verdier.protein.grunn).toMatch(/flere ganger/)
  })
  it('samme tall to ganger er ikke usikkert', () => {
    const r = tolkEtikett('Per 100 g\nEnergi 1550 kJ / 370 kcal\nProtein 13 g\nFett 7 g\nKarbohydrat 60 g\nProtein 13 g')
    expect(r.verdier.protein).toMatchObject({ verdi: 13, usikker: false })
  })
  it('overskrift nederst: tabellen leses likevel, men alt merkes usikkert', () => {
    const r = tolkEtikett('Energi 1550 kJ / 370 kcal\nFett 7 g\nProtein 13 g\nKarbohydrat 60 g\nVerdier per 100 g')
    expect(r.verdier.protein.verdi).toBe(13)
    expect(r.verdier.protein.usikker).toBe(true)
  })
})
