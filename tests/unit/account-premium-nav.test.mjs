import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL(`../../${p}`,import.meta.url),'utf8')

test('Publicidade Premium é um item interno do menu lateral da Minha Conta',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 const app=read('src/app-entry.jsx')
 const css=read('src/account-premium-ad-shortcut.css')
 assert.match(account,/PremiumAdvertisingNavItem/)
 assert.match(account,/section==='advertising'/)
 assert.match(account,/MerchantAdvertisingWorkspaceSection/)
 assert.match(account,/data-account-premium-ad-nav/)
 assert.doesNotMatch(account,/location\.href='\/conta\/publicidade'/)
 assert.doesNotMatch(app,/account-premium-nav\.js/)
 assert.equal(fs.existsSync(new URL('../../src/account-premium-nav.js',import.meta.url)),false)
 assert.match(css,/\.account-premium-nav-item/)
})
