import { DownloaderConfig } from './appConfig'

export const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '')

const REQUEST_TIMEOUT_MS = 8_000
const SESSION_TTL_MS = 5 * 60_000

type CachedSession = {
 cookie: string
 expiresAt: number
}

const sessions = new Map<string, CachedSession>()

const sessionKey = (downloader: DownloaderConfig) =>
 `${downloader.name}|${stripTrailingSlash(downloader.url)}|${downloader.username}`

/** Abortable fetch that fails fast instead of hanging until a gateway 504. */
export async function fetchWithTimeout(
 url: string,
 init: RequestInit = {},
 timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
 const controller = new AbortController()
 const timer = setTimeout(() => controller.abort(), timeoutMs)
 try {
  return await fetch(url, { ...init, signal: controller.signal })
 } catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
   throw new Error(`qBittorrent timed out after ${timeoutMs}ms`)
  }
  throw error
 } finally {
  clearTimeout(timer)
 }
}

/** Pulls `SID=...` (or the first name=value) out of a Set-Cookie header list. */
const extractSessionCookie = (response: Response): string | null => {
 const headers = response.headers as Headers & { getSetCookie?: () => string[] }
 const rawCookies =
  typeof headers.getSetCookie === 'function'
   ? headers.getSetCookie()
   : [headers.get('set-cookie')].filter((value): value is string => Boolean(value))

 for (const raw of rawCookies) {
  const first = raw.split(';')[0]?.trim()
  if (!first) continue
  if (first.toUpperCase().startsWith('SID=')) return first
 }

 const fallback = rawCookies[0]?.split(';')[0]?.trim()
 return fallback || null
}

const loginFresh = async (downloader: DownloaderConfig): Promise<string> => {
 const response = await fetchWithTimeout(
  `${stripTrailingSlash(downloader.url)}/api/v2/auth/login`,
  {
   method: 'POST',
   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
   body: new URLSearchParams({
    username: downloader.username,
    password: downloader.password,
   }),
  }
 )

 if (!response.ok) {
  throw new Error(`Failed to login to qBittorrent (${response.status})`)
 }

 const body = (await response.text()).trim()
 if (body && body.toLowerCase() !== 'ok.') {
  throw new Error(`qBittorrent login rejected: ${body}`)
 }

 const cookie = extractSessionCookie(response)
 if (!cookie) {
  throw new Error('qBittorrent login succeeded but returned no session cookie')
 }

 sessions.set(sessionKey(downloader), {
  cookie,
  expiresAt: Date.now() + SESSION_TTL_MS,
 })

 return cookie
}

/** Authenticates against qBittorrent and returns a reusable SID cookie. */
export async function loginToQbittorrent(downloader: DownloaderConfig): Promise<string> {
 const key = sessionKey(downloader)
 const cached = sessions.get(key)
 if (cached && cached.expiresAt > Date.now()) {
  return cached.cookie
 }

 return loginFresh(downloader)
}

/** Drops a cached SID so the next call re-authenticates. */
export const invalidateQbittorrentSession = (downloader: DownloaderConfig) => {
 sessions.delete(sessionKey(downloader))
}

/**
 * Runs `work` with a cached SID; on 401/403, invalidates and retries once with a fresh login.
 */
export async function withQbittorrentSession<T>(
 downloader: DownloaderConfig,
 work: (cookie: string) => Promise<T>
): Promise<T> {
 const cookie = await loginToQbittorrent(downloader)
 try {
  return await work(cookie)
 } catch (error) {
  const message = error instanceof Error ? error.message : ''
  if (!/\b401\b|\b403\b|unauthorized|forbidden/i.test(message)) throw error
  invalidateQbittorrentSession(downloader)
  const fresh = await loginFresh(downloader)
  return work(fresh)
 }
}
