import { test, expect } from '@playwright/test'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

// Måler faktisk oppstart med service workeren på, mot en treg server (mobilnett som våkner,
// kald serverstart). En mellomtjener forsinker alle HTML-svar med FORSINK ms.
// • Kald cache (første åpning): ingenting er lagret, så siden kommer når serveren svarer.
// • Varm cache: lagret side vises etter tidsgrensen (1 s), ikke etter serverens tid.
// • Siden er mørk fra første tegning (ingen hvit bakgrunn mens resten lastes).
test.use({ serviceWorkers: 'allow' })

const FORSINK = 4000

test('oppstart med kald og varm cache mot treg server', async ({ browser }) => {
  const proxy = http.createServer((req, res) => {
    const p = http.request({ host: '127.0.0.1', port: 3001, path: req.url, method: req.method, headers: { ...req.headers, host: 'localhost:3001' } }, r => {
      const html = (r.headers['content-type'] ?? '').includes('text/html')
      setTimeout(() => { res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res) }, html ? FORSINK : 0)
    })
    p.on('error', () => { res.writeHead(502); res.end() })
    req.pipe(p)
  })
  await new Promise<void>(r => proxy.listen(0, '127.0.0.1', r))
  const url = `http://localhost:${(proxy.address() as AddressInfo).port}/login`

  try {
    const ctx = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 400, height: 860 } })
    const page = await ctx.newPage()
    const bakgrunn = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)

    let t = Date.now()
    await page.goto(url, { waitUntil: 'commit' })
    const kald = Date.now() - t
    expect(kald).toBeGreaterThanOrEqual(FORSINK - 200) // ingen cache: må vente på serveren
    await page.waitForLoadState('domcontentloaded')
    expect(await bakgrunn()).toBe('rgb(11, 10, 9)')

    // Service workeren tar over og lagrer siden
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
    await page.reload()
    await page.waitForLoadState('load')
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).includes('pages')), { timeout: 15_000 }).toBe(true)

    const ny = await ctx.newPage()
    t = Date.now()
    await ny.goto(url, { waitUntil: 'commit' })
    const varm = Date.now() - t
    await ny.waitForLoadState('domcontentloaded')
    expect(await ny.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(11, 10, 9)')
    await expect(ny.locator('input[type="email"]')).toBeVisible()
    expect(varm, `varm oppstart tok ${varm} ms (serveren bruker ${FORSINK} ms)`).toBeLessThan(2000)

    console.log(`Oppstart med server som bruker ${FORSINK} ms: kald cache ${kald} ms, varm cache ${varm} ms`)
    await ctx.close()
  } finally {
    proxy.close()
  }
})
