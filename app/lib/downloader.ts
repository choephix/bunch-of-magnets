import 'server-only'

import { extractInfoHash } from '@/app/utils/magnet'
import type { DownloaderConfig } from './appConfig'
import type { AddTorrentsRequest, TorrentProgress } from './contracts'
import {
  fetchWithTimeout,
  stripTrailingSlash,
  withQbittorrentSession,
} from './qbittorrent'

export class DownloaderNotSupportedError extends Error {
  readonly status = 501

  constructor(type: string) {
    super(`${type} support not implemented yet`)
    this.name = 'DownloaderNotSupportedError'
  }
}

export type AddTorrentsResult = {
  ok: boolean
  error?: string
  hashes: string[]
}

export type DownloaderProgressResult = {
  torrents: TorrentProgress[]
  recent: TorrentProgress[]
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

const hashesFromMagnets = (magnetLinks: string[]): string[] =>
  magnetLinks
    .map((url) => extractInfoHash(url))
    .filter((hash): hash is string => Boolean(hash))

async function addToQbittorrent(
  downloader: DownloaderConfig,
  input: AddTorrentsRequest
): Promise<AddTorrentsResult> {
  const bodyDict: Record<string, string> = {
    urls: input.magnetLinks.join('\n'),
    savepath: input.savePath,
    autoTMM: 'false',
    tags: Array.isArray(input.tags) ? input.tags.join(',') : '',
  }
  if (typeof input.category === 'string' && input.category.length > 0) {
    bodyDict.category = input.category
  }

  const addBase = stripTrailingSlash(downloader.url)

  const addResult = await withQbittorrentSession(downloader, async (cookie) => {
    const headers = {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    const postAdd = async (params: Record<string, string>) => {
      const response = await fetchWithTimeout(`${addBase}/api/v2/torrents/add`, {
        method: 'POST',
        headers,
        body: new URLSearchParams(params),
      })
      return {
        ok: response.ok,
        status: response.status,
        text: await response.text(),
      }
    }

    let result = await postAdd(bodyDict)

    if ((!result.ok || result.text.startsWith('Fail')) && bodyDict.category) {
      console.warn(
        '⚠️ qBittorrent rejected category, retrying without category:',
        bodyDict.category
      )
      const { category: _, ...bodyWithoutCategory } = bodyDict
      result = await postAdd(bodyWithoutCategory)
    }

    if (result.status === 401 || result.status === 403) {
      throw new Error(`qBittorrent returned ${result.status}`)
    }

    return result
  })

  if (!addResult.ok || addResult.text.startsWith('Fail')) {
    return {
      ok: false,
      error: addResult.text || 'qBittorrent rejected request',
      hashes: [],
    }
  }

  return {
    ok: true,
    hashes: hashesFromMagnets(input.magnetLinks),
  }
}

async function progressFromQbittorrent(
  downloader: DownloaderConfig,
  hashes: string[],
  recentLimit: number
): Promise<DownloaderProgressResult> {
  const base = stripTrailingSlash(downloader.url)

  return withQbittorrentSession(downloader, async (cookie) => {
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

    const [torrents, recent] = await Promise.all([
      hashes.length ? fetchInfo(`hashes=${hashes.join('|')}`) : Promise.resolve([]),
      recentLimit > 0
        ? fetchInfo(`sort=added_on&reverse=true&limit=${Math.min(recentLimit, 50)}`)
        : Promise.resolve([]),
    ])

    return { torrents, recent }
  })
}

export async function addTorrentsToDownloader(
  downloader: DownloaderConfig,
  input: AddTorrentsRequest
): Promise<AddTorrentsResult> {
  if (downloader.type !== 'qbittorrent') {
    throw new DownloaderNotSupportedError(downloader.type)
  }
  return addToQbittorrent(downloader, input)
}

export async function getDownloaderProgress(
  downloader: DownloaderConfig,
  hashes: string[],
  recentLimit: number
): Promise<DownloaderProgressResult> {
  if (downloader.type !== 'qbittorrent') {
    throw new DownloaderNotSupportedError(downloader.type)
  }
  return progressFromQbittorrent(downloader, hashes, recentLimit)
}
