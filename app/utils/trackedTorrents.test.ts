import assert from 'node:assert/strict'
import { test } from 'node:test'
import { trackAddedTorrents } from './trackedTorrents.ts'

const firstHash = 'a'.repeat(40)
const secondHash = 'b'.repeat(40)
const thirdHash = 'c'.repeat(40)

test('successful batches append in first-added order and deduplicate hashes case-insensitively', () => {
  const firstBatch = trackAddedTorrents(new Map(), 'home', [
    firstHash.toUpperCase(),
    secondHash,
    firstHash,
  ])
  const secondBatch = trackAddedTorrents(firstBatch, 'home', [
    secondHash.toUpperCase(),
    thirdHash.toUpperCase(),
    thirdHash,
    firstHash,
  ])

  assert.deepEqual(secondBatch.get('home'), [firstHash, secondHash, thirdHash])
  assert.deepEqual(firstBatch.get('home'), [firstHash, secondHash])
})

test('each downloader keeps its own session list, including the same hash on different clients', () => {
  const homeBatch = trackAddedTorrents(new Map(), 'home', [firstHash])
  const remoteBatch = trackAddedTorrents(homeBatch, 'remote', [firstHash, secondHash])
  const nextHomeBatch = trackAddedTorrents(remoteBatch, 'home', [thirdHash])

  assert.deepEqual(nextHomeBatch.get('home'), [firstHash, thirdHash])
  assert.deepEqual(nextHomeBatch.get('remote'), [firstHash, secondHash])
  assert.deepEqual(remoteBatch.get('home'), [firstHash])
  assert.equal(homeBatch.has('remote'), false)
})
