import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')

test('PWA manifest exposes install metadata', () => {
  const manifest = JSON.parse(read('public/site.webmanifest'))
  assert.equal(manifest.name, 'VitrineLocal')
  assert.equal(manifest.short_name, 'VitrineLocal')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.scope, '/')
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0)
})

test('service worker is present and scoped to the VitrineLocal origin', () => {
  const sw = read('public/sw.js')
  assert.match(sw, /addEventListener\\(['"]install['"]/)
  assert.match(sw, /addEventListener\\(['"]activate['"]/)
  assert.match(sw, /addEventListener\\(['"]fetch['"]/)
  assert.match(sw, /self\\.skipWaiting\\(\\)/)
  assert.match(sw, /self\\.clients\\.claim\\(\\)/)
})

test('application registers the PWA service worker without making it mandatory', () => {
  const register = read('src/pwa-register.js')
  const entry = read('src/app-entry.jsx')
  assert.match(register, /navigator\\.serviceWorker\\.register/)
  assert.match(entry, /pwa-register\\.js/)
  assert.match(entry, /registerPwa\\(\\)/)
})
