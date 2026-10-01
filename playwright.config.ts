import { defineConfig, devices } from '@playwright/test'

// E2E-tester mot et ekte produksjonsbygg. Supabase er falsk: middleware snakker med
// e2e/mock-supabase.mjs, og nettleserens kall avlyttes i hver test (e2e/hjelpere.ts).
// Kjør: npm run test:e2e   (første gang lokalt: npx playwright install chromium)
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:3001',
    ...devices['Pixel 5'],
    viewport: { width: 400, height: 860 },
    serviceWorkers: 'block', // ellers går Supabase-kall utenom avlyttingen etter første sidevisning
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    { command: 'node e2e/mock-supabase.mjs', url: 'http://127.0.0.1:54399/auth/v1/user', reuseExistingServer: true, ignoreHTTPSErrors: true, timeout: 20_000, stdout: 'ignore' },
    {
      command: 'npm run build && npm run start',
      url: 'http://localhost:3001/login',
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54399', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon' },
    },
  ],
})
