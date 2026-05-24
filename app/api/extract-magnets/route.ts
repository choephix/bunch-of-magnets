import { NextResponse } from 'next/server'
import { parseMagnetLinks } from '@/app/utils/magnet'

const TORRENT_PATHS = ['/torrent', '/download']

const FETCH_TIMEOUT_MS = 12_000
const MAX_CONCURRENT_TORRENT_PAGE_FETCHES = 8
const MAX_DEEPER_URLS = 60
const USER_AGENT =
  'Mozilla/5.0 (compatible; BunchOfMagnets/1.0; +https://github.com/choephix/bunch-of-magnets)'

const MAGNET_HREF_REGEX = /href="(magnet:\?xt=urn:btih:[^"]+)"/g
const MAGNET_RAW_REGEX = /magnet:\?xt=urn:btih:[^"\s<>]+/g
const HTTP_URL_REGEX = /https?:\/\/[^\s"'<>]+/g
const HREF_REGEX = /href="([^"]+)"/g

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        ...(init?.headers ?? {}),
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    console.log('🌐 Fetching URL:', url)
    const response = await fetchWithTimeout(url)
    const contentType = response.headers.get('content-type') ?? ''

    let magnetUrls: string[] = []

    if (contentType.includes('application/json')) {
      console.log('📦 Detected JSON response (via Content-Type)')
      const json = (await response.json()) as Json
      magnetUrls = await handleUserJsonUrl(json)
    } else {
      const text = await response.text()
      const trimmed = text.trimStart()
      const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[')
      if (looksLikeJson) {
        try {
          const json = JSON.parse(text) as Json
          console.log('📦 Detected JSON response (via heuristic)')
          magnetUrls = await handleUserJsonUrl(json)
        } catch {
          console.log('📄 Treating response as HTML/text')
          magnetUrls = await handleUserHtmlUrl(url, text)
        }
      } else {
        console.log('📄 Treating response as HTML/text')
        magnetUrls = await handleUserHtmlUrl(url, text)
      }
    }

    const magnetLinks = parseMagnetLinks(magnetUrls.join('\n'))
    console.log('🔍 Found magnet links:', magnetLinks.length)

    return NextResponse.json({ magnetLinks })
  } catch (error) {
    console.error('❌ Error extracting magnet links:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to extract magnet links',
      },
      { status: 500 }
    )
  }
}

function extractMagnetUrlsFromHtml(html: string): string[] {
  const matches = [...html.matchAll(MAGNET_HREF_REGEX)]
  return [...new Set(matches.map((match) => match[1]))]
}

function extractMagnetUrlsFromJson(obj: Json): string[] {
  const magnetUrls: string[] = []
  const traverse = (current: Json) => {
    if (typeof current === 'string') {
      const matches = current.match(MAGNET_RAW_REGEX)
      if (matches) magnetUrls.push(...matches)
    } else if (Array.isArray(current)) {
      current.forEach(traverse)
    } else if (current && typeof current === 'object') {
      Object.values(current).forEach(traverse)
    }
  }
  traverse(obj)
  return [...new Set(magnetUrls)]
}

function extractHttpUrlsFromJson(obj: Json): string[] {
  const httpUrls: string[] = []
  const traverse = (current: Json) => {
    if (typeof current === 'string') {
      const matches = current.match(HTTP_URL_REGEX)
      if (matches) httpUrls.push(...matches)
    } else if (Array.isArray(current)) {
      current.forEach(traverse)
    } else if (current && typeof current === 'object') {
      Object.values(current).forEach(traverse)
    }
  }
  traverse(obj)
  return [...new Set(httpUrls)]
}

async function handleUserJsonUrl(json: Json): Promise<string[]> {
  console.log('📦 Processing JSON response')
  let magnetUrls = extractMagnetUrlsFromJson(json)

  if (magnetUrls.length === 0) {
    console.log('🔍 No direct magnet links found in JSON, searching HTTP URLs...')
    const httpUrls = extractHttpUrlsFromJson(json)
    console.log('🔗 Found HTTP URLs:', httpUrls.length)
    magnetUrls = await extractMagnetLinksFromAllHtmlUrls(httpUrls)
  }
  return magnetUrls
}

async function handleUserHtmlUrl(url: string, html: string): Promise<string[]> {
  let magnetUrls = extractMagnetUrlsFromHtml(html)
  if (magnetUrls.length === 0) {
    console.log('🔍 No direct magnet links found, performing deeper search...')
    magnetUrls = await performDeeperSearchOnHTML(url, html)
  }
  return magnetUrls
}

async function performDeeperSearchOnHTML(originalUrl: string, html: string): Promise<string[]> {
  const originalUrlObj = new URL(originalUrl)
  const baseUrl = `${originalUrlObj.protocol}//${originalUrlObj.host}`

  const hrefMatches = [...html.matchAll(HREF_REGEX)]
  const allUrls = hrefMatches.map((match) => match[1])

  return extractMagnetLinksFromAllHtmlUrls(allUrls, baseUrl, originalUrlObj.host)
}

async function extractMagnetLinksFromAllHtmlUrls(
  urls: string[],
  baseUrl?: string,
  originalHost?: string
): Promise<string[]> {
  const torrentUrls = urls
    .map((href) => {
      try {
        const absoluteUrl = baseUrl ? new URL(href, baseUrl) : new URL(href)
        return absoluteUrl.toString()
      } catch {
        return null
      }
    })
    .filter((url): url is string => {
      if (!url) return false
      try {
        const urlObj = new URL(url)
        return (
          !originalHost ||
          (urlObj.host === originalHost &&
            TORRENT_PATHS.some((path) => urlObj.pathname.startsWith(path)))
        )
      } catch {
        return false
      }
    })

  // Deduplicate and cap to avoid spamming origins.
  const uniqueTorrentUrls = [...new Set(torrentUrls)].slice(0, MAX_DEEPER_URLS)
  console.log('🔗 Found potential torrent pages:', uniqueTorrentUrls.length)

  const fetchPage = async (url: string): Promise<string | null> => {
    try {
      console.log('📥 Fetching torrent page:', url)
      const response = await fetchWithTimeout(url)
      const pageHtml = await response.text()
      const magnets = extractMagnetUrlsFromHtml(pageHtml)
      if (magnets.length > 1) {
        console.warn('⚠️ Multiple magnet links found on page:', url, magnets.length)
      }
      return magnets[0] ?? null
    } catch (error) {
      console.error('❌ Error fetching torrent page:', url, error)
      return null
    }
  }

  const results = await mapWithConcurrency(
    uniqueTorrentUrls,
    fetchPage,
    MAX_CONCURRENT_TORRENT_PAGE_FETCHES
  )
  return results.filter((magnet): magnet is string => magnet !== null)
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++
      if (idx >= items.length) return
      results[idx] = await worker(items[idx])
    }
  })
  await Promise.all(runners)
  return results
}
