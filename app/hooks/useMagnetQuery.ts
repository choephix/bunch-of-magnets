import { useState } from 'react'
import { MagnetLink, parseMagnetLinks } from '../utils/magnet'
import { appStateActions, useAppState } from '../stores/appStateStore'
import { queryHistoryActions } from '../stores/queryHistoryStore'

export const useProcessMagnetLinkQueries = () => {
  const [error, setError] = useState<string | null>(null)
  const { isExtracting } = useAppState()

  const isUrl = (text: string): boolean => {
    if (text.startsWith('magnet:?')) {
      return false
    }

    try {
      new URL(text)
      return true
    } catch {
      return false
    }
  }

  const extractMagnetsFromUrl = async (url: string): Promise<void> => {
    try {
      console.log('🔗 Extracting magnets from URL:', url)
      const response = await fetch('/api/extract-magnets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data: { magnetLinks: MagnetLink[]; error?: string } = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract magnet links')
      }

      // Create a mutable copy of the magnet links
      const mutableLinks = [...data.magnetLinks]
      appStateActions.addMagnetLinks(mutableLinks)

      // Save URL as candidate query
      queryHistoryActions.setCandidateQuery(url)
    } catch (error) {
      console.error('❌ Error extracting magnets from URL:', error)
      throw error
    }
  }

  const processMagnetLinks = (text: string): void => {
    const parsed = parseMagnetLinks(text)
    console.log('🔍 Parsed new magnet links:', parsed.length)
    appStateActions.addMagnetLinks(parsed)
  }

  const processMagnetLinkQueries = async (queries: string[]): Promise<void> => {
    setError(null)

    if (isExtracting) {
      throw new Error('Already extracting magnets')
    }

    try {
      for (const query of queries) {
        if (isUrl(query)) {
          appStateActions.setIsExtracting(true)
          await extractMagnetsFromUrl(query)
        } else {
          processMagnetLinks(query)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process queries')
    } finally {
      appStateActions.setIsExtracting(false)
    }
  }

  return {
    error,
    processMagnetLinkQueries,
  }
}
