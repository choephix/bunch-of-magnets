import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertPublicHttpUrl, isPrivateIp, UnsafeUrlError } from './ssrf.ts'

test('isPrivateIp flags loopback, RFC1918, link-local, CGNAT, and IPv6 local', () => {
  for (const ip of [
    '127.0.0.1',
    '0.0.0.0',
    '10.1.2.3',
    '192.168.1.1',
    '172.16.0.1',
    '172.31.255.255',
    '169.254.169.254',
    '100.64.1.1',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:192.168.0.9',
  ]) {
    assert.equal(isPrivateIp(ip), true, ip)
  }

  for (const ip of ['1.1.1.1', '8.8.8.8', '93.184.216.34']) {
    assert.equal(isPrivateIp(ip), false, ip)
  }
})

test('assertPublicHttpUrl rejects non-http, credentials, localhost, and private literals', async () => {
  const cases = [
    'ftp://example.com/a',
    'http://user:pass@example.com/a',
    'http://localhost/a',
    'http://foo.localhost/a',
    'http://127.0.0.1/a',
    'http://192.168.0.10/foo',
    'http://169.254.169.254/latest',
    'http://[::1]/',
  ]
  for (const url of cases) {
    await assert.rejects(() => assertPublicHttpUrl(url), UnsafeUrlError, url)
  }
})

test('assertPublicHttpUrl allows public IPs and hostnames that resolve publicly', async () => {
  const publicIp = await assertPublicHttpUrl('https://1.1.1.1/dns-query')
  assert.equal(publicIp.hostname, '1.1.1.1')

  const resolved = await assertPublicHttpUrl('https://tracker.example/announce', async () => [
    '1.1.1.1',
  ])
  assert.equal(resolved.hostname, 'tracker.example')
})

test('assertPublicHttpUrl rejects hostnames that resolve privately', async () => {
  await assert.rejects(
    () => assertPublicHttpUrl('https://internal.example', async () => ['10.0.0.5']),
    UnsafeUrlError
  )
})
