import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseAppConfigJson, toPublicDownloader } from './contracts.ts'

const validDownloader = {
  name: 'my-qbit',
  url: 'http://192.168.1.5:8080',
  username: 'admin',
  password: 'secret',
  type: 'qbittorrent' as const,
  basePath: '/downloads',
  librarySuggestions: { tv: true, movies: false },
}
test('parseAppConfigJson accepts a complete downloader list', () => {
  const config = parseAppConfigJson(JSON.stringify({ downloaders: [validDownloader] }))
  assert.equal(config.downloaders.length, 1)
  assert.equal(config.downloaders[0].name, 'my-qbit')
})

test('parseAppConfigJson rejects empty lists, missing fields, and invalid JSON', () => {
  assert.throws(() => parseAppConfigJson('{'), /not valid JSON/)
  assert.throws(() => parseAppConfigJson('{}'), /failed validation/)
  assert.throws(() => parseAppConfigJson(JSON.stringify({ downloaders: [] })), /failed validation/)
  assert.throws(
    () =>
      parseAppConfigJson(
        JSON.stringify({
          downloaders: [{ ...validDownloader, url: 'not-a-url' }],
        })
      ),
    /invalid url/
  )
})

test('toPublicDownloader allowlists public fields only', () => {
  const publicDownloader = toPublicDownloader(validDownloader)
  assert.deepEqual(Object.keys(publicDownloader).sort(), [
    'basePath',
    'librarySuggestions',
    'name',
    'type',
    'url',
  ])
  assert.equal('password' in publicDownloader, false)
  assert.equal('username' in publicDownloader, false)
})
