/**
 * Explicit SavePath selection model.
 *
 * Rather than reverse-engineering user intent from a path string, we track the
 * components directly:
 *   - root: the downloader's base path or the user's manually edited root
 *   - library: optional category/library folder (e.g. 'tv', 'movies')
 *   - title: required show or movie name (e.g. 'Silo', 'Severance')
 *   - season: optional season number (e.g. 3 -> 'Season 3')
 */

export type SavePathSuggestion = {
 type: 'library' | 'showname' | 'season'
 value: string | number
}

export type SavePathSelection = {
 root: string
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
 * When the user manually edits the save directory input, the typed value becomes
 * the new root, resetting previous library/title/season selections.
 */
export const editSavePathRoot = (input: string): SavePathSelection => ({
 root: input.replace(/\/+$/, ''),
})

/** Apply a suggestion pill click (library, show name, or season). */
export const applySavePathSuggestion = (
 selection: SavePathSelection,
 suggestion: SavePathSuggestion
): SavePathSelection => {
 if (suggestion.type === 'library') {
  return { ...selection, library: String(suggestion.value) }
 }
 if (suggestion.type === 'showname') {
  return { ...selection, title: String(suggestion.value) }
 }
 if (suggestion.type === 'season') {
  return { ...selection, season: Number(suggestion.value) }
 }
 return selection
}

/** Update the base path (e.g. when changing downloaders) while preserving selections. */
export const moveSavePathToBase = (
 selection: SavePathSelection,
 newBasePath: string
): SavePathSelection => ({
 ...selection,
 root: newBasePath.replace(/\/+$/, ''),
})

/** Build the canonical save path string from selection state. */
export const buildSavePath = (selection: SavePathSelection): string => {
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

/** Submit is allowed only when a show or movie name has been selected. */
export const canAddTorrents = (selection: SavePathSelection): boolean =>
 Boolean(selection.title && selection.title.trim().length > 0)
