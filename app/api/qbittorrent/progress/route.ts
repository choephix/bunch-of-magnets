import { getDefaultDownloader, getDownloaderByName } from '@/app/lib/appConfig'
import {
  fetchWithTimeout,
  stripTrailingSlash,
  withQbittorrentSession,
} from '@/app/lib/qbittorrent'
import { NextResponse } from 'next/server'

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

const toTorrentProgress = (torrent: Record<string, unknown>): TorrentProgress => ({
  hash: String(torrent.hash ?? ''),
  name: String(torrent.name ?? ''),
  progress: Number(torrent.progress ?? 0),
  state: String(torrent.state ?? 'unknown'),
  dlspeed: Number(torrent.dlspeed ?? 0),
  eta: Number(torrent.eta ?? 0),
  size: Number(torrent.size ?? 0),
  numSeeds: Number(torrent.num_seeds ?? 0),
  numPeers: Number(torrent.num_leechs ?? 0),
  addedOn: Number(torrent.added_on ?? 0),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hashes = (searchParams.get('hashes') ?? '')
      .split(',')
      .map((hash) => hash.trim().toLowerCase())
      .filter(Boolean)
    const downloaderName = searchParams.get('downloaderName')
    const recentLimit = Number(searchParams.get('recent') ?? 0)

    if (!hashes.length && recentLimit <= 0) {
      return NextResponse.json({ torrents: [], recent: [] })
    }

    const downloader = downloaderName ? getDownloaderByName(downloaderName) : getDefaultDownloader()

    if (downloader.type === 'transmission') {
      return NextResponse.json(
        { error: 'Transmission support not implemented yet' },
        { status: 501 }
      )
    }

    const base = stripTrailingSlash(downloader.url)

    const { torrents, recent } = await withQbittorrentSession(downloader, async (cookie) => {
      const fetchInfo = async (query: string): Promise<TorrentProgress[]> => {
        const response = await fetchWithTimeout(`${base}/api/v2/torrents/info?${query}`, {
          headers: { Cookie: cookie },
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`qBittorrent returned ${response.status}`)
        }
        const raw = (await response.json()) as Array<Record<string, unknown>>
        return raw.map(toTorrentProgress)
      }

      const [tracked, recentList] = await Promise.all([
        hashes.length ? fetchInfo(`hashes=${hashes.join('|')}`) : Promise.resolve([]),
        recentLimit > 0
          ? fetchInfo(`sort=added_on&reverse=true&limit=${Math.min(recentLimit, 50)}`)
          : Promise.resolve([]),
      ])

      return { torrents: tracked, recent: recentList }
    })

    return NextResponse.json({ torrents, recent })
  } catch (error) {
    console.error('❌ Error fetching torrent progress:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch progress'
    const timedOut = /timed out/i.test(message)
    return NextResponse.json({ error: message }, { status: timedOut ? 504 : 500 })
  }
}
