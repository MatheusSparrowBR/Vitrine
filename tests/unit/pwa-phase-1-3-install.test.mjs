import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('convite de instalacao usa beforeinstallprompt e appinstalled',()=>{
  const js=read('src/pwa-install.js')
  const component=read('src/PwaInstallPrompt.jsx')
  assert.match(js,/beforeinstallprompt/)
  assert.match(js,/appinstalled/)
  assert.match(js,/promptPwaInstall/)
  assert.match(component,/Instalar agora/)
  assert.match(component,/Adicionar à Tela de Início/)
})

test('convite de instalacao fica integrado ao app e usa identidade VitrineLocal',()=>{
  const entry=read('src/app-entry.jsx')
  const css=read('src/pwa-install.css')
  assert.match(entry,/PwaInstallPrompt/)
  assert.match(css,/pwa-install-card/)
  assert.match(css,/1677ff/)
})
