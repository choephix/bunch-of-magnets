import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applySavePathSuggestion,
  buildSavePath,
  findSavePathTitle,
  moveSavePathToBase,
  relativeSegments,
  type SavePathSuggestion,
} from './savePath.ts'

const BASE = '/media-library'
const LIBRARIES = ['movies', 'tv']

const ACTIONS = {
  L: { type: 'library', value: 'tv' },
  T: { type: 'showname', value: 'Silo' },
  S: { type: 'season', value: 3 },
} as const satisfies Record<string, SavePathSuggestion>

type ActionName = keyof typeof ACTIONS

const applyActions = (names: readonly ActionName[], initialPath = `${BASE}/_/`) =>
  names.reduce(
    (path, name) => applySavePathSuggestion(path, BASE, ACTIONS[name], LIBRARIES),
    initialPath
  )

const expectedPath = (names: readonly ActionName[]) => {
  const selected = new Set(names)
  const segments: string[] = []
  if (selected.has('L')) segments.push('tv')
  if (selected.has('T')) segments.push('Silo')
  else segments.push('_')
  if (selected.has('S')) segments.push('Season 3')
  return buildSavePath(BASE, segments)
}

const EVERY_SUBSET_AND_ORDER: readonly ActionName[][] = [
  [],
  ['L'],
  ['T'],
  ['S'],
  ['L', 'T'],
  ['L', 'S'],
  ['T', 'L'],
  ['T', 'S'],
  ['S', 'L'],
  ['S', 'T'],
  ['L', 'T', 'S'],
  ['L', 'S', 'T'],
  ['T', 'L', 'S'],
  ['T', 'S', 'L'],
  ['S', 'L', 'T'],
  ['S', 'T', 'L'],
]

test('every subset and ordering of library, title, and season clicks produces canonical paths', () => {
  for (const actions of EVERY_SUBSET_AND_ORDER) {
    assert.equal(applyActions(actions), expectedPath(actions), actions.join(' → ') || 'no clicks')
  }
})

test('the reported regression: title then season has no phantom library placeholder', () => {
  const afterTitle = applyActions(['T'])
  assert.equal(afterTitle, '/media-library/Silo/')

  const afterSeason = applySavePathSuggestion(afterTitle, BASE, ACTIONS.S, LIBRARIES)
  assert.equal(afterSeason, '/media-library/Silo/Season 3/')
})

test('missing choices retain exactly one placeholder in the title position', () => {
  assert.equal(applyActions([]), '/media-library/_/')
  assert.equal(applyActions(['L']), '/media-library/tv/_/')
  assert.equal(applyActions(['S']), '/media-library/_/Season 3/')
  assert.equal(applyActions(['L', 'S']), '/media-library/tv/_/Season 3/')
  assert.equal(applyActions(['S', 'L']), '/media-library/tv/_/Season 3/')
})

test('later clicks replace their own selection without disturbing the others', () => {
  let path = applyActions(['L', 'T', 'S'])

  path = applySavePathSuggestion(path, BASE, { type: 'showname', value: 'Andor' }, LIBRARIES)
  assert.equal(path, '/media-library/tv/Andor/Season 3/')

  path = applySavePathSuggestion(path, BASE, { type: 'library', value: 'movies' }, LIBRARIES)
  assert.equal(path, '/media-library/movies/Andor/Season 3/')

  path = applySavePathSuggestion(path, BASE, { type: 'season', value: 1 }, LIBRARIES)
  assert.equal(path, '/media-library/movies/Andor/Season 1/')
})

test('repeating any selected suggestion is idempotent', () => {
  const canonical = applyActions(['L', 'T', 'S'])
  assert.equal(applySavePathSuggestion(canonical, BASE, ACTIONS.L, LIBRARIES), canonical)
  assert.equal(applySavePathSuggestion(canonical, BASE, ACTIONS.T, LIBRARIES), canonical)
  assert.equal(applySavePathSuggestion(canonical, BASE, ACTIONS.S, LIBRARIES), canonical)
})

test('suggestion clicks complete valid manually edited paths', () => {
  assert.equal(
    applySavePathSuggestion('/media-library/Silo/', BASE, ACTIONS.S, LIBRARIES),
    '/media-library/Silo/Season 3/'
  )
  assert.equal(
    applySavePathSuggestion('/media-library/tv/Silo/', BASE, ACTIONS.S, LIBRARIES),
    '/media-library/tv/Silo/Season 3/'
  )
  assert.equal(
    applySavePathSuggestion('/media-library/_/Season 3/', BASE, ACTIONS.T, LIBRARIES),
    '/media-library/Silo/Season 3/'
  )
  assert.equal(
    applySavePathSuggestion('/media-library/tv/Season 3/', BASE, ACTIONS.T, LIBRARIES),
    '/media-library/tv/Silo/Season 3/'
  )
})

test('a path produced by the broken implementation is repaired by the next click', () => {
  const broken = '/media-library/_/Silo/Season 3/'
  assert.equal(
    applySavePathSuggestion(broken, BASE, ACTIONS.S, LIBRARIES),
    '/media-library/Silo/Season 3/'
  )
  assert.equal(
    applySavePathSuggestion(broken, BASE, { type: 'showname', value: 'Andor' }, LIBRARIES),
    '/media-library/Andor/Season 3/'
  )
  assert.equal(
    applySavePathSuggestion(broken, BASE, ACTIONS.L, LIBRARIES),
    '/media-library/tv/Silo/Season 3/'
  )
})

test('base-path initialization and downloader changes preserve the relative destination', () => {
  assert.equal(moveSavePathToBase('', '', '/media-library/'), '/media-library/_/')
  assert.equal(
    moveSavePathToBase('/downloads/tv/Silo/Season 3/', '/downloads/', '/media-library/'),
    '/media-library/tv/Silo/Season 3/'
  )
  assert.equal(
    moveSavePathToBase('/downloads/_/Season 3/', '/downloads', '/media-library'),
    '/media-library/_/Season 3/'
  )
})

test('base-path matching respects path-segment boundaries', () => {
  assert.deepEqual(relativeSegments('/downloads/tv/Silo/', '/downloads'), ['tv', 'Silo'])
  assert.deepEqual(relativeSegments('/downloads-old/tv/Silo/', '/downloads'), [
    'downloads-old',
    'tv',
    'Silo',
  ])
})

test('submit gating stays disabled until a title is present for every action order', () => {
  for (const actions of EVERY_SUBSET_AND_ORDER) {
    const selectedTitle = findSavePathTitle(applyActions(actions), BASE, LIBRARIES)
    assert.equal(selectedTitle, actions.includes('T') ? 'Silo' : '', actions.join(' → '))
  }
})

test('submit gating recognizes manual titles and ignores placeholders, libraries, and seasons', () => {
  const title = (path: string) => findSavePathTitle(path, BASE, LIBRARIES)

  assert.equal(title(''), '')
  assert.equal(title('/media-library/'), '')
  assert.equal(title('/media-library/_/'), '')
  assert.equal(title('/media-library/tv/'), '')
  assert.equal(title('/media-library/tv/_/'), '')
  assert.equal(title('/media-library/_/Season 3/'), '')
  assert.equal(title('/media-library/tv/Season 3/'), '')
  assert.equal(title('/media-library/TV/season3/'), '')
  assert.equal(title('/media-library/Silo/'), 'Silo')
  assert.equal(title('/media-library/tv/Silo/Season 3/'), 'Silo')
  assert.equal(title('/media-library/movies/Dune Part Two (2024)/'), 'Dune Part Two (2024)')
})

test('titles resembling numbers or ordinary season phrases are not mistaken for season folders', () => {
  assert.equal(findSavePathTitle('/media-library/tv/1923/', BASE, LIBRARIES), '1923')
  assert.equal(
    findSavePathTitle('/media-library/movies/Season of the Witch/', BASE, LIBRARIES),
    'Season of the Witch'
  )
})
