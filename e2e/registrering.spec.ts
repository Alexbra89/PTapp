import { test, expect } from '@playwright/test'
import { falskSupabase, loggInn, SESJON } from './hjelpere'

async function fyllSkjema(page: import('@playwright/test').Page, passord = 'SterktPassord1') {
  await page.goto('/signup')
  await page.getByPlaceholder('Ola Nordmann').fill('Kari Test')
  await page.getByPlaceholder('din@epost.no').fill('kari@test.no')
  await page.getByPlaceholder('Minst 8 tegn').fill(passord)
  await page.getByPlaceholder('Gjenta passord').fill(passord)
  await page.getByRole('button', { name: 'Opprett konto' }).click()
}

test('med e-postbekreftelse: ber brukeren sjekke e-posten, ingen profil lages ennå', async ({ page, context }) => {
  const kall = await falskSupabase(context, (_r, url) => url.pathname === '/auth/v1/signup'
    ? { json: { id: 'ny', email: 'kari@test.no', identities: [{ id: 'i' }], user_metadata: { full_name: 'Kari Test' } } } : undefined)
  await fyllSkjema(page)
  await expect(page.getByText('Sjekk e-posten')).toBeVisible()
  const signup = kall.find(k => k.sti === '/auth/v1/signup')!
  expect(signup.sok).toContain('redirect_to=http://localhost:3001/bekreftet')
  expect(kall.some(k => k.sti === '/rest/v1/profiler')).toBe(false)
})

test('uten e-postbekreftelse: logges inn og profil lages', async ({ page, context }) => {
  const kall = await falskSupabase(context, (_r, url) => url.pathname === '/auth/v1/signup' ? { json: SESJON } : undefined)
  await fyllSkjema(page)
  await expect(page.getByText('Konto opprettet!')).toBeVisible()
  const profil = kall.find(k => k.metode === 'POST' && k.sti === '/rest/v1/profiler')!
  expect(JSON.parse(profil.body!)).toMatchObject({ navn: 'Kari Test', epost: 'kari@test.no' })
})

test('for kort passord stoppes', async ({ page, context }) => {
  const kall = await falskSupabase(context)
  await fyllSkjema(page, 'kort12')
  await expect(page.locator('.login-error-text')).toContainText('minst 8 tegn')
  expect(kall.some(k => k.sti === '/auth/v1/signup')).toBe(false)
})

test('innlogging med ubekreftet e-post tilbyr ny lenke', async ({ page, context }) => {
  const kall = await falskSupabase(context, (_r, url) => url.pathname === '/auth/v1/token'
    ? { status: 400, json: { error_code: 'email_not_confirmed', msg: 'Email not confirmed' } } : undefined)
  await page.goto('/login')
  await page.fill('#epost', 'kari@test.no'); await page.fill('#passord', 'SterktPassord1')
  await page.getByRole('button', { name: /Logg inn/ }).click()
  await expect(page.locator('.login-error-text').first()).toContainText('ikke bekreftet')
  await page.getByText('Send lenken på nytt').click()
  await expect(page.getByText('Ny lenke er sendt.')).toBeVisible()
  expect(kall.some(k => k.sti === '/auth/v1/resend')).toBe(true)
})

test('bekreftelseslenke med gyldig økt sender videre til appen', async ({ page, context }) => {
  await loggInn(context); await falskSupabase(context)
  await page.goto('/bekreftet')
  await expect(page.getByText('E-posten er bekreftet')).toBeVisible()
  await page.waitForURL('**/dashboard')
})

test('ugyldig bekreftelseslenke', async ({ page, context }) => {
  await falskSupabase(context)
  await page.goto('/bekreftet?error=access_denied')
  await expect(page.locator('.login-error-text')).toContainText('ugyldig eller utløpt')
})

test('ny bruker uten profil får profil og introduksjon', async ({ page, context }) => {
  await loggInn(context)
  let profil: Record<string, unknown> | null = null
  const kall = await falskSupabase(context, (req, url) => {
    if (url.pathname !== '/rest/v1/profiler') return
    if (req.method() === 'POST') { profil = { ...JSON.parse(req.postData()!), mal: null }; return { status: 201, json: {} } }
    if (req.method() === 'GET') return profil ? { json: profil } : { status: 406, json: { code: 'PGRST116', message: 'no rows' } }
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('dialog', { name: 'Kom i gang' })).toBeVisible()
  await expect.poll(() => kall.filter(k => k.metode === 'POST' && k.sti === '/rest/v1/profiler').length).toBe(1)
  const opprett = kall.find(k => k.metode === 'POST' && k.sti === '/rest/v1/profiler')!
  expect(JSON.parse(opprett.body!)).toMatchObject({ id: 'u1', epost: 'alex@abpt.no' })
})
