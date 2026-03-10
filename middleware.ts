import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Hopp over prefetch og statiske filer raskt ─────────────────────────────
  const isPrefetch = request.headers.get('next-router-prefetch') === '1'
    || request.headers.get('purpose') === 'prefetch'
    || request.headers.get('x-nextjs-data') !== null

  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // For prefetch av offentlige ruter – svar umiddelbart uten auth-sjekk
  if (isPrefetch && isPublicRoute) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // ── Auth-logikk ────────────────────────────────────────────────────────────
  if (!session && !isPublicRoute) {
    // Ikke innlogget → redirect til login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && isPublicRoute) {
    // Allerede innlogget → send til ROT (/)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // VIKTIG: IKKE redirect root-path! La det gå videre.
  // (pathname === '/') skal bare fortsette uten redirect

  // Sett cache-headers for raskere navigasjon
  response.headers.set('x-middleware-cache', 'no-cache')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icons|manifest|sw|workbox|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|css|js)).*)',
  ],
}