import { getDefaultDownloader, getDownloaderByName } from '@/app/lib/appConfig'
import {
  fetchWithTimeout,
  stripTrailingSlash,
  withQbittorrentSession,
} from '@/app/lib/qbittorrent'
import { extractInfoHash } from '@/app/utils/magnet'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { magnetLinks, savePath, category, tags, downloaderName } = await request.json()

    if (!Array.isArray(magnetLinks) || !savePath) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const downloader = downloaderName ? getDownloaderByName(downloaderName) : getDefaultDownloader()

    if (downloader.type === 'transmission') {
      return NextResponse.json(
        { error: 'Transmission support not implemented yet' },
        { status: 501 }
      )
    }

    const allMagnetLinks = magnetLinks.join('\n')
    console.log('📥 Adding torrent(s) with URLs:', allMagnetLinks)
    console.log('📁 Using save path:', savePath)
    console.log('🏷️ Using category:', category)
    console.log('🏷️ Using tags:', tags)
    console.log('🖥️ Using downloader:', downloader.name)

    const bodyDict: Record<string, string> = {
      urls: allMagnetLinks,
      savepath: savePath,
      autoTMM: 'false',
      tags: Array.isArray(tags) ? tags.join(',') : '',
    }
    if (typeof category === 'string' && category.length > 0) {
      bodyDict.category = category
    }

    const addBase = stripTrailingSlash(downloader.url)

    const addResult = await withQbittorrentSession(downloader, async (cookie) => {
      const headers = {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      }

      const addTorrents = async (params: Record<string, string>) => {
        const body = new URLSearchParams(params)
        console.log('🔍 Body:', body.toString())

        const response = await fetchWithTimeout(`${addBase}/api/v2/torrents/add`, {
          method: 'POST',
          headers,
          body,
        })

        return {
          ok: response.ok,
          status: response.status,
          text: await response.text(),
        }
      }

      let result = await addTorrents(bodyDict)

      if (!result.ok || result.text.startsWith('Fail')) {
        if (bodyDict.category) {
          console.warn(
            '⚠️ qBittorrent rejected category, retrying without category:',
            bodyDict.category
          )
          const { category: _, ...bodyWithoutCategory } = bodyDict
          result = await addTorrents(bodyWithoutCategory)
        }
      }

      if (result.status === 401 || result.status === 403) {
        throw new Error(`qBittorrent returned ${result.status}`)
      }

      return result
    })

    if (!addResult.ok || addResult.text.startsWith('Fail')) {
      console.error('❌ qBittorrent API error:', addResult.text)
      return NextResponse.json({
        results: [{ success: false, error: addResult.text || 'qBittorrent rejected request' }],
      })
    }

    return NextResponse.json({
      results: [{ success: true, data: addResult.text }],
      hashes: magnetLinks
        .map((url: string) => extractInfoHash(url))
        .filter((hash: string | null): hash is string => Boolean(hash)),
    })
  } catch (error) {
    console.error('❌ API Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const timedOut = /timed out/i.test(message)
    return NextResponse.json({ error: message }, { status: timedOut ? 504 : 500 })
  }
}
