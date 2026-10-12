import { test, expect, type Page } from '@playwright/test'
import { falskSupabase, loggInn } from './hjelpere'
import { kostholdDb, HAVREGRYN, linje } from './kosthold-hjelpere'

// Når nettet kommer tilbake, skal appen IKKE laste siden på nytt (next-pwa «reloadOnOnline: false»).
// En omlasting slettet åpne skjemaer og kunne avbryte endringer som var på vei. Data hentes i stedet
// på nytt av React Query (refetchOnReconnect).

test.beforeEach(async ({ context }) => { await loggInn(context) })

/** Teller hele sidelastinger (ikke klientnavigasjon) etter at testen har startet. */
function tellOmlastinger(page: Page) {
  const teller = { n: 0 }
  page.on('load', () => { teller.n++ })
  return teller
}

async function avOgPa(page: Page) {
  await page.context().setOffline(true)
  await page.waitForTimeout(300)
  await page.context().setOffline(false)
  await page.waitForTimeout(1500) // tid for en eventuell omlasting
}

test('kosthold: åpent mengdeark og tallet som er skrevet, overlever at nettet kommer tilbake', async ({ page }) => {
  await falskSupabase(page.context(), kostholdDb({ matvarer: [HAVREGRYN] }).handler)
  await page.goto('/kosthold/legg-til')
  await page.getByTestId('matvare-rad').first().getByRole('button').first().click()
  const ark = page.getByRole('dialog', { name: 'Havregryn' })
  await ark.getByTestId('mengde').fill('123')
  const last = tellOmlastinger(page)
  await avOgPa(page)
  expect(last.n).toBe(0)
  await expect(ark).toBeVisible()
  await expect(ark.getByTestId('mengde')).toHaveValue('123')
})

test('trening: utfylt vekt i økta overlever at nettet kommer tilbake', async ({ page }) => {
  await falskSupabase(page.context())
  await page.goto('/treninger/okt?grupper=bryst&sted=gym')
  await expect(page.locator('.okt-check').first()).toBeVisible()
  const felt = page.locator('.okt-sett-row input[inputmode="decimal"]').first()
  if (!(await felt.isVisible())) await page.locator('.okt-toggle:not(.open)').first().click()
  await felt.fill('57.5')
  const last = tellOmlastinger(page)
  await avOgPa(page)
  expect(last.n).toBe(0)
  await expect(felt).toHaveValue('57.5')
})

test('data hentes på nytt når nettet kommer tilbake – uten omlasting', async ({ page }) => {
  const kost = kostholdDb({ matvarer: [HAVREGRYN], matlogg: [linje({ navn: 'Fra før', mengde: 100, basis_mengde: 100, kcal_100: 100 })] })
  await falskSupabase(page.context(), kost.handler)
  await page.goto('/kosthold')
  await expect(page.getByTestId('logglinje')).toHaveCount(1)
  const last = tellOmlastinger(page)
  await page.context().setOffline(true)
  // Mens denne enheten er uten nett, registreres noe fra en annen enhet
  kost.db.matlogg.push(linje({ navn: 'Fra telefonen', mengde: 100, basis_mengde: 100, kcal_100: 200 }))
  await page.context().setOffline(false)
  await expect(page.getByText('Fra telefonen')).toBeVisible({ timeout: 10_000 })
  expect(last.n).toBe(0)
})
