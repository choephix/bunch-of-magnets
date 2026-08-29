import { NextResponse } from 'next/server'
import { AUTH_COOKIE } from '@/app/lib/session'

export async function POST() {
  try {
    const response = NextResponse.json({ success: true })
    response.cookies.set(AUTH_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    console.log('🔒 User logged out')
    return response
  } catch (error) {
    console.error('❌ Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
