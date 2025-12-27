import { NextResponse } from 'next/server'
import { getPublicDownloaderList } from '@/app/lib/appConfig'

export async function GET() {
  try {
    const downloaders = getPublicDownloaderList()
    return NextResponse.json({ downloaders })
  } catch (error) {
    console.error('❌ Failed to load config:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load configuration' },
      { status: 500 }
    )
  }
}
