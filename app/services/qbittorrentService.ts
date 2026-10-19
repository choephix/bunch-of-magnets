import {
  addTorrentsResponseSchema,
  torrentProgressResponseSchema,
  type TorrentProgress,
} from '@/app/lib/contracts'
import { extractInfoHash, MagnetLink } from '../utils/magnet'

export type { TorrentProgress }

const readJsonOrThrow = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
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

  const data = addTorrentsResponseSchema.parse(await readJsonOrThrow(response))

  const first = data.results?.[0]
  if (!response.ok || !first?.success) {
    throw new Error(first?.error || data.error || `Failed to add torrents (HTTP ${response.status})`)
  }

  const hashes = data.hashes ?? []
  console.log('✅ Added all torrents successfully:', hashes.length, 'hashes')

  return hashes.length
    ? hashes
    : magnetLinks
        .map((link) => extractInfoHash(link.magnetUrl))
        .filter((hash): hash is string => Boolean(hash))
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
  const data = torrentProgressResponseSchema.parse(await readJsonOrThrow(response))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch torrent progress')
  }

  return {
    torrents: data.torrents ?? [],
    recent: data.recent ?? [],
  }
}
