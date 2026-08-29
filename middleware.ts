import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE, isValidSessionToken } from './app/lib/session'

const PUBLIC_PATHS: Record<string, true> = {
  '/login': true,
  '/api/auth/login': true,
  '/api/auth/logout': true,
  '/api/auth/check': true,
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (PUBLIC_PATHS[path]) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value
  if (await isValidSessionToken(token)) {
    return NextResponse.next()
  }

  if (path.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', path)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
