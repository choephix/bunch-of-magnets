/**
 * Save-path business rules. A path may contain an optional library folder, a required show/movie
 * name, and an optional season folder beneath the downloader's base path.
 */

export type SavePathSuggestion = {
 type: 'library' | 'showname' | 'season'
 value: string | number
}

export const PLACEHOLDER = '_'

const SEASON_FOLDER = /^season\s*\d+$/i

/** Segments of the path after basePath. */
export const relativeSegments = (savePath: string, basePath: string) => {
 const normalizedBase = basePath.replace(/\/+$/, '')
 const isBelowBase =
  normalizedBase &&
  (savePath === normalizedBase || savePath.startsWith(`${normalizedBase}/`))
 const relative = isBelowBase ? savePath.slice(normalizedBase.length) : savePath
 return relative.split('/').filter(Boolean)
}

/** basePath + relative segments, normalized to a trailing slash. */
export const buildSavePath = (basePath: string, segments: readonly string[]) =>
 `${basePath.replace(/\/+$/, '')}/${segments.join('/')}/`

/** Move the current relative destination to a downloader's new base path. */
export const moveSavePathToBase = (savePath: string, oldBasePath: string, newBasePath: string) => {
 const segments = relativeSegments(savePath, oldBasePath)
 if (segments.length === 0) segments.push(PLACEHOLDER)
 return buildSavePath(newBasePath, segments)
}

/** Apply one suggestion click while treating the library folder as optional. */
export const applySavePathSuggestion = (
 savePath: string,
 basePath: string,
 suggestion: SavePathSuggestion,
 libraryNames: readonly string[]
) => {
 let segments = relativeSegments(savePath, basePath)
 const libraries = new Set(libraryNames.map((name) => name.toLowerCase()))
 const isLibrary = (segment: string) => libraries.has(segment.toLowerCase())
 const isTitle = (segment: string) =>
  segment !== PLACEHOLDER && !SEASON_FOLDER.test(segment) && !isLibrary(segment)

 // Canonicalize paths left behind by the old fixed-slot implementation. A placeholder is
 // meaningful only when the path has no title; otherwise it is the phantom library slot.
 const hasTitle = segments.some(isTitle)
 segments = segments.filter((segment) => segment !== PLACEHOLDER)
 if (!hasTitle) {
  const titleIndex = segments[0] && isLibrary(segments[0]) ? 1 : 0
  segments.splice(titleIndex, 0, PLACEHOLDER)
 }

 if (suggestion.type === 'library') {
  const library = String(suggestion.value)
  if (segments[0] && isLibrary(segments[0])) segments[0] = library
  else segments.unshift(library)
 }

 if (suggestion.type === 'showname') {
  const titleIndex = segments[0] && isLibrary(segments[0]) ? 1 : 0
  const title = String(suggestion.value)
  if (!segments[titleIndex] || SEASON_FOLDER.test(segments[titleIndex])) {
   segments.splice(titleIndex, 0, title)
  } else {
   segments[titleIndex] = title
  }
 }

 if (suggestion.type === 'season') {
  const season = `Season ${suggestion.value}`
  const seasonIndex = segments.findIndex((segment) => SEASON_FOLDER.test(segment))
  if (seasonIndex >= 0) segments[seasonIndex] = season
  else segments.push(season)
 }

 return buildSavePath(basePath, segments)
}

/**
 * The show/movie name in a save path. Empty means the user has not selected or typed a name.
 * This is necessarily a soft inference for manually typed paths.
 */
export const findSavePathTitle = (
 savePath: string,
 basePath: string,
 libraryNames: readonly string[]
) => {
 const title = relativeSegments(savePath, basePath).find((segment) => {
  if (segment === PLACEHOLDER || SEASON_FOLDER.test(segment)) return false
  return !libraryNames.some((name) => name.toLowerCase() === segment.toLowerCase())
 })

 return title ?? ''
}
