// Content-Security-Policy for appen. Settes i middleware med en ny nonce per forespørsel:
// bare skript med riktig nonce (Next.js sine egne og våre) får kjøre – et injisert
// <script> eller onclick="…" blokkeres. Stiler må tillate inline (sidene bruker <style>-blokker
// og style-attributter), men det gir ikke kjøring av kode.

export function byggCsp(nonce: string, utvikling = false, https = true): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseWs = supabase.replace(/^http/, 'ws')
  const regler: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'strict-dynamic': skript som lastes av et godkjent skript (Next sine chunks) er også godkjent
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(utvikling ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'blob:'],
    'connect-src': ["'self'", supabase, supabaseWs, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'].filter(Boolean),
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  const deler = Object.entries(regler).map(([k, v]) => `${k} ${v.join(' ')}`)
  // Bare over HTTPS (alltid på Vercel). Lokalt over http ville nettleseren skrevet om
  // omdirigeringer til https://localhost, som ikke finnes.
  if (!utvikling && https) deler.push('upgrade-insecure-requests')
  return deler.join('; ')
}
