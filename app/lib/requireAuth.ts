import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE, isValidSessionToken } from './session'

export async function unauthorizedIfAnonymous(): Promise<NextResponse | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value
  if (await isValidSessionToken(token)) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
