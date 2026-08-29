import { toast } from '../stores/toastStore'
import { MagnetLink } from '../utils/magnet'

/**
 * Pulls the most descriptive message out of an error response: the API returns
 * `{ error, details }`, upstream AI SDK failures can surface `{ error: { message } }`,
 * and proxies may return plain text.
 */
const extractErrorMessage = async (response: Response): Promise<string> => {
  const raw = await response.text()
  const fallback = raw.trim() || `HTTP ${response.status}`

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return fallback
  }
  if (!payload || typeof payload !== 'object') return fallback

  let summary = ''
  if ('error' in payload) {
    const error = payload.error
    if (typeof error === 'string') {
      summary = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      if (typeof error.message === 'string') summary = error.message
    }
  }
  if (!summary && 'message' in payload && typeof payload.message === 'string') {
    summary = payload.message
  }

  const details =
    'details' in payload && typeof payload.details === 'string' ? payload.details : ''

  if (summary && details && !summary.includes(details)) return `${summary} (${details})`
  return summary || details || fallback
}

export async function parseTvShowNames(filenames: string[]): Promise<string[]> {
  const start = performance.now()
  console.log(`📡 [tvShowService] Requesting TV show names for ${filenames.length} filename(s)`)

  let response: Response
  try {
    response = await fetch('/api/parse-tv-shows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filenames }),
    })
  } catch (error) {
    const clientRttMs = performance.now() - start
    console.error(`❌ [tvShowService] Network error after ${clientRttMs.toFixed(0)}ms:`, error)
    toast.error('Network error while parsing TV show name')
    throw error
  }

  const clientRttMs = performance.now() - start

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response)
    console.error(
      `❌ [tvShowService] Server error (${response.status}) in ${clientRttMs.toFixed(0)}ms:`,
      errorMessage
    )
    toast.error(`AI Parsing failed: ${errorMessage}`)
    throw new Error(`AI parsing failed (${response.status}): ${errorMessage}`)
  }

  try {
    const data = await response.json()
    const showNames: string[] = Array.isArray(data.showNames) ? data.showNames : []
    const metrics = data.metrics

    if (metrics) {
      console.log(
        `📺 [tvShowService] Resolved ${filenames.length} name(s) in ${clientRttMs.toFixed(0)}ms client RTT (Server: ${metrics.totalDurationMs}ms, Groq AI: ${metrics.aiDurationMs}ms @ ${metrics.tokensPerSecond ?? 'N/A'} tok/s, cacheHits: ${metrics.cacheHits ?? 0})`
      )
    } else {
      console.log(
        `📺 [tvShowService] Resolved ${filenames.length} name(s) in ${clientRttMs.toFixed(0)}ms`
      )
    }

    return showNames
  } catch (error) {
    console.error(`❌ [tvShowService] Malformed response from /api/parse-tv-shows:`, error)
    toast.error('AI Parsing failed: malformed response from server')
    throw error
  }
}

export async function parseFirstTvShowName(
  magnetLinks: readonly MagnetLink[]
): Promise<string | null> {
  const totalStart = performance.now()
  const filenames = magnetLinks
    .map((link) => link.displayName)
    .filter((name): name is string => Boolean(name) && !name.includes('magnet:?'))

  if (filenames.length === 0) {
    return null
  }

  console.log(
    `🔍 [tvShowService] Searching show name across ${filenames.length} magnet display name(s)...`
  )

  const showNames = await parseTvShowNames(filenames)
  const showName = showNames.find((name) => Boolean(name && name.trim()))
  const elapsed = performance.now() - totalStart

  if (showName) {
    console.log(`✅ [tvShowService] Found show name "${showName}" in ${elapsed.toFixed(0)}ms`)
    return showName
  }

  console.log(
    `⚠️ [tvShowService] No valid show name found across ${filenames.length} name(s) in ${elapsed.toFixed(0)}ms`
  )
  return null
}

export function parseSeasons(magnetLinks: readonly MagnetLink[]): number[] {
  const seasons = new Set<number>()

  magnetLinks.forEach((link) => {
    if (link.displayName) {
      // Match patterns like S01, S1, Season 1, etc.
      const seasonMatch = link.displayName.match(/S(\d{1,2})|Season\s+(\d{1,2})/i)
      if (seasonMatch) {
        const seasonNum = parseInt(seasonMatch[1] || seasonMatch[2], 10)
        if (!isNaN(seasonNum)) {
          seasons.add(seasonNum)
        }
      }
    }
  })

  return Array.from(seasons).sort((a, b) => a - b)
}
