export type MagnetLink = {
  magnetUrl: string
  displayName: string
  ignore: boolean
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Decodes a 32-char base32 btih into its 40-char hex form. */
const base32ToHex = (input: string): string | null => {
  let bits = 0
  let value = 0
  let hex = ''

  for (const char of input.toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) return null
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bits -= 8
      hex += ((value >>> bits) & 0xff).toString(16).padStart(2, '0')
    }
  }

  return hex.length === 40 ? hex : null
}

/** Extracts the lowercase hex v1 infohash from a magnet URI, if present. */
export function extractInfoHash(magnetUrl: string): string | null {
  const match = magnetUrl.match(/xt=urn:btih:([a-zA-Z0-9]+)/)
  if (!match) return null

  const raw = match[1]
  if (/^[a-fA-F0-9]{40}$/.test(raw)) return raw.toLowerCase()
  if (raw.length === 32) return base32ToHex(raw)
  return null
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function parseMagnetLinks(text: string): MagnetLink[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('magnet:?'))
    .map((magnetUrl) => {
      const nameMatch = magnetUrl.match(/dn=([^&]+)/)
      const displayName = nameMatch
        ? decodeURIComponent(nameMatch[1])
        : magnetUrl.slice(0, 50) + '...'

      return { magnetUrl, displayName, ignore: false }
    })
}

export function parseTags(displayName: string): string[] {
  const tags: string[] = []

  // Parse group tag from [group] prefix
  const groupMatch = displayName.match(/^\[([^\]]+)\]/)
  if (groupMatch) {
    tags.push(groupMatch[1].toLowerCase())
  }

  // Parse resolution tag (e.g., 1080p, 720p, etc.)
  const resolutionMatch = displayName.match(/[^a-zA-Z0-9](\d+p)[^a-zA-Z0-9]/)
  if (resolutionMatch) {
    tags.push(resolutionMatch[1].toLowerCase())
  }

  console.log('🏷️ Parsed tags for', displayName, ':', tags)
  return tags
}
