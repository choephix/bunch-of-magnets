export const AUTH_COOKIE = 'auth'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const SESSION_PURPOSE = 'bunch-of-magnets-session-v1'

export function getAppPassword(): string | null {
  const password = process.env.APP_PASSWORD
  if (typeof password !== 'string' || password.length === 0) return null
  return password
}

const bufferToHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return bufferToHex(signature)
}

export function timingSafeEqualString(left: string, right: string): boolean {
  const encoder = new TextEncoder()
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  const max = Math.max(a.length, b.length)
  let mismatch = a.length === b.length ? 0 : 1
  for (let i = 0; i < max; i++) {
    mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return mismatch === 0
}

export async function createSessionToken(password: string): Promise<string> {
  return hmacSha256Hex(password, SESSION_PURPOSE)
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  const password = getAppPassword()
  if (!password || !token) return false
  const expected = await createSessionToken(password)
  return timingSafeEqualString(token, expected)
}

export function passwordsMatch(submitted: string, configured: string): boolean {
  return timingSafeEqualString(submitted, configured)
}
