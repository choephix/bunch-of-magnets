import { getDefaultDownloader, getDownloaderByName } from '@/app/lib/appConfig'
import { NextResponse } from 'next/server'

async function loginToQbittorrent(url: string, username: string, password: string) {
  const response = await fetch(`${url}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
  })
  if (!response.ok) {
    throw new Error('Failed to login to qBittorrent')
  }
  return response.headers.get('set-cookie')
}

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

    const cookie = await loginToQbittorrent(
      downloader.url,
      downloader.username,
      downloader.password
    )
    if (!cookie) {
      return NextResponse.json(
        { error: 'Failed to authenticate with qBittorrent' },
        { status: 401 }
      )
    }

    const allMagnetLinks = magnetLinks.join('\n')
    console.log('📥 Adding torrent(s) with URLs:', allMagnetLinks)
    console.log('📁 Using save path:', savePath)
    console.log('🏷️ Using category:', category)
    console.log('🏷️ Using tags:', tags)
    console.log('🖥️ Using downloader:', downloader.name)

    const headers = {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    const bodyDict = {
      urls: allMagnetLinks,
      savepath: savePath,
      category: category,
      autoTMM: 'false',
      tags: Array.isArray(tags) ? tags.join(',') : '',
    }
    const addTorrents = async (params: Record<string, string>) => {
      const body = new URLSearchParams(params)
      console.log('🔍 Body:', body.toString())

      const response = await fetch(`${downloader.url}/api/v2/torrents/add`, {
        method: 'POST',
        headers: headers,
        body: body,
      })

      return {
        ok: response.ok,
        text: await response.text(),
      }
    }

    let addResult = await addTorrents(bodyDict)

    if (!addResult.ok || addResult.text.startsWith('Fail')) {
      if (category) {
        console.warn('⚠️ qBittorrent rejected category, retrying without category:', category)
        const { category: _, ...bodyWithoutCategory } = bodyDict
        addResult = await addTorrents(bodyWithoutCategory)
      }

      if (!addResult.ok || addResult.text.startsWith('Fail')) {
        console.error('❌ qBittorrent API error:', addResult.text)
        return NextResponse.json({
          results: [{ success: false, error: addResult.text || 'qBittorrent rejected request' }],
        })
      }
    }

    return NextResponse.json({
      results: [{ success: true, data: addResult.text }],
    })
  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
