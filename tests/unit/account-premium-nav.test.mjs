import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL(`../../${p}`,import.meta.url),'utf8')

test('Publicidade Premium é um item real do menu lateral da Minha Conta',()=>{
 const nav=read('src/account-premium-nav.js')
 const css=read('src/account-premium-ad-shortcut.css')
 assert.match(nav,/account-sidebar-nav/)
 assert.match(nav,/\/conta\/publicidade/)
 assert.match(nav,/account-premium-nav-item/)
 assert.match(nav,/insertBefore\(item,media\)/)
 assert.match(css,/\.account-premium-ad-shortcut\{display:none!important\}/)
 assert.match(css,/\.account-premium-nav-item/)
})
