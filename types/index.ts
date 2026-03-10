export type Muskelgruppe = 'bryst' | 'rygg' | 'bein' | 'skuldre' | 'armer' | 'mage' | 'cardio'
export type Utstyr = 'hjemme' | 'senter' | 'begge'
export type OppvarmingType = 'boksesekk' | 'romaskin' | 'elipsemaskin' | 'tredemølle'
export type Mal = 'ned_i_vekt' | 'bygge_muskler' | 'vedlikehold'

export interface Ovelse {
  id: string
  navn: string
  muskelgruppe: Muskelgruppe
  utstyr: Utstyr
  beskrivelse: string
  videoUrl?: string
  bildeUrl?: string
  vanskelighetsgrad?: 'nybegynner' | 'middels' | 'avansert'
}

export interface TreningsSett {
  reps: number
  vekt: number
  notat?: string
  fullfort?: boolean
}

export interface TreningsLogg {
  id: string
  bruker_id: string
  dato: string
  ovelse_id: string
  ovelse_navn: string
  muskelgruppe: Muskelgruppe
  sett: TreningsSett[]
  oppvarming?: OppvarmingType[]
  kommentar?: string
  opprettet: string
}

export interface BrukerProfil {
  id: string
  navn: string
  epost: string
  vekt: number
  hoyde: number
  fodselsar: number
  mal: Mal
  er_samboer: boolean
  can_share_with: string[]
  opprettet: string
}

export interface UkePlan {
  id: string
  bruker_id: string
  ukedag: 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0 = søndag
  ovelser: string[]  // Array av øvelse IDs
  opprettet: string
}

export interface DelingsLenke {
  id: string
  bruker_id: string
  delt_med_id: string
  tilgang: 'les' | 'skriv'
  aktiv: boolean
  opprettet: string
}

// For beregninger
export interface Anbefaling {
  dagligKalorier: number
  proteinPerKg: number
  anbefalteOvelser: Ovelse[]
  ukentligVolum: number
  forklaring: string
}