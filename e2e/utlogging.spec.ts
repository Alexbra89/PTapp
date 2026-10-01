import { test, expect } from '@playwright/test'
import { falskSupabase, loggInn } from './hjelpere'

test.use({ viewport: { width: 1280, height: 860 } }) // utloggingsknappen ligger i sidemenyen på desktop

test('utlogging sletter personlige data, men beholder enhetsinnstillinger', async ({ page, context }) => {
  await loggInn(context); await falskSupabase(context)
  await page.goto('/dashboard')
  await page.evaluate(() => {
    localStorage.setItem('okt_utkast', '{}'); localStorage.setItem('okt_fullforte', '[]'); localStorage.setItem('vektlogg_u1', '[]')
    localStorage.setItem('abpt_innstillinger', '{"lyd":false}'); localStorage.setItem('abpt_intro_ferdig', '1')
  })
  await page.locator('.dash-logout-btn').click()
  await page.waitForURL('**/login**')
  expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(['abpt_innstillinger', 'abpt_intro_ferdig'])
})
