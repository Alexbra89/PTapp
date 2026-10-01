import { test, expect } from '@playwright/test'
import { falskSupabase, loggInn, fangFeil } from './hjelpere'

const SIDER: [string, RegExp][] = [
  ['/dashboard', /Alex/], ['/treninger', /økten/i], ['/ovelser', /Biblioteket/], ['/ovelser/benkpress', /Benkpress/],
  ['/kalender', /Kalenderen/], ['/utfordringer', /Troféskapet/], ['/statistikk', /Fremgang/], ['/tidtaking', /Tidtaking/],
  ['/oppvarming', /Oppvarming/], ['/program', /Programmet/], ['/deling', /Deling/], ['/profiler', /Profilen/],
]

test('alle sider åpnes uten feil eller CSP-brudd', async ({ page, context }) => {
  await loggInn(context); await falskSupabase(context)
  const feil = fangFeil(page)
  for (const [side, tittel] of SIDER) {
    await page.goto(side)
    await expect(page.locator('h1').first(), side).toHaveText(tittel)
  }
  for (const side of ['/login', '/signup', '/glemt-passord', '/personvern']) { await context.clearCookies(); await page.goto(side) }
  expect(feil).toEqual([])
})

test('statistikk tåler logger uten dato, øvelsesnavn eller sett', async ({ page, context }) => {
  await loggInn(context)
  await falskSupabase(context, (_r, url) => url.pathname === '/rest/v1/treningslogger'
    ? { json: [{ sett: [{ reps: 5, vekt: 100 }] }, { dato: null, ovelse_navn: null, sett: null }, { dato: 'tull', ovelse_navn: 'Benkpress', sett: {} }] } : undefined)
  const feil = fangFeil(page)
  await page.goto('/statistikk')
  await expect(page.locator('h1').first()).toHaveText(/Fremgang/)
  await page.goto('/utfordringer'); await page.goto('/dashboard')
  expect(feil).toEqual([])
})

test('CSP stopper injisert kode', async ({ page, context }) => {
  await loggInn(context); await falskSupabase(context)
  const brudd: string[] = []
  page.on('console', m => { if (/Content Security Policy/.test(m.text())) brudd.push(m.text()) })
  await page.goto('/dashboard')
  await page.evaluate(() => { (window as any).__xss = 0; const d = document.createElement('div'); d.innerHTML = '<img src="x" onerror="window.__xss=1">'; document.body.appendChild(d) })
  await expect.poll(() => brudd.length).toBeGreaterThan(0) // nettleseren meldte blokkeringen
  expect(await page.evaluate(() => (window as any).__xss)).toBe(0) // og koden kjørte ikke
})

test('øvelsesark og «Slik gjør du» åpnes og lukkes', async ({ page, context }) => {
  await loggInn(context); await falskSupabase(context)
  await page.goto('/ovelser')
  await page.locator('.bib-kort').first().click()
  await expect(page.locator('.bib-ark')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.bib-ark')).toHaveCount(0)
  await page.goto('/treninger/okt?grupper=bein&sted=gym')
  await page.locator('.okt-slik-btn').first().click()
  await expect(page.getByRole('dialog', { name: /Slik gjør du/ })).toContainText('Steg for')
})
