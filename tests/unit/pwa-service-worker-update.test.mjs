import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

const source=fs.readFileSync(new URL('../../src/pwa-register.js',import.meta.url),'utf8')

test('PWA atualiza o Service Worker automaticamente',()=>{
  assert.match(source,/registration\.update\(\)/)
  assert.match(source,/registration\.addEventListener\('updatefound'/)
  assert.match(source,/newWorker\.postMessage\(\{ type: 'SKIP_WAITING' \}\)/)
  assert.match(source,/navigator\.serviceWorker\.addEventListener\('controllerchange'/)
  assert.match(source,/setInterval\(update, UPDATE_INTERVAL_MS\)/)
  assert.match(source,/version=delivery-feedback-v7/)
})

test('primeira visita não recarrega a página quando o Service Worker assume',()=>{
  assert.match(source,/const wasControlled = Boolean\(navigator\.serviceWorker\.controller\)/)
  assert.match(source,/let controlled = wasControlled \|\| Boolean\(navigator\.serviceWorker\.controller\)/)
  const change=source.slice(source.indexOf("addEventListener('controllerchange'"))
  assert.ok(change.indexOf('if (!controlled)')>0&&change.indexOf('if (!controlled)')<change.indexOf('window.location.reload()'))
})
