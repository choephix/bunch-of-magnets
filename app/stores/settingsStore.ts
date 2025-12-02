import { proxy, subscribe } from 'valtio'

interface SettingsState {
  /** User's overrides per downloader URL */
  librarySuggestionOverrides: Record<string, Record<string, boolean>>
  selectedDownloader: string | null
}

const STORAGE_KEY = 'bunch-of-magnets-settings'

const defaultSettings: SettingsState = {
  librarySuggestionOverrides: {},
  selectedDownloader: null,
}

const loadSettings = (): SettingsState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Remove old fields if present
      const { qbittorrentUrlOverride: _, librarySuggestions: __, ...rest } = parsed
      return { ...defaultSettings, ...rest }
    }
  } catch (error) {
    console.error('❌ Failed to load settings:', error)
  }
  return defaultSettings
}

export const settingsStore = proxy<SettingsState>(loadSettings())

// Subscribe to changes and save to localStorage
subscribe(settingsStore, () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsStore))
  } catch (error) {
    console.error('❌ Failed to save settings:', error)
  }
})

/** Get effective librarySuggestions for a downloader (overrides merged with defaults) */
export const getLibrarySuggestionsForDownloader = (
  downloaderUrl: string,
  defaults: Record<string, boolean>
): Record<string, boolean> => {
  const overrides = settingsStore.librarySuggestionOverrides[downloaderUrl] ?? {}
  return { ...defaults, ...overrides }
}

export const settingsActions = {
  setLibrarySuggestion: (downloaderUrl: string, type: string, enabled: boolean) => {
    if (!settingsStore.librarySuggestionOverrides[downloaderUrl]) {
      settingsStore.librarySuggestionOverrides[downloaderUrl] = {}
    }
    settingsStore.librarySuggestionOverrides[downloaderUrl][type] = enabled
  },

  setSelectedDownloader: (name: string | null) => {
    settingsStore.selectedDownloader = name?.trim() || null
  },

  resetLibrarySuggestionsForDownloader: (downloaderUrl: string) => {
    delete settingsStore.librarySuggestionOverrides[downloaderUrl]
  },

  resetToDefaults: () => {
    settingsStore.librarySuggestionOverrides = {}
    settingsStore.selectedDownloader = null
  },
}
