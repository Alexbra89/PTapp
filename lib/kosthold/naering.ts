// Næringsberegning for kostholdsmodulen. Ren logikk uten nettverk – brukes av både
// dagboken og dashbordet, slik at tallene alltid kommer fra samme regnestykke.
//
// Prinsipper:
// • Næringsverdier lagres per 100 g ELLER per 100 ml (basis) – aldri blandet.
// • Ukjente verdier er null, ikke 0. De vises som «mangler», og summer markerer at de er ufullstendige.
// • Full presisjon internt; avrunding skjer bare ved visning.
// • 1 ml er ikke 1 g: gram ↔ milliliter krever en kjent tetthet (g per ml).

export type Basis = '100g' | '100ml'
export type Enhet = 'g' | 'ml' | 'porsjon' | 'stk'
export type Kilde = 'manuell' | 'openfoodfacts' | 'etikett'

export const NAERINGSSTOFFER = ['kcal', 'protein', 'karbohydrater', 'fett', 'sukker', 'mettet_fett', 'fiber', 'salt'] as const
export type Naeringsstoff = typeof NAERINGSSTOFFER[number]

/** Verdier per 100 g / 100 ml. kcal kan ikke mangle på en lagret matvare. */
export type Naering = { kcal: number } & { [K in Exclude<Naeringsstoff, 'kcal'>]: number | null }
export type NaeringDelvis = { [K in Naeringsstoff]: number | null }

export const NAVN: Record<Naeringsstoff, string> = {
  kcal: 'Energi', protein: 'Protein', karbohydrater: 'Karbohydrater', fett: 'Fett',
  sukker: 'hvorav sukkerarter', mettet_fett: 'hvorav mettet fett', fiber: 'Kostfiber', salt: 'Salt',
}

export interface Matvare extends Naering {
  id: string
  bruker_id: string
  navn: string
  merke: string | null
  strekkode: string | null
  kilde: Kilde
  basis: Basis
  kj: number | null
  porsjon_navn: string | null
  porsjon_mengde: number | null   // i porsjon_enhet
  porsjon_enhet: 'g' | 'ml' | null
  stk_vekt: number | null         // gram per stykk
  tetthet: number | null          // gram per milliliter
  favoritt: boolean
  antall_bruk: number
  sist_brukt: string | null
  sist_mengde: number | null
  sist_enhet: Enhet | null
  opprettet: string
  oppdatert: string
}

export type Mengdedata = Pick<Matvare, 'basis' | 'porsjon_mengde' | 'porsjon_enhet' | 'stk_vekt' | 'tetthet'>

export const MALTIDER = [
  { id: 'frokost',      navn: 'Frokost' },
  { id: 'lunsj',        navn: 'Lunsj' },
  { id: 'middag',       navn: 'Middag' },
  { id: 'kveldsmat',    navn: 'Kveldsmat' },
  { id: 'mellommaltid', navn: 'Mellommåltid' },
] as const
export type Maltid = typeof MALTIDER[number]['id']
export const erMaltid = (s: unknown): s is Maltid => MALTIDER.some(m => m.id === s)
export const maltidNavn = (id: string) => MALTIDER.find(m => m.id === id)?.navn ?? id

/** Foreslått måltid ut fra klokkeslett. Mellommåltid velges alltid aktivt av brukeren. */
export function standardMaltid(d: Date = new Date()): Maltid {
  const t = d.getHours()
  if (t >= 4 && t < 10) return 'frokost'
  if (t >= 10 && t < 14) return 'lunsj'
  if (t >= 14 && t < 19) return 'middag'
  return 'kveldsmat'
}

/** Én registrering i dagboken: et øyeblikksbilde av matvaren (per 100) + mengden som ble spist. */
export interface Logglinje {
  id: string
  bruker_id: string
  dato: string
  maltid: Maltid
  matvare_id: string | null
  navn: string
  merke: string | null
  basis: Basis
  mengde: number
  enhet: Enhet
  basis_mengde: number        // gram (basis 100g) eller milliliter (basis 100ml)
  kcal_100: number
  protein_100: number | null
  karbohydrater_100: number | null
  fett_100: number | null
  sukker_100: number | null
  mettet_fett_100: number | null
  fiber_100: number | null
  salt_100: number | null
  opprettet?: string
}

export const GRENSER = {
  mengde: 10000,       // største mengde i én registrering (g, ml, porsjoner eller stk)
  kcal: 950,           // per 100 g/ml – rent fett er ~900
  makro: { '100g': 100, '100ml': 200 } as Record<Basis, number>,
  tetthet: [0.2, 3] as const,
}

const endelig = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

export type Mengderesultat = { ok: true; basisMengde: number } | { ok: false; feil: string }

/** Gjør om mengde i valgt enhet til gram eller milliliter i matvarens egen basis. */
export function tilBasisMengde(mengde: number, enhet: Enhet, m: Mengdedata): Mengderesultat {
  if (!endelig(mengde) || mengde <= 0) return { ok: false, feil: 'Mengden må være større enn 0.' }
  if (mengde > GRENSER.mengde) return { ok: false, feil: `Mengden kan ikke være over ${GRENSER.mengde.toLocaleString('nb-NO')}.` }

  const fraGram = (g: number): Mengderesultat => {
    if (m.basis === '100g') return { ok: true, basisMengde: g }
    if (!m.tetthet) return { ok: false, feil: 'Verdiene gjelder per 100 ml. Bruk milliliter, eller oppgi tetthet (g per ml) på matvaren.' }
    return { ok: true, basisMengde: g / m.tetthet }
  }
  const fraMl = (ml: number): Mengderesultat => {
    if (m.basis === '100ml') return { ok: true, basisMengde: ml }
    if (!m.tetthet) return { ok: false, feil: 'Verdiene gjelder per 100 g. Bruk gram, eller oppgi tetthet (g per ml) på matvaren.' }
    return { ok: true, basisMengde: ml * m.tetthet }
  }

  let r: Mengderesultat
  switch (enhet) {
    case 'g':  r = fraGram(mengde); break
    case 'ml': r = fraMl(mengde); break
    case 'porsjon':
      if (!m.porsjon_mengde || !m.porsjon_enhet) return { ok: false, feil: 'Matvaren har ingen kjent porsjonsstørrelse.' }
      r = m.porsjon_enhet === 'g' ? fraGram(mengde * m.porsjon_mengde) : fraMl(mengde * m.porsjon_mengde)
      break
    case 'stk':
      if (!m.stk_vekt) return { ok: false, feil: 'Matvaren har ingen kjent vekt per stykk.' }
      r = fraGram(mengde * m.stk_vekt)
      break
    default: return { ok: false, feil: 'Ukjent enhet.' }
  }
  if (r.ok && (!endelig(r.basisMengde) || r.basisMengde <= 0 || r.basisMengde > GRENSER.mengde)) {
    return { ok: false, feil: 'Mengden blir for stor.' }
  }
  return r
}

/** Enhetene som faktisk kan brukes for en matvare. */
export function tilgjengeligeEnheter(m: Mengdedata): Enhet[] {
  const ut: Enhet[] = []
  if (m.basis === '100g' || m.tetthet) ut.push('g')
  if (m.basis === '100ml' || m.tetthet) ut.push('ml')
  if (m.porsjon_mengde && m.porsjon_enhet) ut.push('porsjon')
  if (m.stk_vekt) ut.push('stk')
  return ut.length ? ut : [m.basis === '100ml' ? 'ml' : 'g']
}

export const enhetNavn = (e: Enhet, antall = 2) =>
  e === 'porsjon' ? (antall === 1 ? 'porsjon' : 'porsjoner') : e === 'stk' ? 'stk' : e

/** Næring for en gitt mengde (i basisenheten). Ukjente verdier forblir null. */
export function beregnNaering(per100: NaeringDelvis, basisMengde: number): NaeringDelvis {
  const f = basisMengde / 100
  const ut = {} as NaeringDelvis
  for (const k of NAERINGSSTOFFER) {
    const v = per100[k]
    ut[k] = endelig(v) ? v * f : null
  }
  return ut
}

/** Per-100-verdiene lagret på en dagbokslinje. */
export function linjePer100(l: Logglinje): NaeringDelvis {
  return {
    kcal: l.kcal_100, protein: l.protein_100, karbohydrater: l.karbohydrater_100, fett: l.fett_100,
    sukker: l.sukker_100, mettet_fett: l.mettet_fett_100, fiber: l.fiber_100, salt: l.salt_100,
  }
}

export const linjeNaering = (l: Logglinje) => beregnNaering(linjePer100(l), Number(l.basis_mengde))

export interface Totaler {
  verdier: { [K in Naeringsstoff]: number }
  /** Næringsstoffer der minst én linje mangler verdi – summen er da et minimum. */
  ufullstendig: Naeringsstoff[]
  antall: number
}

export function summer(linjer: Logglinje[]): Totaler {
  const verdier = Object.fromEntries(NAERINGSSTOFFER.map(k => [k, 0])) as Totaler['verdier']
  const mangler = new Set<Naeringsstoff>()
  for (const l of linjer) {
    const n = linjeNaering(l)
    for (const k of NAERINGSSTOFFER) {
      const v = n[k]
      if (v === null) mangler.add(k)
      else verdier[k] += v
    }
  }
  return { verdier, ufullstendig: NAERINGSSTOFFER.filter(k => mangler.has(k)), antall: linjer.length }
}

/** Summer per måltid, i fast rekkefølge. */
export function summerPerMaltid(linjer: Logglinje[]) {
  return MALTIDER.map(m => {
    const egne = linjer.filter(l => l.maltid === m.id)
    return { ...m, linjer: egne, totaler: summer(egne) }
  })
}

// ── Visning ────────────────────────────────────────────────────────────────
const nb = (n: number, d: number) => n.toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: d })

export const visKcal = (n: number | null | undefined) => (endelig(n) ? nb(Math.round(n), 0) : '–')
/** Gram: én desimal under 10 g, ellers hele gram. */
export const visGram = (n: number | null | undefined) => (endelig(n) ? nb(n < 10 ? Math.round(n * 10) / 10 : Math.round(n), 1) : '–')
export const visSalt = (n: number | null | undefined) => (endelig(n) ? nb(Math.round(n * 100) / 100, 2) : '–')
export const visTall = (n: number | null | undefined, d = 1) => (endelig(n) ? nb(n, d) : '–')
export const basisTekst = (b: Basis) => (b === '100ml' ? 'per 100 ml' : 'per 100 g')

// ── Validering ─────────────────────────────────────────────────────────────
export const KJ_PER_KCAL = 4.184
export const kjTilKcal = (kj: number) => kj / KJ_PER_KCAL

export interface Valideringsresultat {
  feil: string[]        // stopper lagring
  advarsler: string[]   // vises, men brukeren kan lagre (verdiene kan stemme likevel)
}

/** Kontrollerer verdier per 100 g/ml før lagring. */
export function validerNaering(n: NaeringDelvis & { kj?: number | null }, basis: Basis): Valideringsresultat {
  const feil: string[] = []
  const advarsler: string[] = []
  const maks = GRENSER.makro[basis]

  if (!endelig(n.kcal)) feil.push('Energi (kcal) må fylles inn.')
  for (const k of NAERINGSSTOFFER) {
    const v = n[k]
    if (v === null || v === undefined) continue
    if (!endelig(v)) { feil.push(`${NAVN[k]} er ikke et gyldig tall.`); continue }
    if (v < 0) feil.push(`${NAVN[k]} kan ikke være negativ.`)
    else if (k === 'kcal' ? v > GRENSER.kcal : v > maks) feil.push(`${NAVN[k]} er for høy ${basisTekst(basis)}.`)
  }
  if (endelig(n.sukker) && endelig(n.karbohydrater) && n.sukker > n.karbohydrater + 0.5) feil.push('Sukkerarter kan ikke være mer enn karbohydratene.')
  if (endelig(n.mettet_fett) && endelig(n.fett) && n.mettet_fett > n.fett + 0.5) feil.push('Mettet fett kan ikke være mer enn fettet.')
  const sumMakro = (n.protein ?? 0) + (n.karbohydrater ?? 0) + (n.fett ?? 0)
  if (basis === '100g' && sumMakro > 105) feil.push('Protein, karbohydrater og fett blir til sammen mer enn 100 g per 100 g.')

  if (endelig(n.kcal) && endelig(n.kj) && n.kj > 0) {
    const fraKj = kjTilKcal(n.kj)
    if (Math.abs(fraKj - n.kcal) > Math.max(5, n.kcal * 0.06)) advarsler.push(`kJ og kcal stemmer ikke overens (${Math.round(n.kj)} kJ ≈ ${Math.round(fraKj)} kcal).`)
  }
  if (endelig(n.kcal) && endelig(n.protein) && endelig(n.karbohydrater) && endelig(n.fett)) {
    const forventet = 4 * n.protein + 4 * n.karbohydrater + 9 * n.fett + 2 * (n.fiber ?? 0)
    if (Math.abs(forventet - n.kcal) > Math.max(20, n.kcal * 0.2)) {
      advarsler.push(`Energien stemmer dårlig med makroene (forventet rundt ${Math.round(forventet)} kcal). Kontroller tallene.`)
    }
  }
  return { feil, advarsler }
}

/** Gyldig EAN-8, UPC-A (12), EAN-13 eller GTIN-14 med riktig kontrollsiffer. */
export function gyldigGtin(kode: string): boolean {
  if (!/^\d+$/.test(kode) || ![8, 12, 13, 14].includes(kode.length)) return false
  const sifre = kode.split('').map(Number)
  const kontroll = sifre.pop()!
  const sum = sifre.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === kontroll
}

/** Normaliserer til GTIN-13 der det er mulig (UPC-A får ledende 0), slik at samme vare får samme nøkkel. */
export function normaliserStrekkode(kode: string): string {
  const k = kode.replace(/\D/g, '')
  if (k.length === 12) return '0' + k
  if (k.length === 14 && k.startsWith('0')) return k.slice(1)
  return k
}

/** Tall fra et skjemafelt: norsk komma tillates, tomt felt er null (ukjent), ugyldig er NaN. */
export function lesTall(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  if (!/^-?\d*\.?\d+$/.test(t)) return NaN
  return Number(t)
}

// ── Datoer i dagboken ──────────────────────────────────────────────────────
/** Godtar bare en ekte kalenderdato på formen yyyy-MM-dd. */
export function gyldigDato(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [a, m, d] = s.split('-').map(Number)
  const dt = new Date(a, m - 1, d)
  return dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d && a >= 2000 && a < 2100
}
