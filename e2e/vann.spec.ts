import { test, expect, type Page, type Request } from '@playwright/test'
import { falskSupabase, loggInn } from './hjelpere'
import { idag, dagerSiden } from './kosthold-hjelpere'

test.beforeEach(async ({ context }) => { await loggInn(context) })

// Falsk vanntabell med samme regel som vann_sett() i docs/migrasjoner/vann.sql:
// bare en nyere versjon lagres, og svaret er det som faktisk er lagret.
function vannDb(start: Record<string, { glass: number; versjon: number }> = {}) {
  const rader = new Map(Object.entries(start))
  const sett: Array<{ dato: string; glass: number; versjon: number }> = []
  let lesefeil = 0
  const handler = (req: Request, url: URL) => {
    if (url.pathname === '/rest/v1/vanninntak' && req.method() === 'GET') {
      if (lesefeil > 0) { lesefeil--; return { status: 500, json: { code: 'XX000', message: 'simulert serverfeil' } } }
      const dato = (url.searchParams.get('dato') ?? '').replace('eq.', '')
      const r = rader.get(dato)
      return { json: r ? [r] : [] }
    }
    if (url.pathname === '/rest/v1/rpc/vann_sett') {
      const { p_dato, p_glass, p_versjon } = JSON.parse(req.postData()!)
      sett.push({ dato: p_dato, glass: p_glass, versjon: p_versjon })
      const na = rader.get(p_dato)
      if (!na || p_versjon > na.versjon) rader.set(p_dato, { glass: p_glass, versjon: p_versjon })
      return { json: rader.get(p_dato) }
    }
    return undefined
  }
  return { rader, sett, handler, feilVedLesing: (n: number) => { lesefeil = n } }
}

async function oppsett(page: Page, db: ReturnType<typeof vannDb>) {
  await falskSupabase(page.context(), db.handler)
}

test('viser lagret antall, og pluss lagrer 7 (ikke 1) når dagen har 6', async ({ page }) => {
  const db = vannDb({ [idag()]: { glass: 6, versjon: 100 } })
  await oppsett(page, db)
  await page.goto('/kosthold')
  const teller = page.getByTestId('vannteller')
  await expect(teller.getByTestId('vann-antall')).toHaveText('6')
  await teller.getByTestId('vann-pluss').click()
  await expect(teller).not.toContainText('lagrer')
  await expect(teller.getByTestId('vann-antall')).toHaveText('7')
  expect(db.rader.get(idag())?.glass).toBe(7)
  expect(db.sett[0].versjon).toBeGreaterThan(100)
})

test('raske trykk: alle teller, én lagring om gangen, og siste antall blir lagret', async ({ page }) => {
  const db = vannDb()
  let underveis = 0, maks = 0
  await oppsett(page, db)
  // Registreres etter falskSupabase, så denne får første ordet: hver lagring tar 300 ms
  await page.context().route('http://127.0.0.1:54399/rest/v1/rpc/vann_sett', async route => {
    underveis++; maks = Math.max(maks, underveis)
    await new Promise(r => setTimeout(r, 300))
    const svar = db.handler(route.request(), new URL(route.request().url()))!
    underveis--
    await route.fulfill(svar)
  })
  await page.goto('/kosthold')
  const teller = page.getByTestId('vannteller')
  await expect(teller.getByTestId('vann-antall')).toHaveText('0')
  for (let i = 0; i < 5; i++) await teller.getByTestId('vann-pluss').click()
  await expect(teller.getByTestId('vann-antall')).toHaveText('5')
  await expect(teller).not.toContainText('lagrer', { timeout: 10_000 })
  expect(maks).toBe(1)
  expect(db.rader.get(idag())?.glass).toBe(5)
  // Versjonene øker strengt
  const v = db.sett.map(s => s.versjon)
  expect([...v].sort((a, b) => a - b)).toEqual(v)
  expect(new Set(v).size).toBe(v.length)
})

test('lesefeil: viser feil og ingen knapper – ikke 0 – til dagens antall er hentet', async ({ page }) => {
  const db = vannDb({ [idag()]: { glass: 6, versjon: 100 } })
  db.feilVedLesing(10)
  await oppsett(page, db)
  await page.goto('/kosthold')
  const teller = page.getByTestId('vannteller')
  await expect(teller).toContainText('Fikk ikke hentet vann', { timeout: 15_000 })
  await expect(teller.getByTestId('vann-pluss')).toHaveCount(0)
  await expect(teller.getByTestId('vann-antall')).toHaveCount(0)
  expect(db.sett).toEqual([])

  db.feilVedLesing(0)
  await teller.getByTestId('vann-prov-igjen').click()
  await expect(teller.getByTestId('vann-antall')).toHaveText('6')
  await expect(teller.getByTestId('vann-pluss')).toBeEnabled()
})

test('lagret antall står seg etter omlasting, og datoer holdes adskilt', async ({ page }) => {
  const db = vannDb({ [dagerSiden(1)]: { glass: 3, versjon: 50 } })
  await oppsett(page, db)
  await page.goto('/kosthold')
  const teller = page.getByTestId('vannteller')
  await expect(teller.getByTestId('vann-antall')).toHaveText('0')
  await teller.getByTestId('vann-pluss').click()
  await teller.getByTestId('vann-pluss').click()
  await expect(teller).not.toContainText('lagrer')

  await page.reload()
  await expect(page.getByTestId('vannteller').getByTestId('vann-antall')).toHaveText('2')
  await page.getByTestId('vannteller').getByTestId('vann-minus').click()
  await expect(page.getByTestId('vannteller')).not.toContainText('lagrer')
  expect(db.rader.get(idag())?.glass).toBe(1)

  await page.getByRole('button', { name: 'Forrige dag' }).click()
  await expect(page.getByTestId('vannteller').getByTestId('vann-antall')).toHaveText('3')
  expect(db.rader.get(dagerSiden(1))).toEqual({ glass: 3, versjon: 50 })
})
