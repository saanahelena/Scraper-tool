import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { default: BookCover } = await server.ssrLoadModule('/src/components/BookCover.jsx')
  const { getApprovedCoverUrl } = await server.ssrLoadModule('/src/lib/coverPermissions.js')
  const approved = {
    image_url: 'https://books.toscrape.com/media/cache/test.jpg',
    permission_status: 'approved',
    permission_reference: 'Synthetic test evidence; not a real approval',
  }
  const render = (cover) => renderToStaticMarkup(createElement(BookCover, { cover, title: 'Test title' }))
  assert.equal(render(undefined), '')
  assert.equal(render({ ...approved, permission_status: 'pending' }), '')
  assert.equal(render({ ...approved, permission_status: 'denied' }), '')
  assert.equal(render({ ...approved, permission_reference: '' }), '')
  assert.equal(render({ ...approved, permission_reference: null }), '')
  for (const image_url of ['javascript:alert(1)', 'https://evil.example/cover.jpg', 'http://books.toscrape.com/media/test.jpg', 'https://books.toscrape.com.evil.example/media/test.jpg', 'https://user:password@books.toscrape.com/media/test.jpg', 'https://books.toscrape.com/catalogue/test.html', 'not a url']) {
    assert.equal(getApprovedCoverUrl({ ...approved, image_url }), null)
    assert.equal(render({ ...approved, image_url }), '')
  }
  const html = render(approved)
  assert.match(html, /<img/)
  assert.match(html, /loading="lazy"/)
  assert.match(html, /referrerPolicy="no-referrer"/i)
  assert.match(html, /alt="Cover of Test title"/)
  console.log('Cover permission, missing-metadata, host/protocol, and rendering checks passed. No image downloads made.')
} finally {
  await server.close()
}
