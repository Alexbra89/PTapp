// Slår opp en strekkode i Open Food Facts. Returnerer et utkast som brukeren kontrollerer
// før det lagres – ingenting lagres her. Finnes ikke varen, svarer vi «funnet: false», og appen
// tilbyr manuell registrering (med strekkoden ferdig utfylt).
import { gyldigGtin, normaliserStrekkode } from '@/lib/kosthold/naering'
import { fraOpenFoodFacts, OFF_FELTER } from '@/lib/kosthold/openfoodfacts'
import { svar, innloggetBruker, innenforGrense, hentOff, OFF_BASE } from '@/lib/kosthold/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ kode: string }> }) {
  const { kode: raa } = await params
  const kode = normaliserStrekkode(String(raa ?? ''))
  if (!gyldigGtin(kode)) return svar({ feil: 'Ugyldig strekkode' }, 400)

  const bruker = await innloggetBruker()
  if (!bruker) return svar({ feil: 'Ikke innlogget' }, 401)
  if (!innenforGrense(`kode:${bruker.id}`, 40)) return svar({ feil: 'For mange oppslag. Vent litt og prøv igjen.' }, 429)

  try {
    const { status, data } = await hentOff(`${OFF_BASE}/api/v2/product/${kode}.json?fields=${OFF_FELTER}`, 24 * 3600_000)
    if (status === 404 || !data || data.status === 0 || !data.product) return svar({ funnet: false, strekkode: kode })
    const utkast = fraOpenFoodFacts({ ...data.product, code: data.product.code ?? kode })
    return svar({ funnet: true, utkast: { ...utkast, strekkode: utkast.strekkode ?? kode } })
  } catch {
    return svar({ feil: 'Matvaredatabasen svarte ikke. Prøv igjen, eller registrer varen manuelt.' }, 502)
  }
}
