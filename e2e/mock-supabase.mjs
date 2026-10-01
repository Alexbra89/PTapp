// Minimal falsk Supabase for E2E-testene. Bare middleware (på serveren) snakker med denne –
// nettleserens kall avlyttes i testene (se hjelpere.ts). Port 54399 for ikke å kollidere
// med en lokal Supabase (54321).
import http from 'node:http'

const GYLDIG = 'e2e.eyJzdWIiOiJ1MSJ9.token'
const BRUKER = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'alex@abpt.no', user_metadata: { full_name: 'Alex Bratland' }, app_metadata: {}, created_at: '2024-01-01T00:00:00Z' }

http.createServer((req, res) => {
  if (req.url?.startsWith('/auth/v1/user')) {
    const ok = (req.headers.authorization ?? '').includes(GYLDIG)
    res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' })
    return res.end(JSON.stringify(ok ? BRUKER : { msg: 'invalid JWT' }))
  }
  res.writeHead(404, { 'content-type': 'application/json' }); res.end('{}')
}).listen(54399, '127.0.0.1', () => console.log('Falsk Supabase på 127.0.0.1:54399'))
