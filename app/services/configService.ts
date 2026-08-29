import { publicConfigResponseSchema, type PublicDownloader } from '@/app/lib/contracts'

export type { PublicDownloader }
export type Config = { downloaders: PublicDownloader[] }

export async function fetchConfig(): Promise<Config> {
  console.log('⚙️ Fetching configuration...')
  const response = await fetch('/api/config')

  if (!response.ok) {
    throw new Error('Failed to fetch configuration')
  }

  return publicConfigResponseSchema.parse(await response.json())
}
