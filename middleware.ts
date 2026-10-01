import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { byggCsp } from '@/lib/csp'

export async function middleware(request: NextRequest) {
  // Ny nonce per forespørsel. Next.js leser CSP-en fra forespørselen og setter nonce på
  // sine egne skript; layout leser x-nonce for vårt eget inline-skript.
  const nonce = btoa(crypto.randomUUID())
  const csp = byggCsp(nonce, process.env.NODE_ENV === 'development')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', csp)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // getUser() verifiserer innloggingen mot Supabase. getSession() leser bare informasjonskapselen,
  // som kan være utløpt eller manipulert – Supabase fraråder den for tilgangskontroll på server.
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname
  // Åpne uten innlogging. /nytt-passord er åpen fordi brukeren kommer dit fra e-postlenken
  // før økten er etablert – og skal IKKE sendes videre når den er det (da settes passordet).
  const publicRoutes = ['/login', '/signup', '/glemt-passord', '/nytt-passord']
  const isPublicRoute = publicRoutes.includes(cleanPath)
  const kunForUtlogget = ['/login', '/signup', '/glemt-passord'].includes(cleanPath)

  // Root redirect
  if (cleanPath === '' || pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/login', request.url)
    )
  }

  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', cleanPath)
    return NextResponse.redirect(loginUrl)
  }

  if (user && kunForUtlogget) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icons|manifest|sw|workbox|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|css|js)).*)',
  ],
}