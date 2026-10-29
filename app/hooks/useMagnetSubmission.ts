import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { MagnetLink, extractInfoHash, parseTags } from '../utils/magnet'
import { addTorrents } from '../services/qbittorrentService'
import { appStateActions, appStateStore } from '../stores/appStateStore'
import { configStore, getActiveDownloader } from '../stores/configStore'
import { settingsStore } from '../stores/settingsStore'
import { deriveCategory } from '../utils/savePath'
import { trackAddedTorrents } from '../utils/trackedTorrents'

interface UseMagnetSubmissionResult {
  isLoading: boolean
  status: { type: 'success' | 'error'; message: string } | null
  trackedHashes: readonly string[]
  downloaderName: string | undefined
  submitMagnetLinks: (magnetLinks: MagnetLink[], savePath: string) => Promise<boolean>
}

export const useMagnetSubmission = (): UseMagnetSubmissionResult => {
  useSnapshot(configStore)
  useSnapshot(settingsStore)

  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [trackedByDownloader, setTrackedByDownloader] = useState<
    ReadonlyMap<string, readonly string[]>
  >(() => new Map())
  const downloaderName = getActiveDownloader()?.name
  const trackedHashes = (downloaderName && trackedByDownloader.get(downloaderName)) || []

  const submitMagnetLinks = async (magnetLinks: MagnetLink[], savePath: string) => {
    setIsLoading(true)
    setStatus(null)

    try {
      console.log('🚀 Starting to add torrents:', magnetLinks.length)
      const selectedLinks = magnetLinks.filter((link) => !link.ignore)
      const activeDownloader = getActiveDownloader()
      if (!activeDownloader) throw new Error('No downloader configured')

      const allTags = selectedLinks
        .flatMap((link) => parseTags(link.displayName))
        .filter((tag, index, arr) => arr.indexOf(tag) === index)

      const category = deriveCategory(appStateStore.savePathSelection)

      const addedHashes = await addTorrents(
        selectedLinks,
        savePath,
        category,
        allTags,
        activeDownloader.name
      )

      const hashes =
        addedHashes.length > 0
          ? addedHashes
          : selectedLinks
              .map((link) => extractInfoHash(link.magnetUrl))
              .filter((hash): hash is string => Boolean(hash))

      setTrackedByDownloader((tracked) =>
        trackAddedTorrents(tracked, activeDownloader.name, hashes)
      )
      appStateActions.clearMagnetLinks()
      return true
    } catch (error) {
      console.error('❌ Error:', error)
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to add torrents',
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, status, trackedHashes, downloaderName, submitMagnetLinks }
}
