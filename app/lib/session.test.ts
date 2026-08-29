import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createSessionToken,
  getAppPassword,
  isValidSessionToken,
  passwordsMatch,
} from './session.ts'

const withPassword = async (value: string | undefined, fn: () => Promise<void> | void) => {
  const previous = process.env.APP_PASSWORD
  try {
    if (value === undefined) delete process.env.APP_PASSWORD
    else process.env.APP_PASSWORD = value
    await fn()
  } finally {
    if (previous === undefined) delete process.env.APP_PASSWORD
    else process.env.APP_PASSWORD = previous
  }
}

test('getAppPassword fails closed when unset or empty', async () => {
  await withPassword(undefined, () => {
    assert.equal(getAppPassword(), null)
  })
  await withPassword('', () => {
    assert.equal(getAppPassword(), null)
  })
})

test('session token is not the literal true and rejects forgeries', async () => {
  await withPassword('correct-horse', async () => {
    const token = await createSessionToken('correct-horse')
    assert.notEqual(token, 'true')
    assert.equal(await isValidSessionToken(token), true)
    assert.equal(await isValidSessionToken('true'), false)
    assert.equal(await isValidSessionToken(undefined), false)
  })
})

test('missing APP_PASSWORD rejects every session token', async () => {
  await withPassword(undefined, async () => {
    assert.equal(await isValidSessionToken('anything'), false)
  })
})

test('password compare is length-safe and rejects mismatches', () => {
  assert.equal(passwordsMatch('secret', 'secret'), true)
  assert.equal(passwordsMatch('secret', 'Secret'), false)
  assert.equal(passwordsMatch('', 'secret'), false)
})
