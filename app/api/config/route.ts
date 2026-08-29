import { NextResponse } from 'next/server'
import { getPublicDownloaderList } from '@/app/lib/appConfig'
import { unauthorizedIfAnonymous } from '@/app/lib/requireAuth'

export async function GET() {
  const unauthorized = await unauthorizedIfAnonymous()
  if (unauthorized) return unauthorized

  try {
    const downloaders = getPublicDownloaderList()
    return NextResponse.json({ downloaders })
  } catch (error) {
    console.error('❌ Failed to load config:', error)
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 })
  }
}
