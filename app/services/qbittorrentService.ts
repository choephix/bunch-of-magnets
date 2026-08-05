import { extractInfoHash, MagnetLink } from '../utils/magnet'

export type TorrentProgress = {
  hash: string
  name: string
  progress: number
  state: string
  dlspeed: number
  eta: number
  size: number
  numSeeds: number
  numPeers: number
  addedOn: number
}

const readJsonOrThrow = async (response: Response): Promise<Record<string, unknown>> => {
  const text = await response.text()
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 160)
    throw new Error(
      snippet
        ? `qBittorrent API returned ${response.status}: ${snippet}`
        : `qBittorrent API returned ${response.status} with an empty body`
    )
  }
}

/** Adds torrents and resolves to the lowercase hex infohashes that were submitted. */
export async function addTorrents(
  magnetLinks: readonly MagnetLink[],
  savePath: string,
  category: string,
  tags: string[],
  downloaderName?: string
): Promise<string[]> {
  try {
    const response = await fetch('/api/qbittorrent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        magnetLinks: magnetLinks.map((link) => link.magnetUrl),
        savePath,
        category,
        tags,
        downloaderName,
      }),
    })

    const data = await readJsonOrThrow(response)

    if (!response.ok || !(data.results as Array<{ success?: boolean }> | undefined)?.[0]?.success) {
      const first = (data.results as Array<{ error?: string }> | undefined)?.[0]
      throw new Error(first?.error || (data.error as string) || 'Failed to add torrents')
    }

    const hashes: string[] = Array.isArray(data.hashes) ? (data.hashes as string[]) : []
    console.log('✅ Added all torrents successfully:', hashes.length, 'hashes')

    return hashes.length
      ? hashes
      : magnetLinks
        .map((link) => extractInfoHash(link.magnetUrl))
        .filter((hash): hash is string => Boolean(hash))
  } catch (error) {
    console.error('❌ Error adding torrents:', error)
    throw error
  }
}

/** Fetches live stats for the given hashes plus, optionally, the N most recently added torrents. */
export async function fetchTorrentProgress(
  hashes: readonly string[],
  downloaderName?: string,
  recentLimit = 0
): Promise<{ torrents: TorrentProgress[]; recent: TorrentProgress[] }> {
  if (!hashes.length && recentLimit <= 0) return { torrents: [], recent: [] }

  const params = new URLSearchParams()
  if (hashes.length) params.set('hashes', hashes.join(','))
  if (downloaderName) params.set('downloaderName', downloaderName)
  if (recentLimit > 0) params.set('recent', String(recentLimit))

  const response = await fetch(`/api/qbittorrent/progress?${params.toString()}`, {
    cache: 'no-store',
  })
  const data = await readJsonOrThrow(response)

  if (!response.ok) {
    throw new Error((data.error as string) || 'Failed to fetch torrent progress')
  }

  return {
    torrents: (data.torrents ?? []) as TorrentProgress[],
    recent: (data.recent ?? []) as TorrentProgress[],
  }
}
