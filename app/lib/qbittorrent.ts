import { DownloaderConfig } from './appConfig'

export const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '')

/** Authenticates against qBittorrent and returns the session cookie. */
export async function loginToQbittorrent(downloader: DownloaderConfig): Promise<string | null> {
  const response = await fetch(`${stripTrailingSlash(downloader.url)}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: downloader.username,
      password: downloader.password,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to login to qBittorrent')
  }
  return response.headers.get('set-cookie')
}
