import { NextResponse } from 'next/server'
import {
  AUTH_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getAppPassword,
  passwordsMatch,
} from '@/app/lib/session'

export async function POST(request: Request) {
  try {
    const configured = getAppPassword()
    if (!configured) {
      console.error('❌ APP_PASSWORD is not set')
      return NextResponse.json({ error: 'Server is not configured' }, { status: 500 })
    }

    const body: unknown = await request.json()
    const password =
      body && typeof body === 'object' && 'password' in body && typeof body.password === 'string'
        ? body.password
        : null

    if (!password || !passwordsMatch(password, configured)) {
      console.error('❌ Invalid login attempt')
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(AUTH_COOKIE, await createSessionToken(configured), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })

    console.log('🔐 Successful login')
    return response
  } catch (error) {
    console.error('❌ Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
