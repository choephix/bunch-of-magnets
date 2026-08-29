import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  dedupeMagnetLinks,
  extractInfoHash,
  magnetIdentity,
  parseMagnetLinks,
  type MagnetLink,
} from './magnet.ts'

const hex = '0123456789abcdef0123456789abcdef01234567'
const hexMagnet = `magnet:?xt=urn:btih:${hex}&dn=Show.S01E01`
const hexMagnetOtherTracker = `magnet:?xt=urn:btih:${hex.toUpperCase()}&tr=udp://tracker.example/announce`
const otherHex = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const otherMagnet = `magnet:?xt=urn:btih:${otherHex}&dn=Other`

const link = (magnetUrl: string, displayName = 'x'): MagnetLink => ({
  magnetUrl,
  displayName,
  ignore: false,
})

test('extractInfoHash lowercases 40-char hex and ignores missing hashes', () => {
  assert.equal(extractInfoHash(hexMagnetOtherTracker), hex)
  assert.equal(extractInfoHash('magnet:?xt=urn:btmh:tree'), null)
  assert.equal(extractInfoHash('not-a-magnet'), null)
})

test('extractInfoHash decodes 32-char base32 btih to 40-char hex', () => {
  const decoded = extractInfoHash('magnet:?xt=urn:btih:AHQ4Y3RFTL57Z4A2I5SDH7L7XYU2Z3EI')
  assert.equal(decoded?.length, 40)
  assert.match(decoded ?? '', /^[a-f0-9]{40}$/)
  assert.equal(extractInfoHash('magnet:?xt=urn:btih:AHQ4Y3RFTL57Z4A2I5SDH7L7XYU2Z3E!'), null)
})

test('dedupeMagnetLinks uses infohash identity and updates within the incoming batch', () => {
  const existing = [link(hexMagnet, 'existing')]
  const incoming = [
    link(hexMagnetOtherTracker, 'same hash'),
    link(otherMagnet, 'other'),
    link(`magnet:?xt=urn:btih:${otherHex}&dn=dup-in-batch`, 'dup'),
  ]
  const unique = dedupeMagnetLinks(existing, incoming)
  assert.equal(unique.length, 1)
  assert.equal(magnetIdentity(unique[0].magnetUrl), otherHex)
})

test('parseMagnetLinks keeps only magnet lines and decodes display names', () => {
  const parsed = parseMagnetLinks(`${hexMagnet}\nhttps://example.com\n${otherMagnet}\n`)
  assert.equal(parsed.length, 2)
  assert.equal(parsed[0].displayName, 'Show.S01E01')
})
