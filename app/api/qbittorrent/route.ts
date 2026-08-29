import { getDefaultDownloader, getDownloaderByName } from '@/app/lib/appConfig'
import { addTorrentsRequestSchema } from '@/app/lib/contracts'
import { addTorrentsToDownloader, DownloaderNotSupportedError } from '@/app/lib/downloader'
import { unauthorizedIfAnonymous } from '@/app/lib/requireAuth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const unauthorized = await unauthorizedIfAnonymous()
  if (unauthorized) return unauthorized

  try {
    const parsed = addTorrentsRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const { magnetLinks, savePath, category, tags, downloaderName } = parsed.data
    const downloader = downloaderName ? getDownloaderByName(downloaderName) : getDefaultDownloader()

    console.log('📥 Adding torrent(s) with URLs:', magnetLinks.join('\n'))
    console.log('📁 Using save path:', savePath)
    console.log('🏷️ Using category:', category)
    console.log('🏷️ Using tags:', tags)
    console.log('🖥️ Using downloader:', downloader.name)

    const result = await addTorrentsToDownloader(downloader, parsed.data)
    if (!result.ok) {
      console.error('❌ qBittorrent API error:', result.error)
      return NextResponse.json({
        results: [{ success: false, error: result.error || 'qBittorrent rejected request' }],
      })
    }

    return NextResponse.json({
      results: [{ success: true }],
      hashes: result.hashes,
    })
  } catch (error) {
    console.error('❌ API Error:', error)
    if (error instanceof DownloaderNotSupportedError) {
      return NextResponse.json({ error: error.message }, { status: 501 })
    }
    const message = error instanceof Error ? error.message : 'Internal server error'
    const timedOut = /timed out/i.test(message)
    return NextResponse.json({ error: message }, { status: timedOut ? 504 : 500 })
  }
}
