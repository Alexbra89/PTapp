// Personlige mål for energi og makronæringsstoffer.
//
// Metode (dokumentert og konfigurerbar i KONFIG under):
// • Hvileforbrenning: Mifflin–St Jeor (Mifflin mfl., Am J Clin Nutr 1990):
//     10 × vekt(kg) + 6,25 × høyde(cm) − 5 × alder + 5 (mann) / − 161 (kvinne)
// • Vedlikehold = hvileforbrenning × aktivitetsfaktor (PAL). Faktoren dekker ALL aktivitet,
//   også treningen – treningsøkter i appen legges derfor ikke til en gang til.
// • Endring i vekt: ~7 700 kcal per kg kroppsvekt, fordelt på 7 dager. Underskuddet begrenses
//   til en andel av vedlikehold og et nedre gulv; overskuddet til en fast øvre grense.
// • Protein: g per kg kroppsvekt etter mål (ISSN 2017: 1,4–2,0 g/kg; Morton mfl. 2018: ~1,6 g/kg,
//   opptil 2,2 g/kg). Ved KMI ≥ 30 brukes vekten ved KMI 25 som referanse, så målet ikke blir urimelig høyt.
// • Fett: andel av energien (NNR 2023: 25–40 E%), med et minimum per kg.
// • Karbohydrater: resten av energien.
//
// Dette er estimater for friske voksne, ikke medisinske råd. Alle mål kan overstyres.

export type Grunnlag = 'mann' | 'kvinne'
export type Aktivitetsniva = 'stillesittende' | 'lett' | 'moderat' | 'hoy' | 'svart_hoy'
export type Retning = 'ned' | 'vedlikehold' | 'opp'

export const AKTIVITET: Record<Aktivitetsniva, { faktor: number; navn: string; tekst: string }> = {
  stillesittende: { faktor: 1.2,   navn: 'Stillesittende', tekst: 'Kontorjobb, lite gåing, ingen trening' },
  lett:           { faktor: 1.375, navn: 'Lett aktiv',     tekst: 'Trening 1–3 dager i uka eller mye gåing' },
  moderat:        { faktor: 1.55,  navn: 'Moderat aktiv',  tekst: 'Trening 3–5 dager i uka' },
  hoy:            { faktor: 1.725, navn: 'Svært aktiv',    tekst: 'Hard trening 6–7 dager i uka' },
  svart_hoy:      { faktor: 1.9,   navn: 'Ekstremt aktiv', tekst: 'Fysisk jobb og hard trening, eller to økter om dagen' },
}

export const RETNING: Record<Retning, { navn: string; tekst: string }> = {
  ned:         { navn: 'Vektnedgang', tekst: 'Underskudd, bevar muskelmassen' },
  vedlikehold: { navn: 'Vedlikehold', tekst: 'Stabil vekt' },
  opp:         { navn: 'Muskelvekst', tekst: 'Lite overskudd, lav fettøkning' },
}

export const KONFIG = {
  kcalPerKg: 7700,
  proteinPerKg: { ned: 2.0, vedlikehold: 1.6, opp: 1.8 } as Record<Retning, number>,
  fettAndel:    { ned: 0.30, vedlikehold: 0.30, opp: 0.27 } as Record<Retning, number>,
  minFettPerKg: 0.6,
  minFettAndel: 0.20,
  standardTempo: { ned: 0.5, vedlikehold: 0, opp: 0.25 } as Record<Retning, number>,
  maksTempo:     { ned: 1.0, vedlikehold: 0, opp: 0.5 } as Record<Retning, number>,
  maksUnderskuddAndel: 0.25,
  maksOverskudd: 500,
  minKcal: { mann: 1500, kvinne: 1200 } as Record<Grunnlag, number>,
}

/** Profilens mål (fra treningsdelen) oversatt til retning for kostholdet. */
export function retningFraProfil(mal?: string | null): Retning {
  if (mal === 'ned_i_vekt') return 'ned'
  if (mal === 'bygge_muskler') return 'opp'
  return 'vedlikehold'
}

export interface MalInput {
  vekt: number        // kg
  hoyde: number       // cm
  alder: number       // år
  grunnlag: Grunnlag
  aktivitet: Aktivitetsniva
  retning: Retning
  tempo?: number      // kg per uke (ned/opp)
}

export interface Makromal { kcal: number; protein: number; karbohydrater: number; fett: number }

export interface Malresultat extends Makromal {
  bmr: number
  vedlikehold: number
  tempo: number
  proteinReferansevekt: number
  merknader: string[]
}

export const GRENSER_INPUT = { vekt: [30, 300], hoyde: [120, 230], alder: [15, 100] } as const

export function validerInput(i: Partial<MalInput>): string[] {
  const feil: string[] = []
  const iGrense = (v: unknown, [a, b]: readonly [number, number]) => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b
  if (!iGrense(i.vekt, GRENSER_INPUT.vekt)) feil.push('Vekt må være mellom 30 og 300 kg.')
  if (!iGrense(i.hoyde, GRENSER_INPUT.hoyde)) feil.push('Høyde må være mellom 120 og 230 cm.')
  if (!iGrense(i.alder, GRENSER_INPUT.alder)) feil.push('Alder må være mellom 15 og 100 år.')
  if (i.grunnlag !== 'mann' && i.grunnlag !== 'kvinne') feil.push('Velg beregningsgrunnlag.')
  if (!i.aktivitet || !(i.aktivitet in AKTIVITET)) feil.push('Velg aktivitetsnivå.')
  if (!i.retning || !(i.retning in RETNING)) feil.push('Velg mål.')
  return feil
}

export function bmrMifflin({ vekt, hoyde, alder, grunnlag }: Pick<MalInput, 'vekt' | 'hoyde' | 'alder' | 'grunnlag'>) {
  return 10 * vekt + 6.25 * hoyde - 5 * alder + (grunnlag === 'mann' ? 5 : -161)
}

export const makroKcal = (m: Pick<Makromal, 'protein' | 'karbohydrater' | 'fett'>) => m.protein * 4 + m.karbohydrater * 4 + m.fett * 9

/** Avvik mellom energimålet og makroene, innenfor normal avrunding (hele gram ⇒ maks ±8,5 kcal). */
export const erKonsistent = (m: Makromal, toleranse = 10) => Math.abs(makroKcal(m) - m.kcal) <= toleranse

/**
 * Fordeler et energimål på makroer. Protein holdes fast (så langt det går), fett settes som
 * andel med et minimum, karbohydrater fyller resten. Karbo avrundes sist, så summen alltid treffer.
 */
export function fordelMakro(kcal: number, protein: number, fettAndel: number, minFett = 0): Makromal {
  let p = Math.max(0, Math.round(protein))
  let f = Math.max(Math.round(minFett), Math.round((kcal * fettAndel) / 9))
  let rest = kcal - 4 * p - 9 * f
  if (rest < 0) {
    // For lite energi til både protein og ønsket fett: senk fettet mot minimum først, deretter protein
    f = Math.max(Math.round(minFett), Math.round((kcal * KONFIG.minFettAndel) / 9))
    rest = kcal - 4 * p - 9 * f
    if (rest < 0) { p = Math.max(0, Math.floor((kcal - 9 * f) / 4)); rest = kcal - 4 * p - 9 * f }
    if (rest < 0) { f = Math.max(0, Math.floor(kcal / 9)); p = 0; rest = kcal - 9 * f }
  }
  const k = Math.max(0, Math.round(rest / 4))
  return { kcal: Math.round(kcal), protein: p, karbohydrater: k, fett: f }
}

export function beregnMal(i: MalInput): Malresultat {
  const merknader: string[] = []
  const bmr = bmrMifflin(i)
  const vedlikehold = bmr * AKTIVITET[i.aktivitet].faktor

  let tempo = i.retning === 'vedlikehold' ? 0 : (i.tempo ?? KONFIG.standardTempo[i.retning])
  if (tempo > KONFIG.maksTempo[i.retning]) { tempo = KONFIG.maksTempo[i.retning]; merknader.push(`Tempoet er begrenset til ${tempo.toLocaleString('nb-NO')} kg per uke.`) }
  if (tempo < 0) tempo = 0

  let justering = (tempo * KONFIG.kcalPerKg) / 7
  if (i.retning === 'ned') {
    const maks = vedlikehold * KONFIG.maksUnderskuddAndel
    if (justering > maks) { justering = maks; merknader.push('Underskuddet er begrenset til 25 % av vedlikeholdsbehovet.') }
    justering = -justering
  } else if (i.retning === 'opp') {
    if (justering > KONFIG.maksOverskudd) { justering = KONFIG.maksOverskudd; merknader.push(`Overskuddet er begrenset til ${KONFIG.maksOverskudd} kcal per dag.`) }
  }

  let kcal = vedlikehold + justering
  const gulv = KONFIG.minKcal[i.grunnlag]
  if (kcal < gulv) {
    kcal = Math.min(gulv, vedlikehold)
    merknader.push(`Energimålet er satt til minst ${Math.round(kcal).toLocaleString('nb-NO')} kcal. Et lavere inntak bør skje i samråd med helsepersonell.`)
  }
  kcal = Math.round(kcal / 10) * 10

  const kmi = i.vekt / (i.hoyde / 100) ** 2
  const referansevekt = kmi >= 30 ? 25 * (i.hoyde / 100) ** 2 : i.vekt
  if (kmi >= 30) merknader.push('Proteinmålet er regnet ut fra vekten ved KMI 25, ikke nåværende vekt.')
  const protein = KONFIG.proteinPerKg[i.retning] * referansevekt
  const makro = fordelMakro(kcal, protein, KONFIG.fettAndel[i.retning], KONFIG.minFettPerKg * referansevekt)
  if (makro.protein < Math.round(protein)) merknader.push('Energimålet er for lavt til hele proteinmålet.')
  if (i.alder < 18) merknader.push('Formelen er laget for voksne. For ungdom under 18 bør målene avklares med helsepersonell.')

  return {
    ...makro, bmr: Math.round(bmr), vedlikehold: Math.round(vedlikehold), tempo,
    proteinReferansevekt: Math.round(referansevekt * 10) / 10, merknader,
  }
}

/** Alder ut fra fødselsår (kan avvike ett år før bursdagen). */
export const alderFraFodselsar = (ar: number, na = new Date()) => na.getFullYear() - ar
