import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Leser den genererte service workeren (bygget av webServer før testene) og sjekker reglene
// som beskytter brukerne og oppstartstiden. De ble brutt én gang ved en feil i konfigurasjonen.
const sw = readFileSync('public/sw.js', 'utf8')
const ruter = sw.split('registerRoute(').slice(1)
const regel = (cacheName: string) => ruter.filter(r => r.includes(`cacheName:"${cacheName}"`))

test('svar fra andre domener (Supabase) lagres aldri', () => {
  const r = regel('cross-origin')
  expect(r).toHaveLength(1)
  expect(r[0]).toContain('NetworkOnly')
})

test('sidenavigasjon har kort tidsgrense og fanger bare navigasjon', () => {
  const r = regel('pages')
  expect(r).toHaveLength(1)
  expect(r[0]).toMatch(/networkTimeoutSeconds:1\b/)
  expect(r[0]).toContain('navigate') // ellers fanger regelen skript, bilder og skrifter
  expect(r[0]).not.toContain('NetworkOnly')
})

test('appen starter rett på oversikten uten omdirigering', async ({ request }) => {
  const manifest = await (await request.get('/manifest.json')).json()
  expect(manifest.start_url).toBe('/dashboard')
})

test('skriftene leveres av appen selv – ingen forespørsler til Google', async ({ page }) => {
  const eksterne: string[] = []
  page.on('request', r => { if (/googleapis|gstatic/.test(r.url())) eksterne.push(r.url()) })
  const fonter: string[] = []
  page.on('response', r => { if (r.url().endsWith('.woff2')) fonter.push(`${r.status()} ${new URL(r.url()).pathname}`) })
  await page.goto('/login')
  await page.evaluate(() => document.fonts.ready)
  expect(eksterne).toEqual([])
  expect(fonter.length).toBeGreaterThan(0)
  expect(fonter.every(f => f.startsWith('200'))).toBe(true)
  expect(await page.evaluate(() => document.fonts.check("italic 20px 'Instrument Serif'"))).toBe(true)
})

// iOS viser hvit skjerm ved oppstart fra hjemskjermen hvis ingen apple-touch-startup-image passer
// skjermen. Hvert bilde må finnes og ha nøyaktig skjermens pikselstørrelse.
test('oppstartsbilder for iOS finnes for vanlige iPhoner og har riktig størrelse', async ({ page, request }) => {
  await page.goto('/login')
  const lenker = await page.locator('link[rel="apple-touch-startup-image"]').evaluateAll(l => l.map(e => ({ href: e.getAttribute('href')!, media: e.getAttribute('media')! })))
  expect(lenker.length).toBeGreaterThanOrEqual(13)
  for (const skjerm of ['393px', '402px', '430px', '440px', '390px', '375px']) {
    expect(lenker.some(l => l.media.includes(`device-width: ${skjerm}`)), skjerm).toBe(true)
  }
  for (const { href, media } of lenker) {
    const svar = await request.get(href)
    expect(svar.status(), href).toBe(200)
    const png = await svar.body()
    const [b, h] = [png.readUInt32BE(16), png.readUInt32BE(20)]
    const m = media.match(/device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)/)!
    expect([b, h], href).toEqual([Number(m[1]) * Number(m[3]), Number(m[2]) * Number(m[3])])
  }
})

test('oppstartsbildene lastes ikke ned av service workeren ved installering', () => {
  expect(sw).not.toContain('/splash/')
})
