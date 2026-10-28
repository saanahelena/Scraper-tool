import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { parseBookshelf } = await server.ssrLoadModule('/src/hooks/useBookshelf.js')
  const valid = { id: 3, title: 'A Light in the Attic', price: 51.77 }
  assert.deepEqual(parseBookshelf(null), [])
  assert.deepEqual(parseBookshelf('broken JSON'), [])
  assert.deepEqual(parseBookshelf('{}'), [])
  assert.deepEqual(parseBookshelf(JSON.stringify([valid, valid, null, { id: -1, title: 'Invalid', price: 3 }, { id: 4, title: '', price: 2 }, { id: 5, title: 'Invalid', price: '12' } ])), [valid])
  assert.deepEqual(parseBookshelf(JSON.stringify([{ ...valid, unexpected: 'not persisted' }])), [valid])
  assert.deepEqual(parseBookshelf(JSON.stringify([{ ...valid, price: null }])), [{ ...valid, price: null }])
  assert.equal(parseBookshelf(JSON.stringify(Array.from({ length: 1005 }, (_, i) => ({ id: i + 1, title: 'Test title', price: 1 })))).length, 1000)
  console.log('Bookshelf parsing checks passed: valid data, corruption, invalid records, duplicate IDs, allowed fields, and size limit.')
} finally { await server.close() }
