// Felles for API-rutene som slår opp i Open Food Facts (OFF). Kjører bare på serveren.
//
// • Bare innloggede brukere (rutene er ikke en åpen mellomtjener).
// • OFF krever en beskrivende User-Agent og har grenser (ca. 100 produktoppslag og 10 søk per minutt
//   per IP). Svarene er offentlige produktdata og bufres derfor i minnet på serveren – aldri
//   sammen med noe som identifiserer brukeren. Svaret til nettleseren merkes «private, no-store».
// • Hver bruker begrenses i tillegg, så én bruker ikke kan bruke opp kvoten for alle.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const OFF_BASE = process.env.OFF_BASE_URL || 'https://world.openfoodfacts.org'
const USER_AGENT = 'AB-PT/1.0 (privat treningsapp; matoppslag)'

export function svar(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function innloggetBruker() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Enkel glidende grense per bruker og type (per serverinstans)
const kall = new Map<string, number[]>()
export function innenforGrense(nokkel: string, maksPerMinutt: number): boolean {
  const na = Date.now()
  const liste = (kall.get(nokkel) ?? []).filter(t => na - t < 60_000)
  if (liste.length >= maksPerMinutt) { kall.set(nokkel, liste); return false }
  liste.push(na)
  kall.set(nokkel, liste)
  if (kall.size > 5000) kall.clear()
  return true
}

const buffer = new Map<string, { tid: number; data: unknown }>()
export async function hentOff(url: string, levetidMs: number): Promise<{ status: number; data: any }> {
  const treff = buffer.get(url)
  if (treff && Date.now() - treff.tid < levetidMs) return { status: 200, data: treff.data }
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (res.status === 404) return { status: 404, data: null }
  if (!res.ok) throw new Error(`OFF svarte ${res.status}`)
  const data = await res.json()
  if (buffer.size > 1000) buffer.delete(buffer.keys().next().value!)
  buffer.set(url, { tid: Date.now(), data })
  return { status: 200, data }
}
