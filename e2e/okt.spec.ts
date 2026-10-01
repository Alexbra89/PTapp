import { test, expect, type Page } from '@playwright/test'
import { falskSupabase, loggInn, fangFeil, type Kall } from './hjelpere'

const OKT = '/treninger/okt?grupper=bryst&sted=gym'

async function fyllUt(page: Page) {
  await page.goto(OKT)
  await page.evaluate(() => localStorage.removeItem('okt_utkast'))
  await page.reload()
  await expect(page.locator('.okt-check').first()).toBeVisible()
  for (let i = await page.locator('.okt-toggle:not(.open)').count(); i > 0; i--) await page.locator('.okt-toggle:not(.open)').first().click()
  // Fyll inn vekt i alle sett, og huk av
  for (const felt of await page.locator('.okt-sett-row input[inputmode="decimal"]').all()) await felt.fill('50')
  while (await page.locator('.okt-check:not(.done)').count()) await page.locator('.okt-check:not(.done)').first().click()
}
const fullfor = async (page: Page) => { await page.locator('.okt-fullfor').click(); await page.locator('.okt-fullfor').click() }
const rpcKall = (kall: Kall[]) => kall.filter(k => k.sti === '/rest/v1/rpc/fullfor_okt')

test.beforeEach(async ({ context }) => { await loggInn(context) })

test('fullfør lagrer alt i ett kall og viser oppsummeringen', async ({ page, context }) => {
  const kall = await falskSupabase(context)
  const feil = fangFeil(page)
  await fyllUt(page)
  await fullfor(page)
  await expect(page.locator('.opp-sum')).toBeVisible()
  expect(rpcKall(kall)).toHaveLength(1)
  const body = JSON.parse(rpcKall(kall)[0].body!)
  expect(body.p_nokkel).toMatch(/^[0-9a-f-]{36}$/)
  expect(body.p_logger.length).toBeGreaterThan(0)
  expect(kall.some(k => k.metode === 'POST' && k.sti === '/rest/v1/treningslogger')).toBe(false) // ingen separate innsettinger
  expect(await page.evaluate(() => localStorage.getItem('okt_utkast'))).toBeNull()
  expect(feil).toEqual([])
})

test('serverfeil: utkastet beholdes, nytt forsøk bruker samme nøkkel', async ({ page, context }) => {
  let n = 0
  const kall = await falskSupabase(context, (_req, url) => url.pathname === '/rest/v1/rpc/fullfor_okt' && ++n === 1
    ? { status: 500, json: { code: '08006', message: 'connection failure' } } : undefined)
  await fyllUt(page)
  await fullfor(page)
  await expect(page.locator('.okt-lagrefeil')).toContainText('Ingenting er tapt')
  await expect(page.locator('.opp-sum')).toHaveCount(0)
  expect(await page.evaluate(() => !!localStorage.getItem('okt_utkast'))).toBe(true)
  await fullfor(page)
  await expect(page.locator('.opp-sum')).toBeVisible()
  const [a, b] = rpcKall(kall).map(k => JSON.parse(k.body!).p_nokkel)
  expect(a).toBe(b)
})

test('uten databasefunksjonen brukes reserveløsningen', async ({ page, context }) => {
  const kall = await falskSupabase(context, (_req, url) => url.pathname === '/rest/v1/rpc/fullfor_okt'
    ? { status: 404, json: { code: 'PGRST202', message: 'Could not find the function public.fullfor_okt' } } : undefined)
  await fyllUt(page)
  await fullfor(page)
  await expect(page.locator('.opp-sum')).toBeVisible()
  expect(kall.some(k => k.metode === 'POST' && k.sti === '/rest/v1/treningslogger')).toBe(true)
})

test('samme økt i to faner lagres bare én gang', async ({ page, context }) => {
  const kall = await falskSupabase(context)
  await fyllUt(page)
  const fane2 = await context.newPage()
  await fane2.goto(OKT)
  await expect(fane2.locator('.okt-gjenopprettet')).toBeVisible()
  await fullfor(page)
  await expect(page.locator('.opp-sum')).toBeVisible()
  await fullfor(fane2)
  await expect(fane2.locator('.opp-sum')).toBeVisible()
  expect(rpcKall(kall)).toHaveLength(1)
})

test('dobbeltklikk på bekreftelsen sender bare én gang', async ({ page, context }) => {
  const kall = await falskSupabase(context, (_req, url) => url.pathname === '/rest/v1/rpc/fullfor_okt' ? { json: 'ffffffff-0000-4000-8000-000000000002', headers: {} } : undefined)
  await fyllUt(page)
  await page.locator('.okt-fullfor').click()
  await page.locator('.okt-fullfor').dblclick()
  await expect(page.locator('.opp-sum')).toBeVisible()
  expect(rpcKall(kall)).toHaveLength(1)
})

test('pågående økt gjenopprettes etter omlasting, men ikke for en annen bruker', async ({ page, context }) => {
  await falskSupabase(context)
  await fyllUt(page)
  await page.reload()
  await expect(page.locator('.okt-gjenopprettet')).toBeVisible()
  await page.evaluate(() => { const u = JSON.parse(localStorage.getItem('okt_utkast')!); u.brukerId = 'en-annen'; localStorage.setItem('okt_utkast', JSON.stringify(u)) })
  await page.reload()
  await expect(page.locator('.okt-check').first()).toBeVisible()
  await expect(page.locator('.okt-gjenopprettet')).toHaveCount(0)
})
