/**
 * Explicit SavePath selection model.
 *
 * Rather than reverse-engineering user intent from a path string, we track the
 * components directly:
 *   - root: the downloader's base path or the user's manually entered destination
 *   - manual: use the entered destination as-is until a suggestion is clicked
 *   - library: optional category/library folder (e.g. 'tv', 'movies')
 *   - title: show or movie name required only for suggestion-built paths
 *   - season: optional season number (e.g. 3 -> 'Season 3')
 */

export type SavePathSuggestion = {
 type: 'library' | 'showname' | 'season'
 value: string | number
}

export type SavePathSelection = {
 root: string
 manual?: boolean
 library?: string
 title?: string
 season?: number
}

export const PLACEHOLDER = '_'

/** Create an initial selection from a downloader's base path. */
export const createSavePathSelection = (basePath: string): SavePathSelection => ({
 root: basePath.replace(/\/+$/, ''),
})

/**
 * Manual input is a complete destination, not an incomplete smart selection.
 * It also becomes the root for any subsequent suggestion clicks.
 */
export const editSavePathRoot = (input: string): SavePathSelection => ({
 root: input,
 manual: true,
})

/** Apply a suggestion pill click (library, show name, or season). */
export const applySavePathSuggestion = (
 selection: SavePathSelection,
 suggestion: SavePathSuggestion
): SavePathSelection => {
 if (suggestion.type === 'library') {
  return { ...selection, manual: false, library: String(suggestion.value) }
 }
 if (suggestion.type === 'showname') {
  return { ...selection, manual: false, title: String(suggestion.value) }
 }
 if (suggestion.type === 'season') {
  return { ...selection, manual: false, season: Number(suggestion.value) }
 }
 return selection
}

/** Update the base path (e.g. when changing downloaders) while preserving selections. */
export const moveSavePathToBase = (
 selection: SavePathSelection,
 newBasePath: string
): SavePathSelection => ({
 ...selection,
 manual: false,
 root: newBasePath.replace(/\/+$/, ''),
})

/** Build the canonical save path string from selection state. */
export const buildSavePath = (selection: SavePathSelection): string => {
 if (selection.manual) return selection.root
 const root = selection.root.replace(/\/+$/, '')
 const segments: string[] = []

 if (selection.library) {
  segments.push(selection.library)
 }

 if (selection.title) {
  segments.push(selection.title)
 } else if (selection.season !== undefined || selection.library) {
  segments.push(PLACEHOLDER)
 } else if (segments.length === 0) {
  segments.push(PLACEHOLDER)
 }

 if (selection.season !== undefined) {
  segments.push(`Season ${selection.season}`)
 }

 if (!root) {
  return `/${segments.join('/')}/`
 }

 return `${root}/${segments.join('/')}/`
}

/** Manual destinations are complete; smart paths still require a selected title. */
export const canAddTorrents = (selection: SavePathSelection): boolean =>
 selection.manual
  ? selection.root.trim().length > 0 && !selection.root.split('/').includes(PLACEHOLDER)
  : Boolean(selection.title && selection.title.trim().length > 0)

/** qBittorrent category is the library folder when the user picked one. */
export const deriveCategory = (selection: SavePathSelection): string => {
  const library = selection.library?.trim()
  if (!library || library === PLACEHOLDER) return ''
  return library
}
