// Minimal falsk Supabase for E2E-testene. Bare middleware (på serveren) snakker med denne –
// nettleserens kall avlyttes i testene (se hjelpere.ts). Port 54399 for ikke å kollidere
// med en lokal Supabase (54321).
import http from 'node:http'

const GYLDIG = 'e2e.eyJzdWIiOiJ1MSJ9.token'
const BRUKER = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'alex@abpt.no', user_metadata: { full_name: 'Alex Bratland' }, app_metadata: {}, created_at: '2024-01-01T00:00:00Z' }

// Falsk Open Food Facts (serveren slår opp her når OFF_BASE_URL peker hit – se playwright.config.ts)
const OFF_PRODUKTER = {
  '7038010009457': {
    code: '7038010009457', product_name: 'Lettmelk 1 %', brands: 'Tine', quantity: '1 l', product_quantity_unit: 'ml', serving_size: '250 ml',
    nutriments: { 'energy-kcal_100g': 38, 'energy-kj_100g': 161, proteins_100g: 3.5, carbohydrates_100g: 4.5, sugars_100g: 4.5, fat_100g: 1, 'saturated-fat_100g': 0.6, salt_100g: 0.1 },
  },
  '7310130006210': {
    code: '7310130006210', product_name: 'Havregryn', brands: 'AXA', quantity: '1 kg', product_quantity_unit: 'g', serving_size: '40 g',
    nutriments: { 'energy-kcal_100g': 370, proteins_100g: 13, carbohydrates_100g: 60, sugars_100g: 1.1, fat_100g: 7, fiber_100g: 10, salt_100g: 0.01 },
  },
}
function off(req, res) {
  const url = new URL(req.url, 'http://x')
  const json = (status, data) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)) }
  if (!/AB-PT/.test(req.headers['user-agent'] ?? '')) return json(403, { feil: 'mangler User-Agent' })
  const m = url.pathname.match(/^\/off\/api\/v2\/product\/(\d+)\.json$/)
  if (m) return OFF_PRODUKTER[m[1]] ? json(200, { status: 1, product: OFF_PRODUKTER[m[1]] }) : json(404, { status: 0, status_verbose: 'product not found' })
  if (url.pathname === '/off/cgi/search.pl') {
    const q = (url.searchParams.get('search_terms') ?? '').toLowerCase()
    if (q === 'feil') return json(503, {})
    return json(200, { products: Object.values(OFF_PRODUKTER).filter(p => p.product_name.toLowerCase().includes(q)) })
  }
  json(404, {})
}

http.createServer((req, res) => {
  if (req.url?.startsWith('/off/')) return off(req, res)
  if (req.url?.startsWith('/auth/v1/user')) {
    const ok = (req.headers.authorization ?? '').includes(GYLDIG)
    res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' })
    return res.end(JSON.stringify(ok ? BRUKER : { msg: 'invalid JWT' }))
  }
  res.writeHead(404, { 'content-type': 'application/json' }); res.end('{}')
}).listen(54399, '127.0.0.1', () => console.log('Falsk Supabase på 127.0.0.1:54399'))
