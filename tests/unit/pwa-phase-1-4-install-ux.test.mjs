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

test('convite de instalacao fica integrado somente nas areas publicas',()=>{
  const entry=read('src/app-entry.jsx')
  const css=read('src/pwa-install.css')
  assert.ok(entry.includes('{!isAdmin&&!isStandalone&&!isPrelaunchPlans&&<PwaInstallPrompt/>}'))
  assert.match(css,/pwa-install-card/)
  assert.match(css,/prefers-reduced-motion/)
})

test('convite de instalacao evita interrupcao imediata e oferece adiamento',()=>{
  const component=read('src/PwaInstallPrompt.jsx')
  assert.match(component,/SHOW_DELAY_MS=4000/)
  assert.match(component,/DISMISS_MS=7\*24\*60\*60\*1000/)
  assert.match(component,/Agora não/)
  assert.match(component,/Leve a sua cidade com você/)
})
