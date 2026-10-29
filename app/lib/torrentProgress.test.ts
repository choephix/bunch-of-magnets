import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toTorrentProgress } from './torrentProgress.ts'

test('checking percentage never becomes download progress or premature completion', () => {
  const snapshots = [
    { state: 'checkingResumeData', progress: 0.5, completed: 0 },
    { state: 'checkingDL', progress: 1, completed: 0 },
    { state: 'downloading', progress: 0.2, completed: 200 },
    { state: 'checkingDL', progress: 0.8, completed: 200 },
    { state: 'stoppedDL', progress: 0.2, completed: 200 },
  ]
  assert.deepEqual(
    snapshots.map((snapshot) => toTorrentProgress({ size: 1000, ...snapshot }).progress),
    [0, 0, 0.2, 0.2, 0.2]
  )
})

test('finished downloads stay complete when seeding, stopped, or rechecking', () => {
  const snapshots = [
    { state: 'downloading', progress: 1, completed: 1000 },
    { state: 'uploading', progress: 1, completed: 1000 },
    { state: 'stoppedUP', progress: 1, completed: 1000 },
    { state: 'checkingUP', progress: 0.4, completed: 400 },
    { state: 'pausedUP', progress: 1, completed: 1000 },
  ]
  assert.deepEqual(
    snapshots.map((snapshot) => toTorrentProgress({ size: 1000, ...snapshot }).progress),
    [1, 1, 1, 1, 1]
  )
})

test('download completion uses selected content, not all files or lifetime transferred bytes', () => {
  assert.equal(
    toTorrentProgress({
      state: 'checkingDL',
      progress: 0.9,
      size: 200,
      completed: 100,
      total_size: 1000,
      downloaded: 500,
    }).progress,
    0.5
  )
})

test('metadata with no known content size has no download progress', () => {
  assert.equal(toTorrentProgress({ state: 'metaDL', size: 0, progress: 0.5 }).progress, 0)
})
