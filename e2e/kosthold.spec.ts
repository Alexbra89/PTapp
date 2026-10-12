import { test, expect, type Page } from '@playwright/test'
import { falskSupabase, loggInn, fangFeil, SESJON } from './hjelpere'
import { kostholdDb, HAVREGRYN, MELK, MAL, linje, idag, dagerSiden } from './kosthold-hjelpere'
import { beregnMal, makroKcal } from '../lib/kosthold/mal'

test.beforeEach(async ({ context }) => { await loggInn(context) })

async function oppsett(page: Page, start: Parameters<typeof kostholdDb>[0] = {}) {
  const kost = kostholdDb(start)
  await falskSupabase(page.context(), kost.handler)
  return kost
}
const fjernMellomrom = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()

test('kostholdssidene åpnes uten feil eller CSP-brudd', async ({ page }) => {
  await oppsett(page)
  const feil = fangFeil(page)
  for (const [side, tittel] of [['/kosthold', /Kosthold/], ['/kosthold/legg-til', /Legg til/], ['/kosthold/matvarer', /Matvarer/], ['/kosthold/mal', /Mål/]] as const) {
    await page.goto(side)
    await expect(page.locator('h1').first(), side).toHaveText(tittel)
  }
  expect(feil).toEqual([])
})

test('dashbord og dagbok viser identiske tall fra samme data', async ({ page }) => {
  await oppsett(page, {
    matvarer: [HAVREGRYN, MELK], ernaeringsmal: [MAL],
    matlogg: [
      linje({ navn: 'Havregryn', matvare_id: HAVREGRYN.id, maltid: 'frokost', mengde: 60, basis_mengde: 60, kcal_100: 370, protein_100: 13, karbohydrater_100: 60, fett_100: 7 }),
      linje({ navn: 'Lettmelk', matvare_id: MELK.id, maltid: 'frokost', basis: '100ml', enhet: 'ml', mengde: 250, basis_mengde: 250, kcal_100: 38, protein_100: 3.5, karbohydrater_100: 4.5, fett_100: 1 }),
      linje({ navn: 'I går', dato: dagerSiden(1), mengde: 100, basis_mengde: 100, kcal_100: 999 }), // annen dag – skal ikke telle
    ],
  })
  // 60 g havregryn = 222 kcal, 250 ml melk = 95 kcal → 317. Protein 7,8 + 8,75 = 16,55 → «17»
  await page.goto('/dashboard')
  const kort = page.getByTestId('dashbord-kost')
  await expect(kort.locator('.ko-ring-tall')).toHaveText('317')
  await expect(kort.getByTestId('kcal-igjen')).toHaveText(/2\s183 kcal igjen/)
  const dashMakro = (await kort.locator('.ko-makro-tall').allTextContents()).map(fjernMellomrom)
  expect(dashMakro).toEqual(['17 / 160 g', '47 / 278 g', '6,7 / 83 g'])
  const dashIgjen = await kort.getByTestId('kcal-igjen').textContent()

  await page.goto('/kosthold')
  const sum = page.getByTestId('dagbok-sum')
  await expect(sum.locator('.ko-ring-tall')).toHaveText('317')
  expect((await sum.locator('.ko-makro-tall').allTextContents()).map(fjernMellomrom)).toEqual(dashMakro)
  expect(await sum.getByTestId('kcal-igjen').textContent()).toBe(dashIgjen)
  // Fordeling per måltid
  await expect(page.getByRole('region', { name: 'Frokost' })).toContainText('317 kcal')
  await expect(page.getByRole('region', { name: 'Lunsj' })).toContainText('Ingenting registrert')
})

test('strekkode skrevet inn: oppslag, kontroll, mengde og registrering', async ({ page }) => {
  const kost = await oppsett(page)
  await page.goto('/kosthold/legg-til?metode=strekkode&maltid=frokost')
  // Uten kamera i testnettleseren: skriv inn koden
  await page.getByRole('button', { name: 'Skriv inn kode' }).first().click()
  await page.getByTestId('strekkode-input').fill('7038010009458')
  await expect(page.getByText('Kontrollsifferet stemmer ikke')).toBeVisible()
  await page.getByTestId('strekkode-input').fill('7038010009457')
  await page.getByRole('button', { name: 'Slå opp' }).click()

  const ark = page.getByRole('dialog', { name: 'Kontroller varen' })
  await expect(ark).toBeVisible()
  await expect(ark.getByTestId('matvare-navn')).toHaveValue('Lettmelk 1 %')
  await expect(ark.getByTestId('felt-kcal')).toHaveValue('38')
  await expect(ark.getByTestId('felt-fiber')).toHaveValue('') // ukjent i kilden – ikke 0
  await ark.getByTestId('lagre-matvare').click()

  const mengde = page.getByRole('dialog', { name: 'Lettmelk 1 %' })
  await expect(mengde).toBeVisible()
  await mengde.getByRole('radio', { name: 'ml' }).click()
  await mengde.getByTestId('mengde').fill('300')
  await expect(mengde.locator('.ko-naering')).toContainText('114') // 38 × 3
  await mengde.getByTestId('lagre-mengde').click()
  await expect(page.getByRole('status').filter({ hasText: 'Lagt til i frokost' })).toBeVisible()

  await expect.poll(() => kost.db.matlogg.length).toBe(1)
  expect(kost.db.matvarer).toHaveLength(1)
  expect(kost.db.matvarer[0]).toMatchObject({ strekkode: '7038010009457', kilde: 'openfoodfacts', basis: '100ml', kcal: 38, fiber: null })
  expect(kost.db.matlogg[0]).toMatchObject({ maltid: 'frokost', dato: idag(), basis: '100ml', mengde: 300, enhet: 'ml', basis_mengde: 300, kcal_100: 38 })
  await expect.poll(() => kost.db.matvarer[0].sist_mengde).toBe(300) // «nylig brukt» oppdateres

  // Neste skanning av samme vare går rett til mengde – uten nytt oppslag
  await page.getByRole('button', { name: 'Skriv inn kode' }).first().click()
  await page.getByTestId('strekkode-input').fill('7038010009457')
  await page.getByRole('button', { name: 'Slå opp' }).click()
  await expect(page.getByRole('dialog', { name: 'Lettmelk 1 %' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Lettmelk 1 %' }).getByTestId('mengde')).toHaveValue('300')

  await page.goto('/dashboard')
  await expect(page.getByTestId('dashbord-kost').locator('.ko-ring-tall')).toHaveText('114')
})

test('ukjent strekkode: tilbyr manuell registrering med koden ferdig utfylt', async ({ page }) => {
  const kost = await oppsett(page)
  await page.goto('/kosthold/legg-til?metode=strekkode&maltid=lunsj')
  await page.getByRole('button', { name: 'Skriv inn kode' }).first().click()
  await page.getByTestId('strekkode-input').fill('4006381333931')
  await page.getByRole('button', { name: 'Slå opp' }).click()
  await expect(page.getByText('Fant ikke 4006381333931')).toBeVisible()
  await page.getByTestId('fyll-inn-selv').click()

  const ark = page.getByRole('dialog', { name: 'Ny matvare' })
  await ark.getByTestId('lagre-matvare').click()
  await expect(ark.getByText('Gi matvaren et navn.')).toBeVisible()
  await expect(ark.getByText('Energi (kcal) må fylles inn.')).toBeVisible()
  await ark.getByTestId('matvare-navn').fill('Proteinbar')
  await ark.getByTestId('felt-kcal').fill('380')
  await ark.getByTestId('felt-protein').fill('-3')
  await ark.getByTestId('lagre-matvare').click()
  await expect(ark.getByText('Protein kan ikke være negativ.')).toBeVisible()
  await ark.getByTestId('felt-protein').fill('33,5')
  await ark.getByTestId('lagre-matvare').click()
  const mengde = page.getByRole('dialog', { name: 'Proteinbar' })
  await mengde.getByTestId('mengde').fill('-50')
  await expect(mengde.getByTestId('lagre-mengde')).toBeDisabled()
  await mengde.getByTestId('mengde').fill('55')
  await mengde.getByTestId('lagre-mengde').click()
  await expect.poll(() => kost.db.matlogg.length).toBe(1)
  expect(kost.db.matvarer[0]).toMatchObject({ navn: 'Proteinbar', strekkode: '4006381333931', kcal: 380, protein: 33.5, karbohydrater: null, kilde: 'manuell' })
  expect(kost.db.matlogg[0]).toMatchObject({ maltid: 'lunsj', mengde: 55, basis_mengde: 55, protein_100: 33.5 })
})

test('nettverksfeil: nytt forsøk med samme id gir én rad, og lagrede data beholdes', async ({ page, context }) => {
  const eksisterende = linje({ navn: 'Allerede lagret', mengde: 100, basis_mengde: 100, kcal_100: 200 })
  const kost = await oppsett(page, { matvarer: [HAVREGRYN], matlogg: [eksisterende] })
  // Første lagring: forbindelsen brytes. Appen prøver selv igjen med samme id.
  let brutt = 0
  await context.route('**/rest/v1/matlogg*', route => route.request().method() === 'POST' && brutt++ === 0 ? route.abort('internetdisconnected') : route.fallback())
  await page.goto('/kosthold/legg-til')
  await page.getByTestId('legg-til-igjen').first().click()
  await expect.poll(() => kost.db.matlogg.length).toBe(2)
  const poster = kost.skrivinger.filter(s => s.tabell === 'matlogg' && s.metode === 'POST')
  expect(brutt).toBeGreaterThanOrEqual(2) // ett avbrutt + ett vellykket
  expect(poster).toHaveLength(1) // bare det vellykkede nådde databasen
  expect(poster[0].sok).toContain('on_conflict=id')

  // Serverfeil: feilmelding med «Prøv igjen» – samme id sendes, og ingenting dobles
  kost.feilKo.matlogg = [500]
  await page.getByTestId('legg-til-igjen').first().click()
  const varsel = page.locator('.ko-varsel.feil')
  await expect(varsel).toContainText('Noe gikk galt')
  await varsel.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect.poll(() => kost.db.matlogg.length).toBe(3)
  const ider = kost.skrivinger.filter(s => s.tabell === 'matlogg' && s.metode === 'POST').slice(-2).map(s => s.body[0].id)
  expect(ider[0]).toBe(ider[1])

  await page.goto('/kosthold')
  await expect(page.getByText('Allerede lagret')).toBeVisible()
  await expect(page.getByTestId('logglinje')).toHaveCount(3)
})

test('dobbelttrykk på «Legg til» registrerer bare én gang', async ({ page }) => {
  const kost = await oppsett(page, { matvarer: [HAVREGRYN] })
  await page.goto('/kosthold/legg-til')
  await page.getByTestId('matvare-rad').first().getByRole('button').first().click()
  await page.getByTestId('lagre-mengde').dblclick()
  await page.waitForTimeout(800)
  expect(kost.db.matlogg).toHaveLength(1)
})

test('favoritter, søk og registrering med ett trykk', async ({ page }) => {
  const kost = await oppsett(page, { matvarer: [HAVREGRYN, MELK] })
  await page.goto('/kosthold/legg-til?maltid=kveldsmat')
  await page.getByTestId('sok').fill('melk')
  await expect(page.getByTestId('matvare-rad')).toHaveCount(1)
  await page.getByTestId('matvare-rad').getByRole('button', { name: 'Merk som favoritt' }).click()
  await expect.poll(() => kost.db.matvarer.find(m => m.id === MELK.id)?.favoritt).toBe(true)
  await page.getByTestId('sok').fill('')
  await page.getByRole('button', { name: 'Favoritter' }).click()
  await expect(page.getByTestId('matvare-rad')).toHaveCount(2)
  await page.getByRole('button', { name: 'Legg til Lettmelk 1 %, 250 ml' }).click()
  await expect.poll(() => kost.db.matlogg.length).toBe(1)
  expect(kost.db.matlogg[0]).toMatchObject({ navn: 'Lettmelk 1 %', maltid: 'kveldsmat', mengde: 250, enhet: 'ml', basis_mengde: 250 })
  // Angre
  await page.locator('.ko-varsel').getByRole('button', { name: 'Angre' }).click()
  await expect.poll(() => kost.db.matlogg.length).toBe(0)
})

test('søk i Open Food Facts og feil fra databasen', async ({ page }) => {
  const kost = await oppsett(page)
  await page.goto('/kosthold/legg-til')
  await page.getByTestId('sok').fill('havregryn')
  await page.getByTestId('sok-off').click()
  await page.getByTestId('off-treff').first().click()
  const ark = page.getByRole('dialog', { name: 'Kontroller varen' })
  await expect(ark.getByTestId('felt-kcal')).toHaveValue('370')
  await ark.getByTestId('lagre-matvare').click()
  // Porsjon finnes (40 g): standard er 1 porsjon
  const mengde = page.getByRole('dialog', { name: 'Havregryn' })
  await expect(mengde.getByRole('radio', { name: 'porsjon' })).toHaveAttribute('aria-checked', 'true')
  await expect(mengde.locator('.ko-naering')).toContainText('148') // 370 × 0,4
  await mengde.getByTestId('lagre-mengde').click()
  await expect.poll(() => kost.db.matlogg[0]?.basis_mengde).toBe(40)

  await page.getByTestId('sok').fill('feil')
  await page.getByTestId('sok-off').click()
  await expect(page.getByText('Matvaredatabasen svarte ikke')).toBeVisible()
})

test('faste måltider: lagre fra dagboken og registrere hele måltidet med ett trykk', async ({ page }) => {
  const kost = await oppsett(page, {
    matvarer: [HAVREGRYN, MELK],
    matlogg: [
      linje({ navn: 'Havregryn', matvare_id: HAVREGRYN.id, mengde: 60, basis_mengde: 60, kcal_100: 370 }),
      linje({ navn: 'Lettmelk 1 %', matvare_id: MELK.id, basis: '100ml', enhet: 'ml', mengde: 250, basis_mengde: 250, kcal_100: 38 }),
    ],
  })
  await page.goto('/kosthold')
  await page.getByRole('button', { name: 'Lagre frokost som fast måltid' }).click()
  await expect(page.getByTestId('mal-navn')).toHaveValue('Min faste frokost')
  await page.getByTestId('lagre-mal').click()
  await expect.poll(() => kost.db.maltidsmaler.length).toBe(1)
  expect(kost.db.maltidsmaler[0]).toMatchObject({ navn: 'Min faste frokost', maltid: 'frokost', linjer: [{ matvare_id: HAVREGRYN.id, mengde: 60, enhet: 'g' }, { matvare_id: MELK.id, mengde: 250, enhet: 'ml' }] })

  // Neste dag: hele frokosten med ett trykk, i én forespørsel (alt eller ingenting)
  kost.db.matlogg = []
  await page.reload()
  const forPoster = kost.skrivinger.filter(s => s.tabell === 'matlogg' && s.metode === 'POST').length
  await page.getByTestId('bruk-mal').click()
  await expect.poll(() => kost.db.matlogg.length).toBe(2)
  expect(kost.skrivinger.filter(s => s.tabell === 'matlogg' && s.metode === 'POST').length - forPoster).toBe(1)
  await expect(page.getByRole('region', { name: 'Frokost' })).toContainText('317 kcal')
})

test('endre mengde, flytte måltid og slette en registrering', async ({ page }) => {
  const l = linje({ navn: 'Havregryn', matvare_id: HAVREGRYN.id, mengde: 60, basis_mengde: 60, kcal_100: 370 })
  const kost = await oppsett(page, { matvarer: [HAVREGRYN], matlogg: [l] })
  await page.goto('/kosthold')
  await page.getByTestId('logglinje').click()
  const ark = page.getByRole('dialog', { name: 'Havregryn' })
  await ark.getByTestId('mengde').fill('120')
  await ark.getByRole('radio', { name: 'Lunsj' }).click()
  await ark.getByTestId('lagre-mengde').click()
  await expect(page.getByRole('region', { name: 'Lunsj' })).toContainText('444 kcal')
  await expect.poll(() => kost.db.matlogg[0]).toMatchObject({ maltid: 'lunsj', mengde: 120, basis_mengde: 120 })
  await expect(page.getByTestId('dagbok-sum').locator('.ko-ring-tall')).toHaveText('444')

  await page.getByTestId('logglinje').click()
  await page.getByRole('button', { name: 'Slett' }).click()
  await page.getByRole('button', { name: 'Bekreft sletting' }).click()
  await expect.poll(() => kost.db.matlogg.length).toBe(0)
  await expect(page.getByTestId('logglinje')).toHaveCount(0)
})

test('mål: beregning fra profilen, konsistente makroer og egne mål', async ({ page }) => {
  const kost = await oppsett(page)
  await page.goto('/kosthold/mal')
  await expect(page.getByTestId('mal-vekt')).toHaveValue('82') // fra profilen
  await page.getByTestId('grunnlag-mann').click()
  await page.getByTestId('aktivitet-moderat').click()
  const forventet = beregnMal({ vekt: 82, hoyde: 182, alder: new Date().getFullYear() - 1989, grunnlag: 'mann', aktivitet: 'moderat', retning: 'opp' })
  await expect(page.getByTestId('forslag-kcal')).toContainText(forventet.kcal.toLocaleString('nb-NO'))
  await page.getByTestId('bruk-forslag').click()
  await expect.poll(() => kost.db.ernaeringsmal.length).toBe(1)
  const lagret = kost.db.ernaeringsmal[0]
  expect(lagret).toMatchObject({ kcal: forventet.kcal, protein: forventet.protein, karbohydrater: forventet.karbohydrater, fett: forventet.fett, overstyrt: false, retning: 'opp', aktivitetsniva: 'moderat' })
  expect(Math.abs(makroKcal(lagret as any) - lagret.kcal)).toBeLessThanOrEqual(2)

  await page.getByTestId('egne-mal').click()
  await page.getByTestId('egen-protein').fill('180')
  await page.getByTestId('egen-karbohydrater').fill('250')
  await page.getByTestId('egen-fett').fill('70')
  await expect(page.getByTestId('egne-kcal')).toContainText('2 350')
  await page.getByTestId('lagre-egne').click()
  await expect.poll(() => kost.db.ernaeringsmal[0].overstyrt).toBe(true)
  expect(kost.db.ernaeringsmal[0]).toMatchObject({ kcal: 2350, protein: 180, karbohydrater: 250, fett: 70 })
})

test('kamera avslått: tydelig melding og mulighet til å skrive inn koden', async ({ page }) => {
  await oppsett(page)
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
  })
  await page.goto('/kosthold/legg-til?metode=strekkode')
  const feil = page.locator('.ko-kamera-dekke[role=alert]')
  await expect(feil).toContainText('Kameratilgang er avslått')
  await expect(feil.getByRole('button', { name: 'Prøv igjen' })).toBeVisible()
  await feil.getByRole('button', { name: 'Skriv inn kode' }).click()
  await expect(page.getByTestId('strekkode-input')).toBeVisible()
})

test('uten migrasjon: tydelig beskjed, og treningsdelen virker som før', async ({ page }) => {
  await falskSupabase(page.context(), (_r, url) => /\/rest\/v1\/(matlogg|matvarer|maltidsmaler|ernaeringsmal)/.test(url.pathname)
    ? { status: 404, json: { code: 'PGRST205', message: "Could not find the table 'public.matlogg' in the schema cache" } } : undefined)
  const feil = fangFeil(page)
  await page.goto('/dashboard')
  await expect(page.getByTestId('dashbord-kost')).toContainText('ikke aktivert')
  await expect(page.locator('h1').first()).toHaveText(/Alex/)
  await page.goto('/kosthold')
  await expect(page.getByText('Kostholdsmodulen er ikke aktivert ennå.')).toBeVisible()
  expect(feil).toEqual([])
})

test('API: kamera tillatt for appen, matoppslag krever innlogging og caches ikke', async ({ request }) => {
  const cookie = `sb-127-auth-token=${encodeURIComponent(JSON.stringify(SESJON))}`
  const side = await request.get('/login')
  expect(side.headers()['permissions-policy']).toContain('camera=(self)')
  expect(side.headers()['permissions-policy']).toContain('microphone=()')

  const uten = await request.get('/api/mat/strekkode/7038010009457', { maxRedirects: 0 })
  expect([307, 401]).toContain(uten.status())

  const r = await request.get('/api/mat/strekkode/7038010009457', { headers: { cookie } })
  expect(r.status()).toBe(200)
  expect(r.headers()['cache-control']).toBe('private, no-store')
  expect((await r.json()).utkast).toMatchObject({ navn: 'Lettmelk 1 %', basis: '100ml' })
  expect((await request.get('/api/mat/strekkode/123', { headers: { cookie } })).status()).toBe(400)
  expect((await request.get('/api/mat/strekkode/7038010009458', { headers: { cookie } })).status()).toBe(400)
  expect(await (await request.get('/api/mat/strekkode/4006381333931', { headers: { cookie } })).json()).toEqual({ funnet: false, strekkode: '4006381333931' })
  expect((await request.get('/api/mat/sok?q=x', { headers: { cookie } })).status()).toBe(400)
})
