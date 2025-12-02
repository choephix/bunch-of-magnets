import { proxy, useSnapshot } from 'valtio'
import { parseFirstTvShowName, parseSeasons } from '../services/tvShowService'
import { MagnetLink } from '../utils/magnet'
import { settingsStore } from './settingsStore'

type SuggestionPill = {
  type: 'showname' | 'season' | 'library'
  value: string | number
}

type State = {
  magnetLinks: MagnetLink[]
  dynamicSuggestions: SuggestionPill[]
  savePath: string
  basePath: string
  isExtracting: boolean
}

const initialState: State = {
  magnetLinks: [],
  dynamicSuggestions: [],
  savePath: '',
  basePath: '',
  isExtracting: false,
}

export const appStateStore = proxy<State>(initialState)

/** Get the relative path after basePath */
const getRelativePath = () => {
  const { savePath, basePath } = appStateStore
  if (!basePath || !savePath.startsWith(basePath)) return savePath
  return savePath.slice(basePath.length)
}

/** Build full path from basePath + relative parts */
const buildFullPath = (basePath: string, relativeParts: string[]) => {
  const base = basePath.replace(/\/+$/, '')
  return `${base}/${relativeParts.join('/')}/`
}

// Helper to sort suggestions by type (library, then show, then season)
const sortSuggestionsByType = () => {
  const typeOrder = { library: 0, showname: 1, season: 2 }
  appStateStore.dynamicSuggestions.sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
}

// Helper to update suggestions based on current magnetLinks
const updateSuggestionsFromMagnetLinks = async (magnetLinks: readonly MagnetLink[]) => {
  // Parse show name from first link
  try {
    const showName = await parseFirstTvShowName(magnetLinks)
    if (showName) {
      const newSuggestion = { type: 'showname' as const, value: showName }
      if (
        !appStateStore.dynamicSuggestions.some((s) => s.type === 'showname' && s.value === showName)
      ) {
        appStateStore.dynamicSuggestions.push(newSuggestion)
      }
    }
  } catch (error) {
    console.error('❌ Error parsing show name:', error)
  }

  // Parse seasons from all links
  try {
    const seasons = parseSeasons(magnetLinks)
    seasons.forEach((season) => {
      const newSuggestion = { type: 'season' as const, value: season }
      if (
        !appStateStore.dynamicSuggestions.some((s) => s.type === 'season' && s.value === season)
      ) {
        appStateStore.dynamicSuggestions.push(newSuggestion)
      }
    })
  } catch (error) {
    console.error('❌ Error parsing seasons:', error)
  }

  // Sort suggestions by type
  sortSuggestionsByType()
}

export const appStateActions = {
  addMagnetLinks: async (links: readonly MagnetLink[]) => {
    const existingUrls = new Set(appStateStore.magnetLinks.map((link) => link.magnetUrl))
    const newLinks = links.filter((link) => !existingUrls.has(link.magnetUrl))
    appStateStore.magnetLinks.unshift(...newLinks)

    if (newLinks.length > 0) {
      await updateSuggestionsFromMagnetLinks(links)
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
    // Get relative parts after basePath
    const relativePath = getRelativePath()
    const relativeParts = relativePath.split('/').filter(Boolean)

    // Target indices relative to basePath: library=0, showname=1, season=2
    const targetIndex =
      suggestion.type === 'library'
        ? 0
        : suggestion.type === 'showname'
        ? 1
        : suggestion.type === 'season'
        ? 2
        : -1

    if (targetIndex === -1) return

    // Ensure we have enough parts (pad with "_")
    while (relativeParts.length <= targetIndex) {
      relativeParts.push('_')
    }

    // Update the target part
    relativeParts[targetIndex] =
      suggestion.type === 'season' ? `Season ${suggestion.value}` : (suggestion.value as string)

    // Reconstruct the path
    appStateStore.savePath = buildFullPath(appStateStore.basePath, relativeParts)
    console.log('📁 Updated save path:', appStateStore.savePath)
  },

  setSavePath: (path: string) => {
    appStateStore.savePath = path
  },

  setBasePath: (newBasePath: string) => {
    const relativePath = getRelativePath()
    const relativeParts = relativePath.split('/').filter(Boolean)

    // Ensure at least one placeholder
    if (relativeParts.length === 0) relativeParts.push('_')

    const normalizedBase = newBasePath.replace(/\/+$/, '')
    appStateStore.basePath = normalizedBase
    appStateStore.savePath = buildFullPath(normalizedBase, relativeParts)
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

export const getAllSuggestionsSnapshot = () => {
  const appState = useSnapshot(appStateStore)
  const settings = useSnapshot(settingsStore)

  const librarySuggestions = Object.entries(settings.librarySuggestions)
    .filter(([_, enabled]) => enabled)
    .map(([type]) => ({ type: 'library' as const, value: type }))

  return [...librarySuggestions, ...appState.dynamicSuggestions]
}
