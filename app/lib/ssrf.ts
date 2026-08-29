import { isIP } from 'node:net'
import { lookup as dnsLookup } from 'node:dns/promises'

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

export type ResolveAddresses = (hostname: string) => Promise<string[]>

const BLOCKED_HOSTNAMES: Record<string, true> = {
  localhost: true,
  'metadata.google.internal': true,
}

const defaultResolve: ResolveAddresses = async (hostname) => {
  const records = await dnsLookup(hostname, { all: true, verbatim: true })
  return records.map((record) => record.address)
}

export function isPrivateIp(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped?.[1]) return isPrivateIpv4(mapped[1])
  if (ip.includes(':')) return isPrivateIpv6(ip)
  return isPrivateIpv4(ip)
}

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true
  }
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a >= 224) return true
  return false
}

const isPrivateIpv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase()
  if (normalized === '::' || normalized === '::1') return true
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true
  }
  return normalized.startsWith('fc') || normalized.startsWith('fd')
}

export async function assertPublicHttpUrl(
  raw: string,
  resolve: ResolveAddresses = defaultResolve
): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeUrlError('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https URLs are allowed')
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs with credentials are not allowed')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    !hostname ||
    BLOCKED_HOSTNAMES[hostname] ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    throw new UnsafeUrlError('URL hostname is not allowed')
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new UnsafeUrlError('Private IP addresses are not allowed')
    }
    return url
  }

  const addresses = await resolve(hostname)
  if (!addresses.length) {
    throw new UnsafeUrlError('Could not resolve hostname')
  }
  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new UnsafeUrlError('Hostname resolves to a private IP address')
    }
  }

  return url
}

export const MAX_RESPONSE_BYTES = 2_000_000
export const MAX_REDIRECTS = 4

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

async function readCappedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    throw new UnsafeUrlError('Response too large')
  }
  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      received += value.byteLength
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        throw new UnsafeUrlError('Response too large')
      }
      chunks.push(value)
    }
  }
  return new TextDecoder().decode(concatBytes(chunks))
}

export async function fetchPublicHttpText(
  rawUrl: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
  resolve: ResolveAddresses = defaultResolve
): Promise<{ url: string; contentType: string; text: string }> {
  let current = (await assertPublicHttpUrl(rawUrl, resolve)).toString()

  for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(current, {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
          ...(init.headers ?? {}),
        },
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) {
          throw new UnsafeUrlError('Redirect missing Location header')
        }
        const next = new URL(location, current).toString()
        current = (await assertPublicHttpUrl(next, resolve)).toString()
        continue
      }

      const text = await readCappedText(response)
      return {
        url: current,
        contentType: response.headers.get('content-type') ?? '',
        text,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  throw new UnsafeUrlError('Too many redirects')
}
