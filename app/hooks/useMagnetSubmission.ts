import { useState } from 'react'
import { MagnetLink, parseTags } from '../utils/magnet'
import { addTorrents } from '../services/qbittorrentService'
import { appStateActions, appStateStore } from '../stores/appStateStore'
import { getActiveDownloader } from '../stores/configStore'

const deriveCategory = (savePath: string, basePath: string): string => {
  let relativePath = savePath
  if (basePath && savePath.startsWith(basePath)) {
    relativePath = savePath.slice(basePath.length)
  }
  const segments = relativePath.split('/').filter(Boolean)
  const firstMeaningful = segments.find((s) => s !== '_')
  return firstMeaningful || ''
}

interface UseMagnetSubmissionResult {
  isLoading: boolean
  status: { type: 'success' | 'error'; message: string } | null
  submitMagnetLinks: (magnetLinks: MagnetLink[], savePath: string) => Promise<void>
}

export const useMagnetSubmission = (): UseMagnetSubmissionResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const submitMagnetLinks = async (magnetLinks: MagnetLink[], savePath: string) => {
    setIsLoading(true)
    setStatus(null)

    try {
      console.log('🚀 Starting to add torrents:', magnetLinks.length)
      const selectedLinks = magnetLinks.filter((link) => !link.ignore)
      const activeDownloader = getActiveDownloader()

      const allTags = selectedLinks
        .flatMap((link) => parseTags(link.displayName))
        .filter((tag, index, arr) => arr.indexOf(tag) === index)

      const category = deriveCategory(savePath, appStateStore.basePath)

      await addTorrents(
        selectedLinks,
        savePath,
        category,
        allTags,
        activeDownloader?.name
      )

      setStatus({
        type: 'success',
        message: `Added ${selectedLinks.length} torrents`,
      })

      appStateActions.clearMagnetLinks()
    } catch (error) {
      console.error('❌ Error:', error)
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to add torrents',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, status, submitMagnetLinks }
}
