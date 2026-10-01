import type { BrowserContext, Page, Request, Route } from '@playwright/test'

export const SUPABASE = 'http://127.0.0.1:54399'
export const TOKEN = 'e2e.eyJzdWIiOiJ1MSJ9.token'
export const BRUKER = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'alex@abpt.no', user_metadata: { full_name: 'Alex Bratland' }, app_metadata: {}, created_at: '2024-01-01T00:00:00Z' }
export const SESJON = { access_token: TOKEN, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: BRUKER }
export const PROFIL = { id: 'u1', navn: 'Alex Bratland', epost: 'alex@abpt.no', mal: 'bygge_muskler', vekt: 82, hoyde: 182, onsket_vekt: 78, fodselsar: 1989 }

const iso = (dager: number) => { const d = new Date(Date.now() - dager * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export const OKTER = [
  { id: 'o1', bruker_id: 'u1', dato: iso(0), tittel: 'Bryst & Rygg', type: 'styrke', varighet_min: 60, notater: '', fullfort: false, ovelser: [{ navn: 'Benkpress', sett: 4, reps: '8-10' }] },
  { id: 'o2', bruker_id: 'u1', dato: iso(2), tittel: 'Bein', type: 'styrke', varighet_min: 70, fullfort: true, ovelser: [{ navn: 'Knebøy', sett: 4, reps: '5' }] },
]
export const LOGGER = [
  { bruker_id: 'u1', dato: iso(2), ovelse_navn: 'Knebøy', muskelgruppe: 'bein', sett: [{ reps: 5, vekt: 140 }, { reps: 5, vekt: 140 }] },
  { bruker_id: 'u1', dato: iso(4), ovelse_navn: 'Benkpress', muskelgruppe: 'bryst', sett: [{ reps: 8, vekt: 100 }] },
]

export interface Kall { metode: string; sti: string; sok: string; body: string | null }
type Overstyring = (req: Request, url: URL) => Parameters<Route['fulfill']>[0] | undefined

// Logger inn testbrukeren (informasjonskapsel som middleware og nettleserklienten leser)
export async function loggInn(ctx: BrowserContext) {
  // url (ikke domain) gir en vanlig kapsel, slik nettleseren selv lager den – ellers får ikke utlogging slettet den
  await ctx.addCookies([{ name: 'sb-127-auth-token', value: encodeURIComponent(JSON.stringify(SESJON)), url: 'http://localhost:3001' }])
}

// Avlytter alle Supabase-kall fra nettleseren med fornuftige standardsvar.
// `overstyr` får første ordet; returner et svar for å overstyre, eller undefined.
export async function falskSupabase(ctx: BrowserContext, overstyr?: Overstyring) {
  const kall: Kall[] = []
  await ctx.route(`${SUPABASE}/**`, async (route, req) => {
    const url = new URL(req.url())
    kall.push({ metode: req.method(), sti: url.pathname, sok: decodeURIComponent(url.search), body: req.postData() })
    const egen = overstyr?.(req, url)
    if (egen) return route.fulfill(egen)

    const sti = url.pathname, m = req.method()
    const objekt = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    // Auth
    if (sti === '/auth/v1/user') return route.fulfill({ json: BRUKER })
    if (sti === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' })
    if (sti.startsWith('/auth/v1/')) return route.fulfill({ json: SESJON })
    // RPC
    if (sti === '/rest/v1/rpc/fullfor_okt') return route.fulfill({ json: 'ffffffff-0000-4000-8000-000000000001' })
    if (sti.startsWith('/rest/v1/rpc/')) return route.fulfill({ json: [] })
    // Skriving
    if (m !== 'GET' && m !== 'HEAD') return route.fulfill({ status: m === 'POST' ? 201 : 204, json: m === 'POST' ? { id: 'ny-1' } : undefined, body: m === 'POST' ? undefined : '' })
    // Lesing
    const tabell = sti.replace('/rest/v1/', '')
    const antall = { 'content-range': '0-0/2', 'access-control-expose-headers': 'content-range' }
    if (tabell === 'profiler') return route.fulfill({ json: objekt ? PROFIL : [PROFIL] })
    if (tabell === 'okter') return route.fulfill({ headers: antall, json: m === 'HEAD' ? [] : OKTER })
    if (tabell === 'treningslogger') {
      if (url.search.includes('ovelse_navn=in.')) return route.fulfill({ json: [] })
      return route.fulfill({ headers: antall, json: LOGGER })
    }
    return route.fulfill({ headers: antall, json: objekt ? null : [] })
  })
  return kall
}

// Samler sidefeil. Ignorerer next-pwa sin registreringsfeil når service workere er blokkert i testene.
export function fangFeil(page: Page) {
  const feil: string[] = []
  page.on('pageerror', e => { if (!/reading 'waiting'/.test(e.message)) feil.push(e.message) })
  page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) feil.push('CSP: ' + m.text()) })
  return feil
}
