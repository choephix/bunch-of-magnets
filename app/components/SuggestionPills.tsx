import { useSnapshot } from 'valtio'
import { appStateActions, appStateStore } from '../stores/appStateStore'
import { configStore, getActiveDownloader } from '../stores/configStore'
import { getLibrarySuggestionsForDownloader, settingsStore } from '../stores/settingsStore'

const useAllSuggestions = () => {
  const appState = useSnapshot(appStateStore)
  useSnapshot(settingsStore)
  useSnapshot(configStore)

  const activeDownloader = getActiveDownloader()
  const librarySuggestions = activeDownloader
    ? getLibrarySuggestionsForDownloader(activeDownloader.url, activeDownloader.librarySuggestions)
    : {}
  const library = Object.entries(librarySuggestions)
    .filter(([, enabled]) => enabled)
    .map(([value]) => ({ type: 'library' as const, value }))

  return [...library, ...appState.dynamicSuggestions]
}

export const SuggestionPills = () => {
  const suggestions = useAllSuggestions()

  if (suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            appStateActions.applySuggestion(suggestion)
          }}
          className={`px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-2 ${
            suggestion.type === 'season'
              ? 'bg-purple-900/50 text-purple-200 hover:bg-purple-800/50'
              : suggestion.type === 'library'
                ? 'bg-green-900/50 text-green-200 hover:bg-green-800/50'
                : 'bg-blue-900/50 text-blue-200 hover:bg-blue-800/50'
          }`}
        >
          <span>
            {suggestion.type === 'season' ? `Season ${suggestion.value}` : suggestion.value}
          </span>
        </button>
      ))}
    </div>
  )
}
