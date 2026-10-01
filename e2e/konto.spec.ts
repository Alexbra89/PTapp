import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { falskSupabase, loggInn } from './hjelpere'

test.beforeEach(async ({ context }) => { await loggInn(context) })

test('last ned dataene mine: én fil med bare egne data', async ({ page, context }) => {
  const kall = await falskSupabase(context)
  await page.goto('/profiler')
  const [fil] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Last ned' }).click()])
  expect(fil.suggestedFilename()).toMatch(/^ab-pt-mine-data-\d{4}-\d{2}-\d{2}\.json$/)
  const innhold = JSON.parse(readFileSync(await fil.path(), 'utf8'))
  expect(Object.keys(innhold)).toEqual(expect.arrayContaining(['konto', 'profil', 'okter', 'treningslogger', 'pr_rekorder', 'vektlogg']))
  // Alle tabellspørringer filtreres på egen id (delt innsyn skal ikke dra med andres data)
  const tabellkall = kall.filter(k => k.metode === 'GET' && /\/rest\/v1\/(okter|treningslogger|pr_rekorder|vektlogg|favoritt_ovelser|treningsprogrammer|bruker_ovelser)$/.test(k.sti) && !k.sok.includes('count'))
  for (const k of tabellkall.filter(k => k.sok.startsWith('?select=*'))) expect(k.sok, k.sti).toContain('bruker_id=eq.u1')
})

test('slett konto krever bekreftelse, sletter og logger ut', async ({ page, context }) => {
  const kall = await falskSupabase(context, (_r, url) => url.pathname === '/rest/v1/rpc/slett_min_konto' ? { status: 204, body: '' } : undefined)
  await page.goto('/profiler')
  await page.evaluate(() => { localStorage.setItem('okt_utkast', '{}'); localStorage.setItem('vektlogg_u1', '[]') })
  await page.getByRole('button', { name: 'Slett', exact: true }).click()
  const knapp = page.getByRole('button', { name: 'Slett for godt' })
  await expect(knapp).toBeDisabled()
  await page.getByLabel('Skriv SLETT').fill('slett')
  await expect(knapp).toBeEnabled()
  await knapp.click()
  await page.waitForURL('**/login?slettet=1')
  await expect(page.getByText('Kontoen og alle dataene dine er slettet.')).toBeVisible()
  expect(kall.filter(k => k.sti === '/rest/v1/rpc/slett_min_konto')).toHaveLength(1)
  expect(await page.evaluate(() => [localStorage.getItem('okt_utkast'), localStorage.getItem('vektlogg_u1')])).toEqual([null, null])
})

test('slett konto uten databasefunksjon: tydelig feil, ingenting slettes', async ({ page, context }) => {
  await falskSupabase(context, (_r, url) => url.pathname === '/rest/v1/rpc/slett_min_konto'
    ? { status: 404, json: { code: 'PGRST202', message: 'Could not find the function public.slett_min_konto' } } : undefined)
  await page.goto('/profiler')
  await page.getByRole('button', { name: 'Slett', exact: true }).click()
  await page.getByLabel('Skriv SLETT').fill('SLETT')
  await page.getByRole('button', { name: 'Slett for godt' }).click()
  await expect(page.locator('.login-error-text')).toContainText('ikke satt opp')
  expect(page.url()).toContain('/profiler')
})

test('personvernerklæringen er åpen og lenket fra registrering', async ({ page, context }) => {
  await context.clearCookies(); await falskSupabase(context)
  await page.goto('/signup')
  await page.getByRole('link', { name: 'personvernerklæringen' }).click()
  await expect(page.getByRole('heading', { name: /Personvern/ })).toBeVisible()
  await expect(page.getByText('Dine rettigheter')).toBeVisible()
})
