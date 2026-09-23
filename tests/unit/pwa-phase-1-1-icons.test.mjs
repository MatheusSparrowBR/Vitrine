import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')

test('PWA usa a identidade VitrineLocal nos icones instaláveis', () => {
  const manifest = JSON.parse(read('public/site.webmanifest'))
  const icons = manifest.icons || []

  assert.ok(icons.some(icon => icon.src === '/icons/vitrine-local.svg' && icon.sizes === '192x192'))
  assert.ok(icons.some(icon => icon.src === '/icons/vitrine-local.svg' && icon.sizes === '512x512'))
  assert.ok(icons.some(icon => icon.src === '/icons/vitrine-local-maskable.svg' && icon.purpose === 'maskable'))
  assert.ok(fs.existsSync('public/icons/vitrine-local.svg'))
  assert.ok(fs.existsSync('public/icons/vitrine-local-maskable.svg'))
})

test('icones PWA sao SVG escalaveis e mantem a marca', () => {
  for (const path of ['public/icons/vitrine-local.svg', 'public/icons/vitrine-local-maskable.svg']) {
    const svg = read(path)
    assert.match(svg, /^<svg[^>]+viewBox="0 0 512 512"/)
    assert.match(svg, /Vitrine/)
    assert.match(svg, /Local/)
  }
})
