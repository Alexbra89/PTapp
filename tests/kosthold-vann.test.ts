import { describe, it, expect, beforeEach } from 'vitest'
import { Vannko, hentVannko, tomVannkoer, VANN_MAKS, type Vannstatus } from '@/lib/kosthold/vann'

// Falsk database som gjør det samme som vann_sett(): lagrer bare en nyere versjon,
// og svarer med det som faktisk er lagret.
function falskDb(start: Vannstatus = { glass: 0, versjon: 0 }) {
  let lagret = { ...start }
  const mottatt: Vannstatus[] = []
  const anvend = (glass: number, versjon: number): Vannstatus => {
    mottatt.push({ glass, versjon })
    if (versjon > lagret.versjon) lagret = { glass, versjon }
    return { ...lagret }
  }
  return { anvend, mottatt, get lagret() { return lagret } }
}

/** Promise som testen selv løser eller avviser */
function utsatt<T>() {
  let los!: (v: T) => void, avvis!: (e: unknown) => void
  const p = new Promise<T>((a, b) => { los = a; avvis = b })
  return { p, los, avvis }
}

const ferdig = () => new Promise(r => setTimeout(r, 0))
const nettbrudd = () => new TypeError('Failed to fetch')

describe('Vannko – ordning av lagringer', () => {
  it('raske trykk: én lagring om gangen, og det siste antallet blir stående', async () => {
    const db = falskDb()
    let underveis = 0, maksUnderveis = 0
    const ventende: Array<() => void> = []
    const ko = new Vannko((g, v) => {
      underveis++; maksUnderveis = Math.max(maksUnderveis, underveis)
      return new Promise(r => ventende.push(() => { underveis--; r(db.anvend(g, v)) }))
    })
    ko.settLagret({ glass: 0, versjon: 0 })

    ko.endre(1); ko.endre(1); ko.endre(1)
    expect(ko.tilstand().glass).toBe(3)
    while (ventende.length) { ventende.shift()!(); await ferdig() }

    expect(maksUnderveis).toBe(1)
    // Trykk 2 og 3 kom mens 1 ble lagret: bare det nyeste (3) sendes etterpå
    expect(db.mottatt.map(m => m.glass)).toEqual([1, 3])
    expect(db.lagret.glass).toBe(3)
    expect(ko.tilstand()).toMatchObject({ glass: 3, lagrer: false, feil: null })
  })

  it('1 feiler, 2 lagres, så kommer et forsinket forsøk med 1 fram: sluttresultatet er 2', async () => {
    const db = falskDb()
    const forsok1 = utsatt<Vannstatus>()
    const vent = utsatt<void>()
    let kall = 0
    const ko = new Vannko(
      (g, v) => {
        kall++
        if (kall === 1) return forsok1.p
        return Promise.resolve(db.anvend(g, v))
      },
      { vent: () => vent.p, klokke: () => 1000 },
    )
    ko.settLagret({ glass: 0, versjon: 0 })

    ko.sett(1)
    const versjon1 = 1000
    forsok1.avvis(nettbrudd())        // første lagring feiler, køen venter før nytt forsøk
    await ferdig()
    ko.sett(2)                         // trykk under ventetiden
    vent.los()
    await ferdig(); await ferdig()

    // 1 sendes ikke igjen fra appen – 2 har tatt over
    expect(db.mottatt.map(m => m.glass)).toEqual([2])
    expect(db.lagret.glass).toBe(2)

    // Nettverket leverer likevel den gamle forespørselen sent: databasen ignorerer den
    const svar = db.anvend(1, versjon1)
    expect(svar.glass).toBe(2)
    expect(db.lagret.glass).toBe(2)
    expect(ko.tilstand().glass).toBe(2)
  })

  it('nye forsøk ved nettbrudd bruker samme versjon, så de er trygge', async () => {
    const db = falskDb()
    let kall = 0
    const ko = new Vannko((g, v) => (++kall < 3 ? Promise.reject(nettbrudd()) : Promise.resolve(db.anvend(g, v))), { vent: async () => {} })
    ko.settLagret({ glass: 4, versjon: 0 })
    ko.endre(1)
    for (let i = 0; i < 6; i++) await ferdig()
    expect(kall).toBe(3)
    expect(db.lagret.glass).toBe(5)
    expect(ko.tilstand()).toMatchObject({ glass: 5, lagrer: false, feil: null })
  })

  it('lagring som feiler for godt: antallet går tilbake til det som er lagret, og feilen vises', async () => {
    const ko = new Vannko(() => Promise.reject(new Error('violates check constraint')), { vent: async () => {} })
    ko.settLagret({ glass: 6, versjon: 10 })
    ko.endre(1)
    expect(ko.tilstand().glass).toBe(7)
    await ferdig(); await ferdig()
    expect(ko.tilstand().glass).toBe(6)
    expect(ko.tilstand().feil).toBeInstanceOf(Error)
    expect(ko.tilstand().lagrer).toBe(false)
  })

  it('en feil på et gammelt trykk ruller ikke tilbake et nyere som venter', async () => {
    const db = falskDb()
    const forsok1 = utsatt<Vannstatus>()
    let kall = 0
    const ko = new Vannko((g, v) => (++kall === 1 ? forsok1.p : Promise.resolve(db.anvend(g, v))), { forsok: 0 })
    ko.settLagret({ glass: 0, versjon: 0 })
    ko.sett(1)
    ko.sett(2)
    forsok1.avvis(new Error('serverfeil'))
    await ferdig(); await ferdig()
    expect(db.lagret.glass).toBe(2)
    expect(ko.tilstand()).toMatchObject({ glass: 2, feil: null })
  })
})

describe('Vannko – innlasting', () => {
  it('ingen endring før dagens antall er lastet (lesefeil gir ikke 0 som utgangspunkt)', () => {
    const sendt: number[] = []
    const ko = new Vannko(async (g, v) => { sendt.push(g); return { glass: g, versjon: v } })
    expect(ko.tilstand().glass).toBeNull()
    expect(ko.endre(1)).toBe(false)
    expect(ko.sett(1)).toBe(false)
    expect(sendt).toEqual([])
  })

  it('pluss etter innlasting av 6 glass lagrer 7, ikke 1', async () => {
    const db = falskDb({ glass: 6, versjon: 500 })
    const ko = new Vannko(async (g, v) => db.anvend(g, v), { klokke: () => 100 })
    ko.settLagret({ ...db.lagret })
    ko.endre(1)
    await ferdig()
    expect(db.lagret.glass).toBe(7)
  })

  it('etter omlasting: nytt trykk får høyere versjon enn det lagrede, også om klokken går bak', async () => {
    // Lagret fra en enhet med klokke langt fram
    const db = falskDb({ glass: 3, versjon: 9_000_000_000_000 })
    const ko = new Vannko(async (g, v) => db.anvend(g, v), { klokke: () => 1_000 })
    ko.settLagret({ ...db.lagret })
    ko.endre(-1)
    await ferdig()
    expect(db.mottatt[0].versjon).toBeGreaterThan(9_000_000_000_000)
    expect(db.lagret.glass).toBe(2)
  })

  it('en omhenting med eldre data overskriver ikke det som akkurat ble lagret', async () => {
    const db = falskDb()
    const ko = new Vannko(async (g, v) => db.anvend(g, v), { klokke: () => 50 })
    ko.settLagret({ glass: 0, versjon: 0 })
    ko.sett(4)
    await ferdig()
    ko.settLagret({ glass: 0, versjon: 0 }) // svar fra en henting som startet før lagringen
    expect(ko.tilstand().glass).toBe(4)
  })

  it('holder seg innenfor 0 og maks', async () => {
    const ko = new Vannko(async (g, v) => ({ glass: g, versjon: v }))
    ko.settLagret({ glass: 0, versjon: 0 })
    ko.endre(-1)
    expect(ko.tilstand().glass).toBe(0)
    ko.sett(VANN_MAKS + 5)
    expect(ko.tilstand().glass).toBe(VANN_MAKS)
  })
})

describe('Vannkøer per bruker og dato', () => {
  beforeEach(() => tomVannkoer())

  it('to datoer deler aldri kø eller antall', () => {
    const lag = () => async (g: number, v: number) => ({ glass: g, versjon: v })
    const man = hentVannko('a', '2026-10-12', lag)
    const tir = hentVannko('a', '2026-10-13', lag)
    expect(man).not.toBe(tir)
    man.settLagret({ glass: 5, versjon: 1 })
    tir.settLagret({ glass: 0, versjon: 0 })
    man.endre(1)
    expect(man.tilstand().glass).toBe(6)
    expect(tir.tilstand().glass).toBe(0)
    expect(hentVannko('a', '2026-10-12', lag)).toBe(man)
    expect(hentVannko('b', '2026-10-12', lag)).not.toBe(man)
  })

  it('tømmes ved utlogging', () => {
    const lag = () => async (g: number, v: number) => ({ glass: g, versjon: v })
    const ko = hentVannko('a', '2026-10-12', lag)
    tomVannkoer()
    expect(hentVannko('a', '2026-10-12', lag)).not.toBe(ko)
  })
})
