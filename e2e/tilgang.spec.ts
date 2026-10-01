import { test, expect } from '@playwright/test'
import { SESJON } from './hjelpere'

// Middleware: hvem slipper inn hvor. Kjøres som rene HTTP-forespørsler (ingen nettleser).
const gyldig = `sb-127-auth-token=${encodeURIComponent(JSON.stringify(SESJON))}`
const forfalsket = `sb-127-auth-token=${encodeURIComponent(JSON.stringify({ ...SESJON, access_token: 'forfalsket.eyJzdWIiOiJ1MiJ9.sig' }))}`
const BESKYTTET = ['/dashboard', '/treninger', '/treninger/okt', '/ovelser', '/kalender', '/statistikk', '/profiler', '/deling', '/program', '/tidtaking', '/oppvarming', '/utfordringer']
const APNE = ['/login', '/signup', '/glemt-passord', '/nytt-passord', '/bekreftet', '/personvern']

test('beskyttede sider sender uinnloggede og forfalskede tokens til innlogging', async ({ request }) => {
  for (const side of BESKYTTET) {
    for (const cookie of [undefined, forfalsket]) {
      const r = await request.get(side, { maxRedirects: 0, headers: cookie ? { cookie } : {} })
      expect(r.status(), `${side} ${cookie ? 'forfalsket' : 'uinnlogget'}`).toBe(307)
      expect(r.headers()['location']).toContain('/login')
    }
    const inne = await request.get(side, { maxRedirects: 0, headers: { cookie: gyldig } })
    expect(inne.status(), `${side} innlogget`).toBe(200)
  }
})

test('åpne sider er tilgjengelige uten innlogging', async ({ request }) => {
  for (const side of APNE) expect((await request.get(side, { maxRedirects: 0 })).status(), side).toBe(200)
})

test('innloggede sendes bort fra innlogging, men ikke fra nytt passord og bekreftelse', async ({ request }) => {
  for (const side of ['/login', '/signup', '/glemt-passord']) {
    const r = await request.get(side, { maxRedirects: 0, headers: { cookie: gyldig } })
    expect(r.status(), side).toBe(307)
  }
  for (const side of ['/nytt-passord', '/bekreftet', '/personvern']) {
    expect((await request.get(side, { maxRedirects: 0, headers: { cookie: gyldig } })).status(), side).toBe(200)
  }
})

test('sikkerhetsheadere og CSP med ny nonce per forespørsel', async ({ request }) => {
  const a = await request.get('/login'), b = await request.get('/login')
  const h = a.headers()
  expect(h['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/)
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(h['content-security-policy']).toContain("object-src 'none'")
  expect(h['content-security-policy']).not.toBe(b.headers()['content-security-policy'])
  expect(h['x-frame-options']).toBe('DENY')
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(h['strict-transport-security']).toContain('max-age=')
  expect(h['x-powered-by']).toBeUndefined()
  // upgrade-insecure-requests bare over HTTPS
  expect(h['content-security-policy']).not.toContain('upgrade-insecure-requests')
  const https = await request.get('/login', { headers: { 'x-forwarded-proto': 'https' } })
  expect(https.headers()['content-security-policy']).toContain('upgrade-insecure-requests')
  // Nonce i headeren skal stå på sidens skript
  const nonce = h['content-security-policy'].match(/'nonce-([^']+)'/)![1]
  expect(await a.text()).toContain(`nonce="${nonce}"`)
})

test('bildeoptimering er av (ingen åpen /_next/image)', async ({ request }) => {
  expect((await request.get('/_next/image?url=%2Ficon-512.png&w=64&q=75')).status()).toBe(404)
})
