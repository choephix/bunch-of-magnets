import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applySavePathSuggestion,
  buildSavePath,
  canAddTorrents,
  createSavePathSelection,
  editSavePathRoot,
  moveSavePathToBase,
  type SavePathSelection,
  type SavePathSuggestion,
} from './savePath.ts'

const ACTIONS = {
  L: { type: 'library', value: 'tv' },
  T: { type: 'showname', value: 'Silo' },
  S: { type: 'season', value: 3 },
} as const satisfies Record<string, SavePathSuggestion>

type ActionName = keyof typeof ACTIONS

const applyActions = (
  names: readonly ActionName[],
  initial: SavePathSelection = createSavePathSelection('/media-library')
) => names.reduce((sel, name) => applySavePathSuggestion(sel, ACTIONS[name]), initial)

const expectedPath = (names: readonly ActionName[], root = '/media-library') => {
  const selected = new Set(names)
  const segments: string[] = []
  if (selected.has('L')) segments.push('tv')
  if (selected.has('T')) segments.push('Silo')
  else segments.push('_')
  if (selected.has('S')) segments.push('Season 3')
  return `${root}/${segments.join('/')}/`
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

test('every subset and ordering on configured base path produces canonical paths and gating', () => {
  for (const actions of EVERY_SUBSET_AND_ORDER) {
    const sel = applyActions(actions)
    const label = actions.join(' → ') || 'no clicks'
    assert.equal(buildSavePath(sel), expectedPath(actions), label)
    assert.equal(canAddTorrents(sel), actions.includes('T'), `canAdd for ${label}`)
  }
})

test('user edits existing path to /Downloads and clicks Name or Name + Season', () => {
  // 1. User manually edits path to /Downloads
  let sel = editSavePathRoot('/Downloads')
  assert.equal(buildSavePath(sel), '/Downloads/_/')
  assert.equal(canAddTorrents(sel), false)

  // 2. User clicks show name 'Silo'
  sel = applySavePathSuggestion(sel, ACTIONS.T)
  assert.equal(buildSavePath(sel), '/Downloads/Silo/')
  assert.equal(canAddTorrents(sel), true)

  // 3. User clicks season '3'
  sel = applySavePathSuggestion(sel, ACTIONS.S)
  assert.equal(buildSavePath(sel), '/Downloads/Silo/Season 3/')
  assert.equal(canAddTorrents(sel), true)

  // 4. Optionally adds library 'tv'
  sel = applySavePathSuggestion(sel, ACTIONS.L)
  assert.equal(buildSavePath(sel), '/Downloads/tv/Silo/Season 3/')
  assert.equal(canAddTorrents(sel), true)
})

test('user edits existing path to /Downloads and clicks Season before Name', () => {
  let sel = editSavePathRoot('/Downloads')

  // Clicks Season first -> placeholder kept, button remains disabled
  sel = applySavePathSuggestion(sel, ACTIONS.S)
  assert.equal(buildSavePath(sel), '/Downloads/_/Season 3/')
  assert.equal(canAddTorrents(sel), false)

  // Clicks Name next -> placeholder replaced, button enabled
  sel = applySavePathSuggestion(sel, ACTIONS.T)
  assert.equal(buildSavePath(sel), '/Downloads/Silo/Season 3/')
  assert.equal(canAddTorrents(sel), true)
})

test('editing the root clears previous selections', () => {
  let sel = applyActions(['L', 'T', 'S'])
  assert.equal(buildSavePath(sel), '/media-library/tv/Silo/Season 3/')
  assert.equal(canAddTorrents(sel), true)

  // Manual edit to custom folder
  sel = editSavePathRoot('/custom/path')
  assert.equal(buildSavePath(sel), '/custom/path/_/')
  assert.equal(canAddTorrents(sel), false)
})

test('later clicks replace their own selection without disturbing others', () => {
  let sel = applyActions(['L', 'T', 'S'])

  sel = applySavePathSuggestion(sel, { type: 'showname', value: 'Severance' })
  assert.equal(buildSavePath(sel), '/media-library/tv/Severance/Season 3/')

  sel = applySavePathSuggestion(sel, { type: 'library', value: 'movies' })
  assert.equal(buildSavePath(sel), '/media-library/movies/Severance/Season 3/')

  sel = applySavePathSuggestion(sel, { type: 'season', value: 1 })
  assert.equal(buildSavePath(sel), '/media-library/movies/Severance/Season 1/')
})

test('repeating any selected suggestion is idempotent', () => {
  const sel = applyActions(['L', 'T', 'S'])
  const initialPath = buildSavePath(sel)

  assert.equal(buildSavePath(applySavePathSuggestion(sel, ACTIONS.L)), initialPath)
  assert.equal(buildSavePath(applySavePathSuggestion(sel, ACTIONS.T)), initialPath)
  assert.equal(buildSavePath(applySavePathSuggestion(sel, ACTIONS.S)), initialPath)
})

test('downloader changes update base path while preserving selections', () => {
  const sel = applyActions(['L', 'T', 'S'])
  assert.equal(buildSavePath(sel), '/media-library/tv/Silo/Season 3/')

  const moved = moveSavePathToBase(sel, '/var/torrents/completed')
  assert.equal(buildSavePath(moved), '/var/torrents/completed/tv/Silo/Season 3/')
  assert.equal(canAddTorrents(moved), true)
})
