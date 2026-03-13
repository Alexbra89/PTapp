import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname
  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.includes(cleanPath)

  // ── Les session fra cookie synkront — ingen async auth-kall ───────────────
  const hasSession = request.cookies.getAll()
    .some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  // Root redirect
  if (cleanPath === '' || pathname === '/') {
    return NextResponse.redirect(
      new URL(hasSession ? '/dashboard' : '/login', request.url)
    )
  }

  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', cleanPath)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next({ request: { headers: request.headers } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icons|manifest|sw|workbox|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|css|js)).*)',
  ],
}