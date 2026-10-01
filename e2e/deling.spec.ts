import { test, expect } from '@playwright/test'
import { falskSupabase, loggInn } from './hjelpere'

const INGRID = 'bbbbbbbb-0000-4000-8000-000000000002', MARTIN = 'cccccccc-0000-4000-8000-000000000003'
const OVERSIKT = [
  { id: INGRID, navn: 'Ingrid', jeg_deler: true, deler_med_meg: false },
  { id: MARTIN, navn: 'Martin', jeg_deler: false, deler_med_meg: true },
]

test.beforeEach(async ({ context }) => { await loggInn(context) })

test('delingssiden: slå av, legg til med e-post, ukjent e-post gir invitasjon', async ({ page, context }) => {
  let mine: string[] = [INGRID]
  const kall = await falskSupabase(context, (req, url) => {
    if (url.pathname === '/rest/v1/rpc/deling_oversikt') return { json: OVERSIKT }
    if (url.pathname === '/rest/v1/rpc/finn_bruker_for_deling') return { json: JSON.parse(req.postData()!).p_epost === 'sofie@x.no' ? [{ id: 'dddd', navn: 'Sofie' }] : [] }
    if (url.pathname === '/rest/v1/profiler' && url.search.includes('can_share_with')) return { json: { can_share_with: mine } }
    if (url.pathname === '/rest/v1/profiler' && req.method() === 'PATCH') { mine = JSON.parse(req.postData()!).can_share_with; return { status: 204, body: '' } }
  })
  await page.goto('/deling')
  await expect(page.locator('.del-navn')).toHaveText(['Ingrid', 'Martin'])
  await page.getByRole('switch', { name: 'Del med Ingrid' }).click()
  await expect(page.locator('.pf-melding')).toContainText('ikke lenger')
  expect(mine).toEqual([])
  await page.getByLabel('E-post').fill('sofie@x.no'); await page.getByRole('button', { name: 'Legg til' }).click()
  await expect(page.locator('.del-navn')).toContainText(['Sofie'])
  expect(mine).toEqual(['dddd'])
  await page.getByLabel('E-post').fill('ukjent@x.no'); await page.getByRole('button', { name: 'Legg til' }).click()
  await expect(page.getByText('Fant ingen bruker med ukjent@x.no.')).toBeVisible()
  await expect(page.getByText('Inviter på e-post')).toBeVisible()
  // Siden leser aldri andres profiler – bare sin egen (id=eq.u1)
  for (const k of kall.filter(k => k.sti === '/rest/v1/profiler' && k.metode === 'GET')) expect(k.sok).toContain('id=eq.u1')
})

test('se treningen til en som deler – uten vekt eller profil', async ({ page, context }) => {
  const kall = await falskSupabase(context, (_r, url) => url.pathname === '/rest/v1/rpc/deling_oversikt' ? { json: OVERSIKT } : undefined)
  await page.goto('/deling')
  await page.getByRole('link', { name: /Se treningen/ }).click()
  await page.waitForURL(`**/deling/${MARTIN}`)
  await expect(page.getByRole('heading', { name: 'Martin.' })).toBeVisible()
  for (const k of kall.filter(k => /\/rest\/v1\/(okter|treningslogger|pr_rekorder)$/.test(k.sti))) expect(k.sok).toContain(`bruker_id=eq.${MARTIN}`)
  expect(kall.some(k => /vektlogg/.test(k.sti) || (k.sti === '/rest/v1/profiler' && k.sok.includes(MARTIN)))).toBe(false)
})

test('ingen tilgang når personen ikke deler med deg', async ({ page, context }) => {
  await falskSupabase(context, (_r, url) => url.pathname === '/rest/v1/rpc/deling_oversikt' ? { json: OVERSIKT } : undefined)
  await page.goto(`/deling/${INGRID}`)
  await expect(page.getByRole('heading', { name: /Ingen tilgang/ })).toBeVisible()
})

test('tydelig melding når deling ikke er satt opp i databasen', async ({ page, context }) => {
  await falskSupabase(context, (_r, url) => url.pathname === '/rest/v1/rpc/deling_oversikt' ? { status: 404, json: { code: 'PGRST202', message: 'Could not find the function' } } : undefined)
  await page.goto('/deling')
  await expect(page.getByText(/må aktiveres i databasen/)).toBeVisible()
})
