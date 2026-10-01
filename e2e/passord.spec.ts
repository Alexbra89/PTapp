import { test, expect } from '@playwright/test'
import { falskSupabase, loggInn, BRUKER } from './hjelpere'

test.describe('glemt passord', () => {
  test('sender lenke og gir samme svar uansett om e-posten finnes', async ({ page, context }) => {
    const kall = await falskSupabase(context, (_r, url) => url.pathname === '/auth/v1/recover' ? { status: 400, json: { msg: 'User not found' } } : undefined)
    await page.goto('/login')
    await page.getByText('Glemt passord?').click()
    await page.waitForURL('**/glemt-passord')
    await page.waitForLoadState('networkidle') // vent til siden er ferdig lastet, ellers kan React tømme feltet
    await page.fill('#epost', 'finnes@ikke.no')
    await expect(page.locator('#epost')).toHaveValue('finnes@ikke.no')
    await page.getByRole('button', { name: /Send lenke/ }).click()
    await expect(page.locator('.pf-melding')).toContainText('Hvis finnes@ikke.no har en konto')
    const r = kall.find(k => k.sti === '/auth/v1/recover')!
    expect(r.sok).toContain('redirect_to=http://localhost:3001/nytt-passord')
  })

  test('for mange forsøk gir egen melding', async ({ page, context }) => {
    await falskSupabase(context, (_r, url) => url.pathname === '/auth/v1/recover' ? { status: 429, json: { msg: 'email rate limit exceeded' } } : undefined)
    await page.goto('/glemt-passord')
    await page.fill('#epost', 'ola@epost.no')
    await page.getByRole('button', { name: /Send lenke/ }).click()
    await expect(page.locator('.login-error-text')).toContainText('For mange forsøk')
  })
})

test.describe('nytt passord', () => {
  test('ugyldig lenke uten økt', async ({ page, context }) => {
    await falskSupabase(context)
    await page.goto('/nytt-passord')
    await expect(page.locator('.login-error-text')).toContainText('ugyldig eller utløpt')
  })

  test('validerer og lagrer nytt passord', async ({ page, context }) => {
    await loggInn(context)
    const kall = await falskSupabase(context, (req, url) => url.pathname === '/auth/v1/user' && req.method() === 'PUT'
      ? (JSON.parse(req.postData()!).password === 'gammelt123' ? { status: 422, json: { msg: 'New password should be different from the old password.' } } : { json: BRUKER })
      : undefined)
    await page.goto('/nytt-passord')
    await page.fill('#passord', 'langtpassord1'); await page.fill('#passord2', 'annerledes12')
    await page.getByRole('button', { name: /Lagre nytt passord/ }).click()
    await expect(page.locator('.login-error-text')).toContainText('ikke like')
    await page.fill('#passord', 'gammelt123'); await page.fill('#passord2', 'gammelt123')
    await page.getByRole('button', { name: /Lagre nytt passord/ }).click()
    await expect(page.locator('.login-error-text')).toContainText('forskjellig fra det gamle')
    await page.fill('#passord', 'NyttSterkt#2026'); await page.fill('#passord2', 'NyttSterkt#2026')
    await page.getByRole('button', { name: /Lagre nytt passord/ }).click()
    await page.waitForURL('**/dashboard')
    expect(kall.filter(k => k.metode === 'PUT' && k.sti === '/auth/v1/user').length).toBeGreaterThanOrEqual(2)
  })

  test('token_hash-lenke verifiseres og fjernes fra adressen', async ({ page, context }) => {
    const kall = await falskSupabase(context)
    await page.goto('/nytt-passord?token_hash=abc123&type=recovery')
    await expect(page.locator('#passord')).toBeVisible()
    expect(kall.some(k => k.sti === '/auth/v1/verify')).toBe(true)
    expect(new URL(page.url()).search).toBe('')
  })
})
