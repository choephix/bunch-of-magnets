import { z } from 'zod'

export const downloaderTypeSchema = z.enum(['qbittorrent', 'transmission'])

export const publicDownloaderSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  type: downloaderTypeSchema,
  basePath: z.string().min(1),
  librarySuggestions: z.record(z.boolean()),
})

export const downloaderConfigSchema = publicDownloaderSchema.extend({
  username: z.string(),
  password: z.string(),
})

export const appConfigSchema = z.object({
  downloaders: z.array(downloaderConfigSchema).min(1),
})

export const torrentProgressSchema = z.object({
  hash: z.string(),
  name: z.string(),
  progress: z.number(),
  state: z.string(),
  dlspeed: z.number(),
  eta: z.number(),
  size: z.number(),
  numSeeds: z.number(),
  numPeers: z.number(),
  addedOn: z.number(),
})

export const addTorrentsRequestSchema = z.object({
  magnetLinks: z.array(z.string()),
  savePath: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  downloaderName: z.string().optional(),
})

export const addTorrentsResponseSchema = z.object({
  results: z.array(
    z.object({
      success: z.boolean().optional(),
      error: z.string().optional(),
      data: z.unknown().optional(),
    })
  ),
  hashes: z.array(z.string()).optional(),
  error: z.string().optional(),
})

export const torrentProgressResponseSchema = z.object({
  torrents: z.array(torrentProgressSchema).optional(),
  recent: z.array(torrentProgressSchema).optional(),
  error: z.string().optional(),
})

export const publicConfigResponseSchema = z.object({
  downloaders: z.array(publicDownloaderSchema),
})

export type DownloaderType = z.infer<typeof downloaderTypeSchema>
export type PublicDownloader = z.infer<typeof publicDownloaderSchema>
export type DownloaderConfig = z.infer<typeof downloaderConfigSchema>
export type AppConfig = z.infer<typeof appConfigSchema>
export type TorrentProgress = z.infer<typeof torrentProgressSchema>
export type AddTorrentsRequest = z.infer<typeof addTorrentsRequestSchema>

const looksLikeHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseAppConfigJson(raw: string): AppConfig {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Downloader config is not valid JSON')
  }

  const result = appConfigSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error('Downloader config failed validation')
  }

  for (const downloader of result.data.downloaders) {
    if (!looksLikeHttpUrl(downloader.url)) {
      throw new Error(`Downloader "${downloader.name}" has an invalid url`)
    }
  }

  return result.data
}

export function toPublicDownloader(downloader: DownloaderConfig): PublicDownloader {
  return publicDownloaderSchema.parse({
    name: downloader.name,
    url: downloader.url,
    type: downloader.type,
    basePath: downloader.basePath,
    librarySuggestions: downloader.librarySuggestions,
  })
}
