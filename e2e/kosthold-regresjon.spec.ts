import { test, expect, type Page } from '@playwright/test'
import { falskSupabase, loggInn } from './hjelpere'
import { kostholdDb, HAVREGRYN, MELK, linje } from './kosthold-hjelpere'

// Regresjonstester for funnene i sluttkontrollen (F1–F13). Hver test viser at feilen er borte.

test.beforeEach(async ({ context }) => { await loggInn(context) })

async function oppsett(page: Page, start: Parameters<typeof kostholdDb>[0] = {}, overstyr?: Parameters<typeof falskSupabase>[1]) {
  const kost = kostholdDb(start)
  await falskSupabase(page.context(), (req, url) => overstyr?.(req, url) ?? kost.handler(req, url))
  return kost
}
const MAL_FROKOST = { id: 'm1', bruker_id: 'u1', navn: 'Min faste frokost', maltid: 'frokost', sist_brukt: null,
  linjer: [{ matvare_id: HAVREGRYN.id, mengde: 60, enhet: 'g' }, { matvare_id: MELK.id, mengde: 250, enhet: 'ml' }] }

test('F1: uten nett vises ingenting som lagret, og ingenting sendes', async ({ page, context }) => {
  const kost = await oppsett(page, { matvarer: [HAVREGRYN, MELK] })
  await page.goto('/kosthold/legg-til')
  await expect(page.getByTestId('matvare-rad').first()).toBeVisible()
  await context.setOffline(true)
  await expect(page.getByText('Du er uten nett.')).toBeVisible()

  // Ett trykk: tydelig feil, ingen «lagt til»
  await page.getByTestId('legg-til-igjen').first().click()
  await expect(page.locator('.ko-varsel.feil')).toContainText('Ingenting ble lagret')
  await expect(page.locator('.ko-varsel').filter({ hasText: 'lagt til' })).toHaveCount(0)

  // Mengdearket blir stående med feilen – det lukkes ikke som om alt gikk bra
  await page.getByTestId('matvare-rad').first().getByRole('button').first().click()
  const ark = page.getByRole('dialog', { name: 'Havregryn' })
  await ark.getByTestId('lagre-mengde').click()
  await expect(ark.getByRole('alert')).toContainText('Du er uten nett')
  await expect(ark).toBeVisible()
  expect(kost.skrivinger.filter(s => s.tabell === 'matlogg')).toHaveLength(0)

  // Tilbake på nett. Appen laster siden på nytt (next-pwa «reloadOnOnline», eksisterende innstilling),
  // så arket åpnes igjen. Ingenting ble lagret mens enheten var uten nett.
  const lastet = page.waitForEvent('load')
  await context.setOffline(false)
  await lastet
  expect(kost.db.matlogg).toHaveLength(0)
  await page.getByTestId('matvare-rad').first().getByRole('button').first().click()
  await page.getByRole('dialog', { name: 'Havregryn' }).getByTestId('lagre-mengde').click()
  await expect(page.getByRole('dialog', { name: 'Havregryn' })).toBeHidden()
  await expect.poll(() => kost.db.matlogg.length).toBe(1)
  expect(kost.skrivinger.filter(s => s.tabell === 'matlogg' && s.metode === 'POST')).toHaveLength(1)
})

test('F1: uten nett i dagboken – sletting rulles tilbake, dataene står', async ({ page, context }) => {
  const l = linje({ navn: 'Havregryn', matvare_id: HAVREGRYN.id, mengde: 60, basis_mengde: 60, kcal_100: 370 })
  const kost = await oppsett(page, { matvarer: [HAVREGRYN], matlogg: [l] })
  await page.goto('/kosthold')
  await expect(page.getByTestId('logglinje')).toHaveCount(1)
  await context.setOffline(true)
  await page.getByTestId('logglinje').click()
  const ark = page.getByRole('dialog', { name: 'Havregryn' })
  await ark.getByRole('button', { name: 'Slett' }).click()
  await ark.getByRole('button', { name: 'Bekreft sletting' }).click()
  await expect(ark.getByRole('alert')).toContainText('Du er uten nett')
  await ark.getByRole('button', { name: 'Lukk' }).click()
  await expect(page.getByTestId('logglinje')).toHaveCount(1) // fortsatt synlig – og fortsatt lagret
  expect(kost.db.matlogg).toHaveLength(1)
  await context.setOffline(false)
})

test('F1: en registrering på vei vises som «Lagrer …» til databasen har bekreftet', async ({ page, context }) => {
  const kost = await oppsett(page, { matvarer: [HAVREGRYN, MELK], maltidsmaler: [MAL_FROKOST] })
  let slipp!: () => void
  const vent = new Promise<void>(r => { slipp = r })
  await context.route('**/rest/v1/matlogg*', async route => {
    if (route.request().method() === 'POST') await vent
    return route.fallback()
  })
  await page.goto('/kosthold')
  await page.getByTestId('bruk-mal').click()
  await expect(page.locator('.ko-rad.venter')).toHaveCount(2)
  await expect(page.locator('.ko-rad.venter').first()).toContainText('Lagrer …')
  await expect(page.locator('.ko-varsel').filter({ hasText: 'registrert' })).toHaveCount(0) // ikke bekreftet ennå
  slipp()
  await expect(page.locator('.ko-varsel').filter({ hasText: 'registrert' })).toBeVisible()
  await expect(page.locator('.ko-rad.venter')).toHaveCount(0)
  expect(kost.db.matlogg).toHaveLength(2)
})

test('F9: raske gjentatte trykk gir ikke duplikater', async ({ page }) => {
  const kost = await oppsett(page, { matvarer: [HAVREGRYN, MELK], maltidsmaler: [MAL_FROKOST] })
  await page.goto('/kosthold/legg-til')
  const knapp = page.getByTestId('legg-til-igjen').first()
  await knapp.click({ clickCount: 3, delay: 20 }) // trippeltrykk
  await expect.poll(() => kost.db.matlogg.length).toBe(1)
  await page.waitForTimeout(500)
  expect(kost.db.matlogg).toHaveLength(1)

  await page.goto('/kosthold')
  kost.db.matlogg = []
  await page.getByTestId('bruk-mal').dblclick()
  await expect.poll(() => kost.db.matlogg.length).toBe(2)
  await page.waitForTimeout(500)
  expect(kost.db.matlogg).toHaveLength(2) // to linjer i malen – ikke fire
  // Etter pausen kan samme måltid registreres igjen med vilje
  await expect(page.getByTestId('bruk-mal')).toBeEnabled({ timeout: 10_000 })
})

test('F7: utløpt innlogging gir «logget ut», ikke «fant ikke varen»', async ({ page }) => {
  await oppsett(page)
  await page.route('**/api/mat/**', route => route.fulfill({ status: 401, json: { feil: 'Ikke innlogget' } }))
  await page.goto('/kosthold/legg-til?metode=strekkode')
  await page.getByRole('button', { name: 'Skriv inn kode' }).first().click()
  await page.getByTestId('strekkode-input').fill('7038010009457')
  await page.getByRole('button', { name: 'Slå opp' }).click()
  await expect(page.getByText('Du er logget ut')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Logg inn' })).toBeVisible()
  await expect(page.getByText(/Fant ikke/)).toHaveCount(0)

  await page.goto('/kosthold/legg-til')
  await page.getByTestId('sok').fill('melk')
  await page.getByTestId('sok-off').click()
  await expect(page.getByText('Du er logget ut')).toBeVisible()
})

test('F6: en registrering kan ikke flyttes frem i tid', async ({ page }) => {
  const l = linje({ navn: 'Havregryn', matvare_id: HAVREGRYN.id, mengde: 60, basis_mengde: 60, kcal_100: 370 })
  const kost = await oppsett(page, { matvarer: [HAVREGRYN], matlogg: [l] })
  await page.goto('/kosthold')
  await page.getByTestId('logglinje').click()
  const ark = page.getByRole('dialog', { name: 'Havregryn' })
  const imorgen = new Date(Date.now() + 864e5)
  const iso = `${imorgen.getFullYear()}-${String(imorgen.getMonth() + 1).padStart(2, '0')}-${String(imorgen.getDate()).padStart(2, '0')}`
  await expect(ark.getByTestId('dato')).toHaveAttribute('max', l.dato)
  await ark.getByTestId('dato').fill(iso)
  await expect(ark.getByText('Datoen kan ikke være frem i tid.')).toBeVisible()
  await expect(ark.getByTestId('lagre-mengde')).toBeDisabled()
  expect(kost.skrivinger.filter(s => s.tabell === 'matlogg')).toHaveLength(0)
})

test('F13: lagret strekkode – brukeren velger selv å bruke den lagrede varen', async ({ page }) => {
  const kost = await oppsett(page, { matvarer: [HAVREGRYN] })
  await page.goto('/kosthold/legg-til?metode=manuell')
  await page.getByTestId('matvare-navn').fill('Havregryn (ny)')
  await page.getByTestId('felt-kcal').fill('365')
  await page.locator('input[maxlength="14"]').fill(HAVREGRYN.strekkode)
  await page.getByTestId('lagre-matvare').click()
  await expect(page.getByText('Du har allerede lagret «Havregryn» med denne strekkoden.')).toBeVisible()
  expect(kost.db.matvarer).toHaveLength(1) // ingen kopi, og den lagrede er ikke overskrevet
  expect(kost.db.matvarer[0].kcal).toBe(370)
  await page.getByTestId('bruk-lagret').click()
  await expect(page.getByRole('dialog', { name: 'Havregryn' })).toBeVisible()
})

test('F8: mål under 800 kcal kan ikke lagres, og det sies tydelig', async ({ page }) => {
  const kost = await oppsett(page)
  await page.goto('/kosthold/mal')
  await expect(page.getByTestId('mal-vekt')).toHaveValue('82')
  await page.getByTestId('mal-vekt').fill('30')
  await page.getByTestId('mal-hoyde').fill('120')
  await page.getByTestId('mal-fodselsar').fill(String(new Date().getFullYear() - 100))
  await page.getByTestId('grunnlag-kvinne').click()
  await page.getByTestId('aktivitet-stillesittende').click()
  await expect(page.getByTestId('for-lavt')).toBeVisible()
  await expect(page.getByTestId('bruk-forslag')).toBeDisabled()
  expect(kost.db.ernaeringsmal).toHaveLength(0)
})

test('F12: målene lagres selv om profilen ikke kan oppdateres – og det sies fra', async ({ page }) => {
  const kost = await oppsett(page, {}, (req, url) => url.pathname === '/rest/v1/profiler' && req.method() === 'PATCH'
    ? { status: 500, json: { code: 'XX000', message: 'feil' } } : undefined)
  await page.goto('/kosthold/mal')
  await expect(page.getByTestId('mal-vekt')).toHaveValue('82')
  await page.getByTestId('mal-vekt').fill('83') // endring som skal til profilen
  await page.getByTestId('grunnlag-mann').click()
  await page.getByTestId('aktivitet-moderat').click()
  await page.getByTestId('bruk-forslag').click()
  await expect(page.getByText(/Målene er lagret\. Vekt, høyde og fødselsår i profilen ble ikke oppdatert/)).toBeVisible()
  expect(kost.db.ernaeringsmal).toHaveLength(1)
})
