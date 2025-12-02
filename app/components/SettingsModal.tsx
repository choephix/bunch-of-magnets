import { X } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { configActions, configStore, getActiveDownloader } from '../stores/configStore'
import {
  getLibrarySuggestionsForDownloader,
  settingsActions,
  settingsStore,
} from '../stores/settingsStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const { selectedDownloader, librarySuggestionOverrides } = useSnapshot(settingsStore)
  const { downloaders } = useSnapshot(configStore)

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClickOutside])

  if (!isOpen) return null

  const effectiveSelection = selectedDownloader ?? downloaders[0]?.name ?? null
  const activeDownloader = getActiveDownloader()

  // Get effective library suggestions for active downloader
  const librarySuggestions = activeDownloader
    ? getLibrarySuggestionsForDownloader(activeDownloader.url, activeDownloader.librarySuggestions)
    : {}

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-4">Settings</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Downloader</h3>
            {downloaders.length > 0 ? (
              <div className="space-y-2">
                {downloaders.map((downloader) => (
                  <button
                    key={downloader.name}
                    onClick={() => {
                      settingsActions.setSelectedDownloader(downloader.name)
                      configActions.updateBasePath()
                    }}
                    className={`w-full flex items-center justify-between p-0.5 pl-2 pr-1 rounded-md transition-colors ${
                      effectiveSelection === downloader.name
                        ? 'bg-blue-900/50 text-blue-200 border border-blue-500'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{downloader.name}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        downloader.type === 'qbittorrent'
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-orange-900/50 text-orange-300'
                      }`}
                    >
                      {downloader.type}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No downloaders configured</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Library Suggestions</h3>
            {activeDownloader ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(librarySuggestions).map(([type, enabled]) => (
                  <button
                    key={type}
                    onClick={() =>
                      settingsActions.setLibrarySuggestion(activeDownloader.url, type, !enabled)
                    }
                    className={`flex items-center justify-between px-2 py-0.5 rounded-r-2xl rounded-l-md transition-colors ${
                      enabled
                        ? 'bg-blue-900/50 text-blue-200 hover:bg-blue-800/50'
                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                    }`}
                  >
                    <span>{type}</span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 transition-colors ${
                        enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                      }`}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a downloader first</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
