import { MagnetLink } from '../utils/magnet'

export async function parseTvShowName(displayName: string): Promise<string> {
  const start = performance.now()
  console.log(`📡 [tvShowService] Requesting TV show name for: "${displayName}"`)
  try {
    const response = await fetch('/api/parse-tv-shows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filenames: [displayName],
      }),
    })

    const clientRttMs = performance.now() - start

    if (!response.ok) {
      const errText = await response.text()
      console.error(`❌ [tvShowService] Server error (${response.status}) in ${clientRttMs.toFixed(0)}ms:`, errText)
      throw new Error('Failed to parse TV show name')
    }

    const data = await response.json()
    const showName = data.showNames?.[0] ?? ''
    const metrics = data.metrics

    if (metrics) {
      console.log(
        `📺 [tvShowService] Resolved "${displayName}" -> "${showName}" in ${clientRttMs.toFixed(0)}ms client RTT (Server: ${metrics.totalDurationMs}ms, Groq AI: ${metrics.aiDurationMs}ms @ ${metrics.tokensPerSecond ?? 'N/A'} tok/s, Cache: ${metrics.cacheDurationMs}ms ${metrics.cacheHits > 0 ? 'HIT' : 'MISS'})`
      )
    } else {
      console.log(`📺 [tvShowService] Resolved "${displayName}" -> "${showName}" in ${clientRttMs.toFixed(0)}ms`)
    }

    return showName
  } catch (error) {
    const clientRttMs = performance.now() - start
    console.error(`❌ [tvShowService] Error parsing TV show name after ${clientRttMs.toFixed(0)}ms:`, error)
    throw error
  }
}

const isValidMagnetDisplayName = (displayName: string | undefined): boolean => {
  return !!displayName && !displayName.includes('magnet:?')
}

export async function parseFirstTvShowName(
  magnetLinks: readonly MagnetLink[]
): Promise<string | null> {
  const totalStart = performance.now()
  console.log(`🔍 [tvShowService] Searching show name across ${magnetLinks.length} magnet link(s)...`)

  for (let i = 0; i < magnetLinks.length; i++) {
    const link = magnetLinks[i]
    if (!link.displayName || link.displayName.includes('magnet:?')) {
      continue
    }

    try {
      const showName = await parseTvShowName(link.displayName)
      if (showName) {
        const elapsed = performance.now() - totalStart
        console.log(`✅ [tvShowService] Found show name "${showName}" on link #${i + 1} in ${elapsed.toFixed(0)}ms`)
        return showName
      }
    } catch (error) {
      console.warn(`⚠️ [tvShowService] Failed link #${i + 1} ("${link.displayName}"), trying next...`, error)
      continue
    }
  }

  const elapsed = performance.now() - totalStart
  console.log(`⚠️ [tvShowService] No valid show name found across ${magnetLinks.length} link(s) in ${elapsed.toFixed(0)}ms`)
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
