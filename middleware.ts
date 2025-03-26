import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /login, /api/...)
  const path = request.nextUrl.pathname

  // Allow access to login page and API routes
  if (path === '/login' || path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('auth')
  const isAuthenticated = authCookie?.value === 'true'

  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', path)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 