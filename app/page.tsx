'use client'

import { useEffect, useState } from 'react'
import { MagnetLinks } from './components/MagnetLinks'
import { NavButtons } from './components/NavButtons'
import { QbittorrentLink } from './components/QbittorrentLink'
import { SaveDir } from './components/SaveDir'
import { SettingsModal } from './components/SettingsModal'
import { StatusMessage } from './components/StatusMessage'
import { SuggestionPills } from './components/SuggestionPills'
import { useMagnetSubmission } from './hooks/useMagnetSubmission'
import { useAppState } from './stores/appStateStore'
import { useProcessMagnetLinkQueries } from './hooks/useMagnetQuery'
import { configActions } from './stores/configStore'

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { magnetLinks, savePath } = useAppState()
  const { isLoading, status, submitMagnetLinks } = useMagnetSubmission()

  useLoadConfig()
  useUrlMagnetQuery()

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-3 sm:p-6">
      <div
        className="fixed left-1 top-1 z-50 h-2 w-2 rounded-full bg-lime-400"
        title="deploy marker eb1e31b"
      />
      <main className="max-w-2xl mx-auto">
        <h1 className="text-xl py-2 font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Bunch of Magnets
        </h1>

        <NavButtons onSettingsClick={() => setIsSettingsOpen(true)} />

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        <div className="space-y-6 bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700">
          <SaveDir />
          <SuggestionPills />
          <MagnetLinks
            onSubmit={() => submitMagnetLinks([...magnetLinks], savePath)}
            isLoading={isLoading}
          />
        </div>

        <StatusMessage status={status} />

        <QbittorrentLink />
      </main>
    </div>
  )
}

const useLoadConfig = () => {
  useEffect(() => {
    configActions.load()
  }, [])
}

const useUrlMagnetQuery = () => {
  const { processMagnetLinkQueries } = useProcessMagnetLinkQueries()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const query = searchParams.get('q')
    if (!query) return

    console.log('🔍 Found magnet query in URL:', query)

    searchParams.delete('q')
    const newUrl = `${window.location.pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    window.history.replaceState({}, '', newUrl)

    void processMagnetLinkQueries([query])
    // Run once on mount; subsequent renders see no `q` after replaceState above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
