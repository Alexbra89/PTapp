// Tolker teksten fra OCR av en næringsdeklarasjon (norsk/skandinavisk/engelsk etikett).
//
// Viktig: parseren gjetter aldri en verdi den ikke har lest. Det den ikke finner, er null.
// Det den er usikker på (uklar kolonne, «under 0,5», tall som ikke henger sammen), merkes
// usikkert med en grunn, slik at brukeren kontrollerer det før lagring.
//
// Kolonner holdes adskilt: per 100 g, per 100 ml og per porsjon blandes aldri.

import { type Basis, type Naeringsstoff, KJ_PER_KCAL } from './naering'

export type Kolonnetype = '100g' | '100ml' | 'porsjon'

export interface Felt {
  verdi: number | null
  usikker: boolean
  grunn?: string
  beregnet?: boolean
}

export type Etikettfelt = Naeringsstoff | 'kj'

export interface Etikettresultat {
  /** Kolonnene som ble funnet, i rekkefølgen de står på etiketten. */
  kolonner: Kolonnetype[]
  /** Kolonnen verdiene under er hentet fra. */
  valgtKolonne: Kolonnetype | null
  /** Basis for verdiene: per 100 g / 100 ml. null = ukjent (brukeren må velge). */
  basis: Basis | null
  /** Porsjonsstørrelse oppgitt på etiketten, hvis lest. */
  porsjon: { mengde: number; enhet: 'g' | 'ml' } | null
  /** Bare per porsjon ble funnet, og porsjonsstørrelsen er ukjent: kan ikke regnes om til per 100. */
  trengerPorsjonsstorrelse: boolean
  verdier: Record<Etikettfelt, Felt>
  fantTabell: boolean
  merknader: string[]
}

const FELT: Etikettfelt[] = ['kcal', 'kj', 'protein', 'karbohydrater', 'sukker', 'fett', 'mettet_fett', 'fiber', 'salt']

// Rekkefølgen betyr noe: «hvorav mettede fettsyrer» inneholder «fett», «hvorav sukkerarter» står under karbohydrater.
const RADER: { felt: Exclude<Etikettfelt, 'kj' | 'kcal'> | 'energi' | 'ignorer'; re: RegExp }[] = [
  { felt: 'ignorer',       re: /\b(?:en|fler|poly|mono)\s*-?\s*umettede?|enkeltumettede?|flerumettede?|polyol|sukkeralkohol|stivelse|starch|transfett|kolesterol|natrium|sodium|vitamin|kalsium|jern\b|% ?ri|referanseinntak/i },
  { felt: 'mettet_fett',   re: /mettede?\b|mettet\b|m[æa]ttede?\b|saturate|saturated/i },
  { felt: 'sukker',        re: /sukker(?:arter)?|sockerarter|\bsugars?\b/i },
  { felt: 'karbohydrater', re: /karbohydrat|kolhydrat|carbohydrate/i },
  { felt: 'fiber',         re: /fiber|kostfiber/i },
  { felt: 'protein',       re: /prot[eé]in/i },
  { felt: 'salt',          re: /\bsalt\b/i },
  { felt: 'fett',          re: /\bfett\b|\bfedt\b|\bfat\b/i },
  { felt: 'energi',        re: /energi|energy|\bkj\b|kcal|kkal|kalori/i },
]

/** Retter vanlige OCR-feil i tall (O→0, l/I→1) og samler tusenskille foran kJ. */
export function normaliserLinje(linje: string): string {
  let s = linje.normalize('NFKC').replace(/[\u2009\u202f\u00a0]/g, ' ').toLowerCase()
  // Bokstaver som står i et tall: «o,5» → «0,5», «1o» → «10», «l2» → «12» (uten lookbehind – virker i eldre Safari)
  s = s.replace(/[0-9ol|][0-9ol|.,]*/g, t => (/\d/.test(t) ? t.replace(/o/g, '0').replace(/[l|](?=[.,]?\d)/g, '1') : t))
  // «Og» → «0 g», «7,0q» → «7,0 g» (g lest som O/q)
  s = s.replace(/(^|\s)o\s?g\b/g, '$10 g')
  s = s.replace(/(\d)\s?q\b/g, '$1 g')
  // «1 550 kJ» → «1550 kJ»
  s = s.replace(/\b(\d{1,2}) (\d{3})(?=\s*kj)/g, '$1$2')
  return s
}

interface Kolonnetreff { type: Kolonnetype; linje: number; pos: number; porsjon?: { mengde: number; enhet: 'g' | 'ml' } }

const PORSJONSORD = 'porsjon|portion|servering|serving|skive|stk|stykk|glass|boks|beger|bit|pakke'

function finnKolonner(linjer: string[]): Kolonnetreff[] {
  const treff: Kolonnetreff[] = []
  linjer.forEach((l, i) => {
    for (const m of l.matchAll(/(?:(?:per|pr\.?|i)\s*)?100\s*(g|gram|ml|milliliter)\b/g)) {
      treff.push({ type: m[1].startsWith('m') ? '100ml' : '100g', linje: i, pos: m.index ?? 0 })
    }
    // OCR leser ofte g som 9 og l som 1/i: «per 100 9», «pr. 100 m1» – bare godtatt med «per» foran
    for (const m of l.matchAll(/(?:per|pr\.?)\s*100\s*(9|m1|mi)\b/g)) {
      treff.push({ type: m[1] === '9' ? '100g' : '100ml', linje: i, pos: m.index ?? 0 })
    }
    const re = new RegExp(`(?:per|pr\\.?|1)\\s*(?:${PORSJONSORD})[^\\d\\n]{0,12}(?:\\(?\\s*(\\d+(?:[.,]\\d+)?)\\s*(g|ml)\\b)?`, 'g')
    for (const m of l.matchAll(re)) {
      const porsjon = m[1] ? { mengde: Number(m[1].replace(',', '.')), enhet: m[2] as 'g' | 'ml' } : undefined
      treff.push({ type: 'porsjon', linje: i, pos: m.index ?? 0, porsjon })
    }
  })
  // Første forekomst av hver type, i rekkefølge
  const sett = new Set<Kolonnetype>()
  return treff
    .sort((a, b) => a.linje - b.linje || a.pos - b.pos)
    .filter(t => (sett.has(t.type) ? false : (sett.add(t.type), true)))
}

interface Tallverdi { verdi: number; enhet: string | null; mindreEnn: boolean; grunn?: string }

/** Alle tall i en linje med enhet. Prosent (%RI) og tall i parentes rett etter porsjonsord hoppes over. */
function lesTall(linje: string): Tallverdi[] {
  const ut: Tallverdi[] = []
  const re = /(<|under|mindre enn)?\s*(\d+(?:[.,]\d+)?)\s*(kj|kcal|kkal|mg|µg|g)?(?!\s*%|\d)/g
  for (const m of linje.matchAll(re)) {
    const etter = linje.slice((m.index ?? 0) + m[0].length).trimStart()
    if (etter.startsWith('%')) continue
    const verdi = Number(m[2].replace(',', '.'))
    if (!Number.isFinite(verdi)) continue
    let enhet = m[3] ?? null
    let v = verdi
    if (enhet === 'mg') { v = verdi / 1000; enhet = 'g' }
    if (enhet === 'µg') { v = verdi / 1e6; enhet = 'g' }
    if (enhet === 'kkal') enhet = 'kcal'
    ut.push({ verdi: v, enhet, mindreEnn: !!m[1], raa: m[2] } as Tallverdi & { raa: string })
  }
  return ut
}

const tolket = (raa: string, verdi: number) => `Usikker lesing: «${raa}» er tolket som ${String(verdi).replace('.', ',')} g`

/**
 * Tall i en rad med gram (fett, protein …). OCR leser ofte «g» som «9»: «7,0 g» → «7,09»,
 * «24 g» → «249», «13 g» → «13 9», og mister komma: «0,5 g» → «059». Slike tall tolkes,
 * men merkes ALLTID som usikre – brukeren må se på dem.
 */
export function lesGramtall(linje: string, salt = false): Tallverdi[] {
  const raa = lesTall(linje) as (Tallverdi & { raa: string })[]
  const ut: Tallverdi[] = []
  for (let i = 0; i < raa.length; i++) {
    const t = raa[i]
    // «13 9»: et frittstående 9-tall rett etter et tall uten enhet er trolig enheten
    if (t.enhet === null && t.raa === '9' && ut.length && ut[ut.length - 1].enhet === null && !ut[ut.length - 1].grunn) {
      const f = ut[ut.length - 1]
      f.enhet = 'g'; f.grunn = `Usikker lesing: «${String(f.verdi).replace('.', ',')} 9» er tolket som ${String(f.verdi).replace('.', ',')} g`
      continue
    }
    // «7,09g»: g lest som «9g». To desimaler som ender på 9 er sjeldent (unntatt salt) – tolkes og merkes
    if (t.enhet === 'g' && !salt && /^\d+[.,]\d9$/.test(t.raa)) {
      const v = Number(t.raa.slice(0, -1).replace(',', '.'))
      ut.push({ ...t, verdi: v, grunn: tolket(`${t.raa}g`, v) }); continue
    }
    if (t.enhet === null) {
      let m: RegExpMatchArray | null
      if ((m = t.raa.match(/^(\d+[.,]\d)9$/))) { const v = Number(m[1].replace(',', '.')); ut.push({ ...t, verdi: v, enhet: 'g', grunn: tolket(t.raa, v) }); continue }
      if ((m = t.raa.match(/^0(\d)9?$/))) { const v = Number(`0.${m[1]}`); ut.push({ ...t, verdi: v, enhet: 'g', grunn: tolket(t.raa, v) }); continue }
      if ((m = t.raa.match(/^(\d{2,})9$/))) { const v = Number(m[1]); ut.push({ ...t, verdi: v, enhet: 'g', grunn: tolket(t.raa, v) }); continue }
    }
    ut.push(t)
  }
  return ut
}

const tomtFelt = (): Felt => ({ verdi: null, usikker: false })

export function tolkEtikett(tekst: string): Etikettresultat {
  const linjer = tekst.split(/\r?\n/).map(normaliserLinje).filter(l => l.trim())
  const merknader: string[] = []
  const kolonneTreff = finnKolonner(linjer)
  const kolonner = kolonneTreff.map(k => k.type)
  const ant = Math.max(1, kolonner.length)
  const porsjon = kolonneTreff.find(k => k.type === 'porsjon')?.porsjon ?? null

  // Rå verdier per kolonne
  let raa: Record<Etikettfelt, (Felt | null)[]> = Object.fromEntries(FELT.map(f => [f, []])) as any
  let funnetRader = 0

  const settKolonner = (felt: Etikettfelt, tall: (Tallverdi | null)[], ekstraUsikker?: string) => {
    if (tall.length === 0) return
    const passer = tall.length === ant
    const verdier = tall.slice(0, ant)
    if (raa[felt].some(Boolean)) {
      // Samme næringsstoff igjen (f.eks. i en fotnote eller ingrediensliste): første treff beholdes,
      // men er tallene ulike, er det uklart hvilket som stemmer – da merkes verdien usikker.
      raa[felt].forEach((f, i) => {
        const ny = verdier[i]
        if (f && f.verdi !== null && ny && Math.abs(ny.verdi - f.verdi) > 1e-9) {
          f.usikker = true
          f.grunn = [f.grunn, `Funnet flere ganger med ulike verdier (${String(f.verdi).replace('.', ',')} og ${String(ny.verdi).replace('.', ',')})`].filter(Boolean).join('. ')
        }
      })
      return
    }
    raa[felt] = Array.from({ length: ant }, (_, i) => {
      const t = verdier[i]
      if (!t) return null
      const grunner: string[] = []
      if (t.grunn) grunner.push(t.grunn)
      if (t.mindreEnn) grunner.push('Oppgitt som «mindre enn»')
      if (!passer) grunner.push(tall.length < ant ? 'Fant færre tall enn kolonner – usikkert hvilken kolonne tallet hører til' : 'Fant flere tall enn kolonner')
      if (ekstraUsikker) grunner.push(ekstraUsikker)
      return { verdi: t.verdi, usikker: grunner.length > 0, grunn: grunner.join('. ') || undefined }
    })
  }

  const lesRader = (fra: number) => {
    raa = Object.fromEntries(FELT.map(f => [f, []])) as any
    funnetRader = 0
    for (let i = fra; i < linjer.length; i++) {
      const l = linjer[i]
      const rad = RADER.find(r => r.re.test(l))
      if (!rad || rad.felt === 'ignorer') continue
      if (rad.felt === 'energi') {
        // Energi kan stå over flere linjer: «Energi» / «1550 kJ» / «370 kcal»
        let tall = lesTall(l.replace(/energi\w*|energy|kalori\w*/i, ' '))
        let j = i
        while (tall.filter(t => t.enhet === 'kj' || t.enhet === 'kcal').length < 2 * ant && j + 1 < linjer.length && !RADER.slice(0, -1).some(r => r.re.test(linjer[j + 1]))) {
          const neste = lesTall(linjer[j + 1])
          if (!neste.some(t => t.enhet === 'kj' || t.enhet === 'kcal')) break
          tall = tall.concat(neste); j++
        }
        // Etiketter skriver «kJ / kcal» per kolonne. Pares i rekkefølge, slik at et kcal-tall som har
        // mistet enheten («1550 kJ / 370» + «kcal» på neste linje) havner i riktig kolonne.
        const par: { kj: Tallverdi | null; kcal: Tallverdi | null }[] = []
        for (const t of tall) {
          const siste = par[par.length - 1]
          if (t.enhet === 'kj') par.push({ kj: t, kcal: null })
          else if (t.enhet === 'kcal') { if (siste && !siste.kcal) siste.kcal = t; else par.push({ kj: null, kcal: t }) }
          else if (!t.enhet && siste?.kj && !siste.kcal) {
            // Uten enhet: godtas bare som kcal hvis det stemmer med kJ-tallet foran
            const ok = Math.abs(t.verdi * KJ_PER_KCAL - siste.kj.verdi) <= Math.max(20, siste.kj.verdi * 0.06)
            siste.kcal = { ...t, enhet: 'kcal', grunn: ok ? undefined : 'Mangler enhet – usikkert om dette er kcal' }
          }
        }
        const kj = par.map(p => p.kj), kcal = par.map(p => p.kcal)
        if (kj.some(Boolean)) settKolonner('kj', kj)
        if (kcal.some(Boolean)) settKolonner('kcal', kcal)
        if (!par.length && tall.length) merknader.push('Fant energitall uten enhet (kJ/kcal) – fyll inn energien selv.')
        if (par.length) funnetRader++
        continue
      }
      // Teksten etter nøkkelordet (unngår tall som står i selve navnet)
      const tall = lesGramtall(l.replace(rad.re, ' '), rad.felt === 'salt').filter(t => t.enhet === 'g' || t.enhet === null)
      if (tall.length === 0) continue
      const utenEnhet = tall.some(t => t.enhet === null)
      settKolonner(rad.felt, tall, utenEnhet ? 'Mangler enhet (g)' : undefined)
      funnetRader++
    }
  }

  // Tekst over kolonneoverskriften («Høyt proteininnhold: 20 g protein») er reklame, ikke tabellen.
  // Radene leses derfor fra overskriften og ned. Står overskriften nederst (sjelden), leses alt.
  const overskrift = kolonneTreff.length ? Math.min(...kolonneTreff.map(k => k.linje)) : 0
  lesRader(overskrift)
  if (overskrift > 0 && funnetRader < 2) {
    lesRader(0)
    merknader.push('Næringstabellen stod ikke under kolonneoverskriften. Kontroller at tallene er hentet fra tabellen.')
    for (const f of FELT) raa[f].forEach(v => { if (v && v.verdi !== null) { v.usikker = true; v.grunn = [v.grunn, 'Usikker plassering i forhold til tabellen'].filter(Boolean).join('. ') } })
  }

  // Velg kolonne: per 100 g / ml foran porsjon
  let valgt: number = -1
  const i100g = kolonner.indexOf('100g'), i100ml = kolonner.indexOf('100ml'), iPors = kolonner.indexOf('porsjon')
  if (i100g >= 0) valgt = i100g
  else if (i100ml >= 0) valgt = i100ml
  else if (iPors >= 0) valgt = iPors
  else valgt = 0

  const valgtKolonne = kolonner[valgt] ?? null
  let basis: Basis | null = valgtKolonne === '100g' ? '100g' : valgtKolonne === '100ml' ? '100ml' : null
  let trengerPorsjonsstorrelse = false

  const verdier = Object.fromEntries(FELT.map(f => [f, raa[f][valgt] ?? tomtFelt()])) as Record<Etikettfelt, Felt>

  if (kolonner.length === 0 && funnetRader > 0) {
    merknader.push('Fant ikke om tallene gjelder per 100 g, per 100 ml eller per porsjon. Velg selv før du lagrer.')
  }
  if (kolonner.length > 1) {
    merknader.push(`Etiketten har flere kolonner. Verdiene er hentet fra kolonnen «${KOLONNENAVN[valgtKolonne!]}».`)
  }

  // Bare per porsjon: regn om til per 100 hvis porsjonsstørrelsen er lest, ellers må brukeren oppgi den
  if (valgtKolonne === 'porsjon') {
    if (porsjon && porsjon.mengde > 0) {
      basis = porsjon.enhet === 'ml' ? '100ml' : '100g'
      const f = 100 / porsjon.mengde
      for (const k of FELT) {
        const v = verdier[k]
        if (v.verdi !== null) verdier[k] = { ...v, verdi: v.verdi * f, beregnet: true, grunn: [v.grunn, `Regnet om fra per porsjon (${porsjon.mengde} ${porsjon.enhet})`].filter(Boolean).join('. ') }
      }
      merknader.push(`Etiketten oppgir bare verdier per porsjon (${porsjon.mengde} ${porsjon.enhet}). De er regnet om til ${basis === '100ml' ? 'per 100 ml' : 'per 100 g'}.`)
    } else {
      trengerPorsjonsstorrelse = true
      merknader.push('Etiketten oppgir bare verdier per porsjon, uten lesbar porsjonsstørrelse. Oppgi porsjonsstørrelsen.')
    }
  }

  kontroller(verdier, basis, merknader)

  return {
    kolonner, valgtKolonne, basis, porsjon, trengerPorsjonsstorrelse, verdier,
    fantTabell: funnetRader >= 2, merknader,
  }
}

export const KOLONNENAVN: Record<Kolonnetype, string> = { '100g': 'per 100 g', '100ml': 'per 100 ml', porsjon: 'per porsjon' }

function marker(f: Felt, grunn: string) {
  if (f.verdi === null) return
  f.usikker = true
  f.grunn = f.grunn ? `${f.grunn}. ${grunn}` : grunn
}

/** Sammenhengskontroller. Endrer aldri tall – merker bare som usikre. */
function kontroller(v: Record<Etikettfelt, Felt>, basis: Basis | null, merknader: string[]) {
  // kcal mangler, men kJ er lest: regn om (merket som beregnet)
  if (v.kcal.verdi === null && v.kj.verdi !== null) {
    v.kcal = { verdi: v.kj.verdi / KJ_PER_KCAL, usikker: v.kj.usikker, beregnet: true, grunn: 'Regnet ut fra kJ' }
  }
  if (v.kcal.verdi !== null && v.kj.verdi !== null && !v.kcal.beregnet) {
    const fraKj = v.kj.verdi / KJ_PER_KCAL
    if (Math.abs(fraKj - v.kcal.verdi) > Math.max(5, v.kcal.verdi * 0.06)) {
      marker(v.kcal, 'Stemmer ikke med kJ'); marker(v.kj, 'Stemmer ikke med kcal')
    }
  }
  if (basis === '100g') {
    for (const k of ['protein', 'karbohydrater', 'sukker', 'fett', 'mettet_fett', 'fiber', 'salt'] as const) {
      if ((v[k].verdi ?? 0) > 100) marker(v[k], 'Over 100 g per 100 g – trolig feillest (komma?)')
    }
    if ((v.kcal.verdi ?? 0) > 950) marker(v.kcal, 'Urimelig høy energi per 100 g')
  }
  if (v.sukker.verdi !== null && v.karbohydrater.verdi !== null && v.sukker.verdi > v.karbohydrater.verdi + 0.5) {
    marker(v.sukker, 'Mer sukker enn karbohydrater'); marker(v.karbohydrater, 'Mindre enn sukkerartene')
  }
  if (v.mettet_fett.verdi !== null && v.fett.verdi !== null && v.mettet_fett.verdi > v.fett.verdi + 0.5) {
    marker(v.mettet_fett, 'Mer mettet fett enn fett'); marker(v.fett, 'Mindre enn mettet fett')
  }
  const { kcal, protein, karbohydrater, fett, fiber } = v
  if (kcal.verdi !== null && protein.verdi !== null && karbohydrater.verdi !== null && fett.verdi !== null) {
    const forventet = 4 * protein.verdi + 4 * karbohydrater.verdi + 9 * fett.verdi + 2 * (fiber.verdi ?? 0)
    if (Math.abs(forventet - kcal.verdi) > Math.max(20, kcal.verdi * 0.2)) {
      marker(kcal, `Stemmer dårlig med makroene (forventet rundt ${Math.round(forventet)} kcal)`)
      merknader.push('Energien og makroene henger ikke sammen. Kontroller tallene mot etiketten.')
    }
  }
}
