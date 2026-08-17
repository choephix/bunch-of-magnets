/**
 * Save paths follow a fixed slot order after the downloader's basePath:
 *   <library>/<show or movie name>/<season>
 * Unpicked slots hold a placeholder, so the path always says what has been chosen,
 * regardless of how deep it is.
 */

export const PLACEHOLDER = '_'

const SEASON_FOLDER = /^season\s*\d+$/i

export const SLOT_INDEX = { library: 0, showname: 1, season: 2 } as const

/** Segments of the path after basePath */
export const relativeSegments = (savePath: string, basePath: string) => {
 const relative =
  basePath && savePath.startsWith(basePath) ? savePath.slice(basePath.length) : savePath
 return relative.split('/').filter(Boolean)
}

/** basePath + relative segments, normalised to a trailing slash */
export const buildSavePath = (basePath: string, segments: readonly string[]) =>
 `${basePath.replace(/\/+$/, '')}/${segments.join('/')}/`

/**
 * The show or movie name in a save path: the first segment after basePath that is neither a
 * placeholder, a library folder, nor a season folder. Depth-independent, so a hand-typed
 * "/downloads/Severance/" counts like a pill-built "/downloads/tv/Severance/Season 1/".
 * Empty means the user hasn't picked a name yet.
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
