// Oversetter produkter fra Open Food Facts (OFF) til et matvareutkast.
// Ren logikk – nettverkskallene ligger i API-rutene (app/api/mat/*).
//
// OFF lagrer næringsverdier i feltene «<stoff>_100g». For drikker betyr det i praksis per 100 ml
// (OFF bruker samme feltnavn). Enheten avgjøres derfor ut fra produktets mengdeenhet.
// Verdier som mangler i OFF blir null – de fylles aldri inn med 0 eller gjetninger.

import { type Basis, type NaeringDelvis, KJ_PER_KCAL, normaliserStrekkode } from './naering'

export interface Matvareutkast {
  navn: string
  merke: string | null
  strekkode: string | null
  kilde: 'openfoodfacts' | 'etikett' | 'manuell'
  basis: Basis
  naering: NaeringDelvis
  kj: number | null
  porsjon_navn: string | null
  porsjon_mengde: number | null
  porsjon_enhet: 'g' | 'ml' | null
  /** Felter som mangler i kilden og bør fylles inn eller bekreftes av brukeren. */
  mangler: string[]
  /** Fritekst om kvaliteten på dataene. */
  merknader: string[]
}

export const OFF_FELTER = [
  'code', 'product_name', 'product_name_nb', 'product_name_no', 'product_name_en', 'generic_name', 'brands',
  'quantity', 'product_quantity', 'product_quantity_unit', 'serving_size', 'serving_quantity', 'serving_quantity_unit',
  'nutriments', 'nutrition_data_per', 'no_nutrition_data',
].join(',')

type OffProdukt = Record<string, any>

const tall = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null
}

/** «30 g», «250 ml», «1 skive (35 g)», «33 cl» → mengde og enhet. */
export function lesMengde(s: unknown): { mengde: number; enhet: 'g' | 'ml' } | null {
  if (typeof s !== 'string') return null
  const m = s.toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|gram|mg|ml|cl|dl|l|liter)\b/)
  if (!m) return null
  const v = Number(m[1])
  if (!Number.isFinite(v) || v <= 0) return null
  switch (m[2]) {
    case 'kg': return { mengde: v * 1000, enhet: 'g' }
    case 'mg': return { mengde: v / 1000, enhet: 'g' }
    case 'g': case 'gr': case 'gram': return { mengde: v, enhet: 'g' }
    case 'ml': return { mengde: v, enhet: 'ml' }
    case 'cl': return { mengde: v * 10, enhet: 'ml' }
    case 'dl': return { mengde: v * 100, enhet: 'ml' }
    default: return { mengde: v * 1000, enhet: 'ml' } // l / liter
  }
}

/** Avgjør om produktet måles i volum (drikke, olje …) ut fra mengdeenheten. */
export function offBasis(p: OffProdukt): Basis {
  const enhet = String(p.product_quantity_unit ?? '').toLowerCase()
  if (enhet === 'ml' || enhet === 'cl' || enhet === 'l') return '100ml'
  if (enhet === 'g' || enhet === 'kg') return '100g'
  return lesMengde(p.quantity)?.enhet === 'ml' ? '100ml' : '100g'
}

export function offNavn(p: OffProdukt): string {
  const kandidater = [p.product_name_nb, p.product_name_no, p.product_name, p.product_name_en, p.generic_name]
  return (kandidater.find(k => typeof k === 'string' && k.trim()) ?? '').trim().slice(0, 200)
}

export function fraOpenFoodFacts(p: OffProdukt): Matvareutkast {
  const n = (p.nutriments ?? {}) as Record<string, unknown>
  const basis = offBasis(p)
  const merknader: string[] = []

  let kcal = tall(n['energy-kcal_100g'])
  const kj = tall(n['energy-kj_100g']) ?? (n['energy_100g'] != null && String(n['energy_unit'] ?? 'kJ').toLowerCase() === 'kj' ? tall(n['energy_100g']) : null)
  if (kcal === null && kj !== null) { kcal = kj / KJ_PER_KCAL; merknader.push('Energi i kcal er regnet ut fra kJ.') }

  let salt = tall(n['salt_100g'])
  if (salt === null && tall(n['sodium_100g']) !== null) { salt = tall(n['sodium_100g'])! * 2.5; merknader.push('Salt er regnet ut fra natrium (× 2,5).') }

  const naering: NaeringDelvis = {
    kcal,
    protein: tall(n['proteins_100g']),
    karbohydrater: tall(n['carbohydrates_100g']),
    fett: tall(n['fat_100g']),
    sukker: tall(n['sugars_100g']),
    mettet_fett: tall(n['saturated-fat_100g']),
    fiber: tall(n['fiber_100g']),
    salt,
  }

  const porsjon = lesMengde(p.serving_size) ?? (tall(p.serving_quantity) ? { mengde: tall(p.serving_quantity)!, enhet: (String(p.serving_quantity_unit ?? 'g').toLowerCase() === 'ml' ? 'ml' : 'g') as 'g' | 'ml' } : null)

  const mangler = (['kcal', 'protein', 'karbohydrater', 'fett'] as const).filter(k => naering[k] === null)
  if (p.no_nutrition_data === 'on' || mangler.length === 4) merknader.push('Open Food Facts har ingen næringsdeklarasjon for denne varen.')
  if (basis === '100ml') merknader.push('Verdiene gjelder per 100 ml.')

  const kode = typeof p.code === 'string' && /^\d{8,14}$/.test(p.code) ? normaliserStrekkode(p.code) : null
  return {
    navn: offNavn(p),
    merke: typeof p.brands === 'string' && p.brands.trim() ? p.brands.split(',')[0].trim().slice(0, 200) : null,
    strekkode: kode,
    kilde: 'openfoodfacts',
    basis,
    naering,
    kj,
    porsjon_navn: porsjon && typeof p.serving_size === 'string' ? p.serving_size.trim().slice(0, 60) : null,
    porsjon_mengde: porsjon?.mengde ?? null,
    porsjon_enhet: porsjon?.enhet ?? null,
    mangler: [...mangler, ...(offNavn(p) ? [] : ['navn'])],
    merknader,
  }
}
