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

    const data = await response.json()

    if (!response.ok || !data.results?.[0]?.success) {
      throw new Error(data.results?.[0]?.error || data.error || 'Failed to add torrents')
    }

    const hashes: string[] = Array.isArray(data.hashes) ? data.hashes : []
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
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch torrent progress')
  }

  return {
    torrents: (data.torrents ?? []) as TorrentProgress[],
    recent: (data.recent ?? []) as TorrentProgress[],
  }
}
