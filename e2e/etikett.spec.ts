import { test, expect, type Page, type Browser } from '@playwright/test'
import { falskSupabase, loggInn, fangFeil } from './hjelpere'
import { kostholdDb } from './kosthold-hjelpere'

// Ekte tekstgjenkjenning (Tesseract i nettleseren, filer fra /ocr) på bilder av en næringsdeklarasjon.
// Bildene lages her: en norsk etikett tegnet i nettleseren og tatt bilde av – én skarp og én dårlig.
test.setTimeout(120_000)

const ETIKETT = (stil: string) => `<!doctype html><html><body style="margin:0;background:${stil.includes('grå') ? '#cfcac0' : '#fff'}">
<div style="width:760px;padding:28px 34px;font-family:Arial,Helvetica,sans-serif;color:#111;${stil.includes('grå') ? 'filter:blur(0.7px) contrast(0.75);transform:rotate(-2deg);' : ''}">
<div style="font-size:30px;font-weight:bold;border-bottom:3px solid #111;padding-bottom:8px">Næringsinnhold</div>
<table style="width:100%;font-size:28px;border-collapse:collapse;margin-top:6px">
<tr><td></td><td style="text-align:right;padding:6px">Per 100 g</td><td style="text-align:right;padding:6px">Per porsjon (40 g)</td></tr>
<tr><td style="padding:6px">Energi</td><td style="text-align:right">1550 kJ / 370 kcal</td><td style="text-align:right">620 kJ / 148 kcal</td></tr>
<tr><td style="padding:6px">Fett</td><td style="text-align:right">7,0 g</td><td style="text-align:right">2,8 g</td></tr>
<tr><td style="padding:6px">hvorav mettede fettsyrer</td><td style="text-align:right">1,2 g</td><td style="text-align:right">0,5 g</td></tr>
<tr><td style="padding:6px">Karbohydrat</td><td style="text-align:right">60 g</td><td style="text-align:right">24 g</td></tr>
<tr><td style="padding:6px">hvorav sukkerarter</td><td style="text-align:right">1,1 g</td><td style="text-align:right">0,4 g</td></tr>
<tr><td style="padding:6px">Kostfiber</td><td style="text-align:right">10 g</td><td style="text-align:right">4,0 g</td></tr>
<tr><td style="padding:6px">Protein</td><td style="text-align:right">13 g</td><td style="text-align:right">5,2 g</td></tr>
<tr><td style="padding:6px">Salt</td><td style="text-align:right">0,01 g</td><td style="text-align:right">0 g</td></tr>
</table></div></body></html>`

async function bilde(browser: Browser, html: string) {
  const side = await browser.newPage({ viewport: { width: 840, height: 640 } })
  await side.setContent(html)
  const buf = await side.screenshot({ type: 'png' })
  await side.close()
  return buf
}

async function lesBilde(page: Page, buffer: Buffer) {
  await page.goto('/kosthold/legg-til?metode=etikett')
  await expect(page.getByText('Bildet blir på telefonen din.')).toBeVisible()
  await page.getByTestId('etikett-fil').setInputFiles({ name: 'etikett.png', mimeType: 'image/png', buffer })
}

const RIKTIG: Record<string, string> = { kcal: '370', kj: '1550', fett: '7', mettet_fett: '1,2', karbohydrater: '60', sukker: '1,1', fiber: '10', protein: '13', salt: '0,01' }

test('skarpt bilde: alle verdier per 100 g leses riktig, og brukeren må bekrefte', async ({ page, context, browser }) => {
  await loggInn(context)
  const kost = kostholdDb()
  await falskSupabase(context, kost.handler)
  const feil = fangFeil(page)
  const ocrKall: string[] = []
  page.on('request', r => { if (!r.url().startsWith('http://localhost:3001') && !r.url().startsWith('http://127.0.0.1:54399') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) ocrKall.push(r.url()) })

  await lesBilde(page, await bilde(browser, ETIKETT('skarp')))
  const ark = page.getByRole('dialog', { name: 'Kontroller verdiene' })
  await expect(ark).toBeVisible({ timeout: 90_000 })
  // Hovedtallene leses riktig …
  for (const felt of ['kj', 'protein', 'karbohydrater', 'fett', 'fiber', 'salt']) await expect(ark.getByTestId(`felt-${felt}`), felt).toHaveValue(RIKTIG[felt])
  // kcal: lest direkte (370), eller – hvis OCR mistet tallet – regnet ut fra kJ og merket
  const kcal = ark.getByTestId('felt-kcal')
  const kcalVerdi = Number((await kcal.inputValue()).replace(',', '.'))
  expect(Math.abs(kcalVerdi - 370)).toBeLessThan(1)
  if (kcalVerdi !== 370) await expect(ark.locator('#hint-kcal')).toContainText('Regnet ut fra kJ')
  // … og ingen verdi er feil uten å være merket usikker (OCR leser ofte «g» som «9»)
  await sjekkIngenStilleFeil(ark)
  await expect(ark.getByRole('radio', { name: 'per 100 g' })).toHaveAttribute('aria-checked', 'true')
  await expect(ark).toContainText('Verdiene er hentet fra kolonnen «per 100 g»')
  // Usikre verdier må rettes eller bekreftes – her retter brukeren det OCR var usikker på
  for (const felt of ['kcal', 'mettet_fett', 'sukker']) await ark.getByTestId(`felt-${felt}`).fill(RIKTIG[felt])

  // Lagring krever navn og bekreftelse av at verdiene er kontrollert
  await ark.getByTestId('matvare-navn').fill('Havregryn fra etikett')
  await ark.getByTestId('lagre-matvare').click()
  await expect(ark.getByText('Bekreft at du har kontrollert verdiene')).toBeVisible()
  await ark.getByTestId('bekreft-kontroll').check()
  await ark.getByTestId('lagre-matvare').click()
  await expect(page.getByRole('dialog', { name: 'Havregryn fra etikett' })).toBeVisible()
  expect(kost.db.matvarer[0]).toMatchObject({ kilde: 'etikett', basis: '100g', kcal: 370, protein: 13, salt: 0.01 }) // porsjonsstørrelsen ble ikke lest – lagres ikke som gjetning

  expect(ocrKall).toEqual([]) // ingen bilder eller tekst til andre domener
  expect(feil).toEqual([])    // og ingen CSP-brudd (worker og wasm fra eget domene)
})

test('dårlig bilde: ingen verdi er feil uten å være merket usikker', async ({ page, context, browser }) => {
  await loggInn(context)
  await falskSupabase(context, kostholdDb().handler)
  await lesBilde(page, await bilde(browser, ETIKETT('grå')))
  const ark = page.getByRole('dialog', { name: 'Kontroller verdiene' })
  const ingen = page.getByText('Fant ingen næringsdeklarasjon')
  await expect(ark.or(ingen)).toBeVisible({ timeout: 90_000 })
  if (await ingen.isVisible()) return // like greit: appen gjettet ikke
  await sjekkIngenStilleFeil(ark)
})

async function sjekkIngenStilleFeil(ark: import('@playwright/test').Locator) {
  for (const [felt, riktig] of Object.entries(RIKTIG)) {
    const f = ark.getByTestId(`felt-${felt}`)
    const verdi = await f.inputValue()
    const usikker = await f.evaluate(el => el.closest('.ko-felt')!.classList.contains('usikker'))
    // Tomt (ukjent), riktig, eller tydelig merket som usikker – aldri en stille feil
    expect(verdi === '' || verdi === riktig || usikker, `${felt}: «${verdi}» uten usikker-merking`).toBe(true)
  }
}

test('uleselig bilde: ber om nytt bilde eller manuell utfylling, finner ikke på verdier', async ({ page, context, browser }) => {
  await loggInn(context)
  await falskSupabase(context, kostholdDb().handler)
  const stoy = `<!doctype html><body style="margin:0"><canvas id=c width=840 height=640></canvas><script>
    const c=document.getElementById('c').getContext('2d');for(let i=0;i<840;i+=4)for(let j=0;j<640;j+=4){const g=Math.random()*255|0;c.fillStyle='rgb('+g+','+g+','+g+')';c.fillRect(i,j,4,4)}</script></body>`
  await lesBilde(page, await bilde(browser, stoy))
  await expect(page.getByText('Fant ingen næringsdeklarasjon')).toBeVisible({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Fyll inn selv' }).click()
  const ark = page.getByRole('dialog', { name: 'Ny matvare' })
  await expect(ark.getByTestId('felt-kcal')).toHaveValue('')
})
