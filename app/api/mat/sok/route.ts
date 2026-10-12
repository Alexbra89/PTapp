// Fritekstsøk i Open Food Facts. Norske produkter først; er det få treff, søkes det bredere.
// Søk har strenge grenser hos OFF (ca. 10 per minutt), så appen søker bare når brukeren ber om det.
import { fraOpenFoodFacts, OFF_FELTER } from '@/lib/kosthold/openfoodfacts'
import { svar, innloggetBruker, innenforGrense, hentOff, OFF_BASE } from '@/lib/kosthold/server'

export const dynamic = 'force-dynamic'

const url = (q: string, norge: boolean) => {
  const p = new URLSearchParams({ search_terms: q, search_simple: '1', action: 'process', json: '1', page_size: '24', sort_by: 'unique_scans_n', fields: OFF_FELTER })
  if (norge) { p.set('tagtype_0', 'countries'); p.set('tag_contains_0', 'contains'); p.set('tag_0', 'norway') }
  return `${OFF_BASE}/cgi/search.pl?${p}`
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().replace(/\s+/g, ' ')
  if (q.length < 2 || q.length > 80) return svar({ feil: 'Skriv mellom 2 og 80 tegn' }, 400)

  const bruker = await innloggetBruker()
  if (!bruker) return svar({ feil: 'Ikke innlogget' }, 401)
  if (!innenforGrense(`sok:${bruker.id}`, 8)) return svar({ feil: 'For mange søk. Vent litt og prøv igjen.' }, 429)

  try {
    const tilUtkast = (data: any) => (Array.isArray(data?.products) ? data.products : [])
      .map((p: any) => fraOpenFoodFacts(p))
      .filter((u: ReturnType<typeof fraOpenFoodFacts>) => u.navn && u.naering.kcal !== null)
    let treff = tilUtkast((await hentOff(url(q.toLowerCase(), true), 3600_000)).data)
    if (treff.length < 3) {
      const brede = tilUtkast((await hentOff(url(q.toLowerCase(), false), 3600_000)).data)
      const sett = new Set(treff.map((t: any) => t.strekkode))
      treff = [...treff, ...brede.filter((t: any) => !sett.has(t.strekkode))]
    }
    return svar({ treff: treff.slice(0, 24) })
  } catch {
    return svar({ feil: 'Matvaredatabasen svarte ikke. Søk i dine egne matvarer, eller registrer manuelt.' }, 502)
  }
}
