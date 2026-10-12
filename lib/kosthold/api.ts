// Kall fra nettleseren til appens egne mat-API (app/api/mat/*). Skiller tydelig mellom
// «varen finnes ikke», «du er logget ut», «uten nett» og «serveren svarte ikke» – før kunne en
// utløpt innlogging (omdirigering til innloggingssiden) se ut som «fant ikke varen».

export type ApiSvar<T> =
  | { ok: true; data: T }
  | { ok: false; type: 'utlogget' | 'uten-nett' | 'grense' | 'ugyldig' | 'server'; melding: string }

export async function hentMatApi<T>(url: string): Promise<ApiSvar<T>> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, type: 'uten-nett', melding: 'Du er uten nett. Koble til og prøv igjen.' }
  }
  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store', redirect: 'manual', headers: { Accept: 'application/json' } })
  } catch {
    return { ok: false, type: 'server', melding: 'Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.' }
  }
  // 401 fra API-et, eller en omdirigering (til innlogging) som ikke ble fulgt
  if (res.status === 401 || res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
    return { ok: false, type: 'utlogget', melding: 'Du er logget ut. Logg inn på nytt for å slå opp varer.' }
  }
  const json = (res.headers.get('content-type') ?? '').includes('application/json')
  const data = json ? await res.json().catch(() => null) : null
  if (res.status === 429) return { ok: false, type: 'grense', melding: data?.feil ?? 'For mange oppslag. Vent litt og prøv igjen.' }
  if (res.status === 400) return { ok: false, type: 'ugyldig', melding: data?.feil ?? 'Ugyldig forespørsel.' }
  if (!res.ok || !json || data === null) return { ok: false, type: 'server', melding: data?.feil ?? 'Matvaredatabasen svarte ikke. Prøv igjen, eller registrer manuelt.' }
  return { ok: true, data: data as T }
}
