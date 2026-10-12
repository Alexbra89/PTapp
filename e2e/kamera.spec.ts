import { test, expect } from '@playwright/test'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { falskSupabase, loggInn, fangFeil } from './hjelpere'
import { kostholdDb, lagStrekkodeVideo } from './kosthold-hjelpere'

// Ekte kamera-flyt i Chromium: et falskt kamera spiller av en video med en EAN-13-strekkode.
// Tester at kameraet åpnes, at koden leses fra videobildet (ZXing – Chromium på Linux har ikke
// BarcodeDetector), at varen slås opp, og at kameraet slippes (alle spor stoppet) etterpå.
const video = lagStrekkodeVideo('7038010009457', path.join(tmpdir(), 'abpt-e2e', 'strekkode-7038010009457.y4m'))

test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`] },
  permissions: ['camera'],
})

// Holder rede på alle kamerastrømmer siden har åpnet, så testen kan se om de er stoppet
const spion = () => {
  const w = window as any
  w.__spor = []
  const ekte = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
  navigator.mediaDevices.getUserMedia = async (c?: MediaStreamConstraints) => {
    const s = await ekte(c)
    w.__spor.push(...s.getTracks())
    return s
  }
}
const sporStatus = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__spor.map((t: MediaStreamTrack) => t.readyState))

test('kamera åpnes, strekkoden leses, varen slås opp og kameraet lukkes', async ({ page, context }) => {
  await loggInn(context)
  const kost = kostholdDb()
  await falskSupabase(context, kost.handler)
  await page.addInitScript(spion)
  const feil = fangFeil(page)

  await page.goto('/kosthold/legg-til?metode=strekkode&maltid=frokost')
  // Koden leses fra kamerabildet og varen hentes fra (falsk) Open Food Facts
  const ark = page.getByRole('dialog', { name: 'Kontroller varen' })
  await expect(ark).toBeVisible({ timeout: 20_000 })
  await expect(ark.getByTestId('matvare-navn')).toHaveValue('Lettmelk 1 %')
  // Kameraet ble åpnet, og er stoppet etter at koden er lest
  const status = await sporStatus(page)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every((s: string) => s === 'ended')).toBe(true)
  await expect(page.locator('.ko-kamera video')).toHaveCount(0) // skanneren er tatt bort mens varen kontrolleres
  expect(feil).toEqual([])
})

test('kameraet stoppes med «Stopp kamera» og når brukeren går fra siden', async ({ page, context }) => {
  await loggInn(context)
  await falskSupabase(context, kostholdDb().handler)
  await page.addInitScript(spion)
  await page.addInitScript(() => {
    // Hindrer at koden leses, slik at kameraet står på til vi stopper det
    const ekte = HTMLCanvasElement.prototype.getContext
    ;(window as any).BarcodeDetector = undefined
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...a: any[]) {
      const ctx = (ekte as any).apply(this, a)
      if (ctx && a[0] === '2d') { const tegn = ctx.drawImage.bind(ctx); ctx.drawImage = (...b: any[]) => (b[0] instanceof HTMLVideoElement ? undefined : tegn(...b)) }
      return ctx
    } as any
  })
  await page.goto('/kosthold/legg-til?metode=strekkode')
  await expect(page.locator('.ko-kamera[data-tilstand="skanner"]')).toBeVisible({ timeout: 15_000 })
  expect(await sporStatus(page)).toContain('live')

  await page.getByTestId('stopp-kamera').click()
  await expect(page.locator('.ko-kamera[data-tilstand="klar"]')).toBeVisible()
  expect((await sporStatus(page)).every((s: string) => s === 'ended')).toBe(true)

  // Start igjen, og forlat siden med klientnavigasjon (samme vindu): kameraet må slippes
  await page.getByTestId('start-kamera').click()
  await expect(page.locator('.ko-kamera[data-tilstand="skanner"]')).toBeVisible({ timeout: 15_000 })
  expect(await sporStatus(page)).toContain('live')
  await page.getByRole('link', { name: 'Til dagboken' }).click()
  await page.waitForURL('**/kosthold')
  await expect.poll(async () => (await sporStatus(page)).every((s: string) => s === 'ended')).toBe(true)
})
