import { getDefaultDownloader, getDownloaderByName } from '@/app/lib/appConfig'
import { getDownloaderProgress, DownloaderNotSupportedError } from '@/app/lib/downloader'
import { unauthorizedIfAnonymous } from '@/app/lib/requireAuth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const unauthorized = await unauthorizedIfAnonymous()
  if (unauthorized) return unauthorized

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
    const { torrents, recent } = await getDownloaderProgress(downloader, hashes, recentLimit)
    return NextResponse.json({ torrents, recent })
  } catch (error) {
    console.error('❌ Error fetching torrent progress:', error)
    if (error instanceof DownloaderNotSupportedError) {
      return NextResponse.json({ error: error.message }, { status: 501 })
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch progress'
    const timedOut = /timed out/i.test(message)
    return NextResponse.json({ error: message }, { status: timedOut ? 504 : 500 })
  }
}
