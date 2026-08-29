import 'server-only'
import {
  parseAppConfigJson,
  toPublicDownloader,
  type AppConfig,
  type DownloaderConfig,
  type PublicDownloader,
} from './contracts'

export type { AppConfig, DownloaderConfig, PublicDownloader }

let cachedConfig: AppConfig | null = null

export function loadAppConfig(): AppConfig {
  if (cachedConfig) return cachedConfig

  const base64 = process.env.APP_CONFIG_BASE64
  if (!base64) {
    throw new Error('Missing APP_CONFIG_BASE64 env var')
  }

  const decoded = Buffer.from(base64, 'base64').toString('utf8')
  cachedConfig = parseAppConfigJson(decoded)
  console.log(`🔧 Loaded ${cachedConfig.downloaders.length} downloader(s) from config`)
  return cachedConfig
}

export function getDownloaderByName(name: string): DownloaderConfig {
  const config = loadAppConfig()
  const downloader = config.downloaders.find((item) => item.name === name)
  if (!downloader) {
    throw new Error(`Downloader "${name}" not found in config`)
  }
  return downloader
}

export function getDefaultDownloader(): DownloaderConfig {
  return loadAppConfig().downloaders[0]
}

export function getPublicDownloaderList(): PublicDownloader[] {
  return loadAppConfig().downloaders.map(toPublicDownloader)
}
