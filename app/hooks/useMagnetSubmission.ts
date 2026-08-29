import { useState } from 'react'
import { MagnetLink, extractInfoHash, parseTags } from '../utils/magnet'
import { addTorrents } from '../services/qbittorrentService'
import { appStateActions, appStateStore } from '../stores/appStateStore'
import { getActiveDownloader } from '../stores/configStore'
import { deriveCategory } from '../utils/savePath'

interface UseMagnetSubmissionResult {
  isLoading: boolean
  status: { type: 'success' | 'error'; message: string } | null
  trackedHashes: string[]
  downloaderName: string | undefined
  submitMagnetLinks: (magnetLinks: MagnetLink[], savePath: string) => Promise<boolean>
}

export const useMagnetSubmission = (): UseMagnetSubmissionResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [trackedHashes, setTrackedHashes] = useState<string[]>([])
  const [downloaderName, setDownloaderName] = useState<string | undefined>(undefined)

  const submitMagnetLinks = async (magnetLinks: MagnetLink[], savePath: string) => {
    setIsLoading(true)
    setStatus(null)
    setTrackedHashes([])

    try {
      console.log('🚀 Starting to add torrents:', magnetLinks.length)
      const selectedLinks = magnetLinks.filter((link) => !link.ignore)
      const activeDownloader = getActiveDownloader()

      const allTags = selectedLinks
        .flatMap((link) => parseTags(link.displayName))
        .filter((tag, index, arr) => arr.indexOf(tag) === index)

      const category = deriveCategory(appStateStore.savePathSelection)

      const addedHashes = await addTorrents(
        selectedLinks,
        savePath,
        category,
        allTags,
        activeDownloader?.name
      )

      const hashes =
        addedHashes.length > 0
          ? addedHashes
          : selectedLinks
              .map((link) => extractInfoHash(link.magnetUrl))
              .filter((hash): hash is string => Boolean(hash))

      setTrackedHashes(hashes)
      setDownloaderName(activeDownloader?.name)
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
