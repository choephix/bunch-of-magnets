import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSavePath, findSavePathTitle, relativeSegments } from './savePath.ts'

const BASE = '/downloads'
const LIBRARIES = ['movies', 'tv']

const title = (savePath: string) => findSavePathTitle(savePath, BASE, LIBRARIES)

test('no title until a show or movie name is in the path', () => {
  assert.equal(title(''), '')
  assert.equal(title('/downloads/'), '')
  assert.equal(title('/downloads/_/'), '')
  assert.equal(title('/downloads/tv/'), '')
  assert.equal(title('/downloads/tv/_/'), '')
  assert.equal(title('/downloads/_/Season 2/'), '')
  assert.equal(title('/downloads/tv/Season 2/'), '')
  assert.equal(title('/downloads/TV/season2/'), '')
})

test('title is found at any depth, pill-built or hand-typed', () => {
  assert.equal(title('/downloads/Severance/'), 'Severance')
  assert.equal(title('/downloads/tv/Severance/'), 'Severance')
  assert.equal(title('/downloads/tv/Severance/Season 2/'), 'Severance')
  assert.equal(title('/downloads/movies/Dune Part Two (2024)/'), 'Dune Part Two (2024)')
  assert.equal(title('/downloads/_/Severance/'), 'Severance')
})

test('a path outside basePath is taken as the user typing their own destination', () => {
  assert.equal(title('/mnt/media/Severance/'), 'mnt')
})

test('titles that look like a season number are not mistaken for a season folder', () => {
  assert.equal(title('/downloads/tv/1923/'), '1923')
  assert.equal(title('/downloads/movies/Season of the Witch/'), 'Season of the Witch')
})

test('relativeSegments strips basePath and empty segments', () => {
  assert.deepEqual(relativeSegments('/downloads/tv/Severance/', BASE), ['tv', 'Severance'])
  assert.deepEqual(relativeSegments('/downloads//tv///', BASE), ['tv'])
  assert.deepEqual(relativeSegments('/elsewhere/tv/', BASE), ['elsewhere', 'tv'])
})

test('buildSavePath keeps one separator per slot and a trailing slash', () => {
  assert.equal(buildSavePath('/downloads/', ['tv', 'Severance']), '/downloads/tv/Severance/')
  assert.equal(buildSavePath('/downloads', ['_', 'Season 2']), '/downloads/_/Season 2/')
})
