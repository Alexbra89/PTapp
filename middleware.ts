import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl
  const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname
  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.includes(cleanPath)

  // Root redirect
  if (cleanPath === '' || pathname === '/') {
    return NextResponse.redirect(
      new URL(session ? '/dashboard' : '/login', request.url)
    )
  }

  if (!session && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', cleanPath)
    return NextResponse.redirect(loginUrl)
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icons|manifest|sw|workbox|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|css|js)).*)',
  ],
}