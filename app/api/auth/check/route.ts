import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE, isValidSessionToken } from '@/app/lib/session'

export async function GET() {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value
    const authenticated = await isValidSessionToken(token)
    if (!authenticated) {
      console.log('🔒 User not authenticated')
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    console.log('🔐 User authenticated')
    return NextResponse.json({ authenticated: true })
  } catch (error) {
    console.error('❌ Auth check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
