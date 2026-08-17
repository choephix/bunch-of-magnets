import { proxy, useSnapshot } from 'valtio'
import { parseFirstTvShowName, parseSeasons } from '../services/tvShowService'
import { MagnetLink } from '../utils/magnet'
import {
  applySavePathSuggestion,
  buildSavePath,
  canAddTorrents,
  createSavePathSelection,
  editSavePathRoot,
  moveSavePathToBase,
  SavePathSelection,
} from '../utils/savePath'
import { configStore, getActiveDownloader } from './configStore'
import { getLibrarySuggestionsForDownloader, settingsStore } from './settingsStore'

type SuggestionPill = {
  type: 'showname' | 'season' | 'library'
  value: string | number
}

type State = {
  magnetLinks: MagnetLink[]
  dynamicSuggestions: SuggestionPill[]
  savePathSelection: SavePathSelection
  savePath: string
  basePath: string
  isExtracting: boolean
}

const initialSelection = createSavePathSelection('')

const initialState: State = {
  magnetLinks: [],
  dynamicSuggestions: [],
  savePathSelection: initialSelection,
  savePath: buildSavePath(initialSelection),
  basePath: '',
  isExtracting: false,
}

export const appStateStore = proxy<State>(initialState)

// Helper to sort suggestions by type (library, then show, then season)
const sortSuggestionsByType = () => {
  const typeOrder = { library: 0, showname: 1, season: 2 }
  appStateStore.dynamicSuggestions.sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
}

// Helper to update suggestions based on current magnetLinks
const updateSuggestionsFromMagnetLinks = async (magnetLinks: readonly MagnetLink[]) => {
  const start = performance.now()
  console.log(`💡 [appState] Updating suggestions for ${magnetLinks.length} magnet link(s)...`)

  // 1. Immediately parse and display season pills synchronously (0ms)
  try {
    const seasons = parseSeasons(magnetLinks)
    let addedSeason = false
    seasons.forEach((season) => {
      const newSuggestion = { type: 'season' as const, value: season }
      if (
        !appStateStore.dynamicSuggestions.some((s) => s.type === 'season' && s.value === season)
      ) {
        appStateStore.dynamicSuggestions.push(newSuggestion)
        addedSeason = true
      }
    })
    if (addedSeason) {
      sortSuggestionsByType()
      console.log(
        `⚡ [appState] Instant season pills rendered in ${(performance.now() - start).toFixed(1)}ms`
      )
    }
  } catch (error) {
    console.error('❌ [appState] Error parsing seasons:', error)
  }

  // 2. Fetch show name from AI in background
  try {
    const showName = await parseFirstTvShowName(magnetLinks)
    if (showName) {
      const newSuggestion = { type: 'showname' as const, value: showName }
      if (
        !appStateStore.dynamicSuggestions.some(
          (s) => s.type === 'showname' && s.value === showName
        )
      ) {
        appStateStore.dynamicSuggestions.push(newSuggestion)
        sortSuggestionsByType()
      }
    }
  } catch (error) {
    console.error('❌ [appState] Error parsing show name:', error)
  }

  const duration = performance.now() - start
  console.log(
    `💡 [appState] Suggestions fully updated in ${duration.toFixed(0)}ms (${appStateStore.dynamicSuggestions.length} total suggestion pills)`
  )
}

export const appStateActions = {
  addMagnetLinks: async (links: readonly MagnetLink[]) => {
    const existingUrls = new Set(appStateStore.magnetLinks.map((link) => link.magnetUrl))
    const newLinks = links.filter((link) => !existingUrls.has(link.magnetUrl))
    appStateStore.magnetLinks.unshift(...newLinks)

    if (newLinks.length > 0) {
      await updateSuggestionsFromMagnetLinks(newLinks)
    }
  },

  removeMagnetLink: (index: number) => {
    appStateStore.magnetLinks.splice(index, 1)
  },

  clearMagnetLinks: () => {
    appStateStore.magnetLinks = []
    appStateStore.dynamicSuggestions = []
  },

  addSuggestion: (suggestion: SuggestionPill) => {
    if (
      !appStateStore.dynamicSuggestions.some(
        (s) => s.type === suggestion.type && s.value === suggestion.value
      )
    ) {
      appStateStore.dynamicSuggestions.unshift(suggestion)
    }
  },

  addSuggestions: (suggestions: SuggestionPill[]) => {
    suggestions.forEach((suggestion) => {
      if (
        !appStateStore.dynamicSuggestions.some(
          (s) => s.type === suggestion.type && s.value === suggestion.value
        )
      ) {
        appStateStore.dynamicSuggestions.unshift(suggestion)
      }
    })
  },

  applySuggestion: (suggestion: SuggestionPill) => {
    appStateStore.savePathSelection = applySavePathSuggestion(
      appStateStore.savePathSelection,
      suggestion
    )
    appStateStore.savePath = buildSavePath(appStateStore.savePathSelection)
    console.log('📁 Updated save path:', appStateStore.savePath)
  },

  setSavePath: (path: string) => {
    appStateStore.savePathSelection = editSavePathRoot(path)
    appStateStore.savePath = path
  },

  setBasePath: (newBasePath: string) => {
    const normalizedBase = newBasePath.replace(/\/+$/, '')
    appStateStore.savePathSelection = moveSavePathToBase(
      appStateStore.savePathSelection,
      normalizedBase
    )
    appStateStore.basePath = normalizedBase
    appStateStore.savePath = buildSavePath(appStateStore.savePathSelection)
    console.log('🗂️ Base path updated:', appStateStore.basePath, '→', appStateStore.savePath)
  },

  toggleIgnoreMagnetLink: (index: number) => {
    const link = appStateStore.magnetLinks[index]
    if (link) {
      link.ignore = !link.ignore
    }
  },

  sortMagnetLinksByName: () => {
    appStateStore.magnetLinks.sort((a, b) =>
      (a.displayName || a.magnetUrl).localeCompare(b.displayName || b.magnetUrl)
    )
  },

  selectAllMagnetLinks: () => {
    appStateStore.magnetLinks.forEach((link) => (link.ignore = false))
  },

  selectNoneMagnetLinks: () => {
    appStateStore.magnetLinks.forEach((link) => (link.ignore = true))
  },

  setIsExtracting: (isExtracting: boolean) => {
    appStateStore.isExtracting = isExtracting
  },
}

export const useAppState = () => useSnapshot(appStateStore)

const getEffectiveLibrarySuggestions = () => {
  const activeDownloader = getActiveDownloader()
  return activeDownloader
    ? getLibrarySuggestionsForDownloader(activeDownloader.url, activeDownloader.librarySuggestions)
    : {}
}

/** Subscribe to settings that determine the active downloader's library folders. */
const useEffectiveLibrarySuggestions = () => {
  useSnapshot(settingsStore)
  useSnapshot(configStore)

  return getEffectiveLibrarySuggestions()
}

export const getAllSuggestionsSnapshot = () => {
  const appState = useSnapshot(appStateStore)
  const librarySuggestions = Object.entries(useEffectiveLibrarySuggestions())
    .filter(([_, enabled]) => enabled)
    .map(([value]) => ({ type: 'library' as const, value }))

  return [...librarySuggestions, ...appState.dynamicSuggestions]
}

/** Show or movie name currently selected; empty until the user picks one */
export const useSavePathTitle = () => {
  const { savePathSelection } = useSnapshot(appStateStore)
  return savePathSelection.title ?? ''
}

/** Whether torrents can be added to downloader */
export const useCanAddTorrents = () => {
  const { savePathSelection } = useSnapshot(appStateStore)
  return canAddTorrents(savePathSelection)
}
