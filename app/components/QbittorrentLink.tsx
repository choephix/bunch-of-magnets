import { useSnapshot } from 'valtio'
import { configStore, getActiveDownloader } from '../stores/configStore'
import { settingsStore } from '../stores/settingsStore'

export const QbittorrentLink = () => {
  useSnapshot(configStore)
  useSnapshot(settingsStore) // getActiveDownloader depends on selectedDownloader
  const activeDownloader = getActiveDownloader()

  if (!activeDownloader) return null

  return (
    <div className="mt-4 text-center">
      <a
        href={activeDownloader.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-400 hover:text-blue-400 transition-colors"
      >
        Open {activeDownloader.name} →
      </a>
    </div>
  )
}
