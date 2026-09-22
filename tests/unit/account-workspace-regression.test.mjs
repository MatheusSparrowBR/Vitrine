import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('account workspace renders media usage without an undefined mediaUsage reference',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 assert.match(account,/mediaUsage=\{mediaUsage\}/)
 assert.match(account,/function MediaSection\(\{[^}]*mediaUsage[^}]*\}\)/)
 assert.match(account,/AccountResourceUsage businessId=\{businessId\} resource="photos"/)
 assert.match(account,/account-media-dropzone/)
 assert.match(account,/db\.from\('business_photos'\)\.insert/)
})

test('media gallery has a compact responsive layout and accessible guidance',()=>{
 const account=read('src/AccountWorkspacePage.jsx'),css=read('src/account-workspace.css')
 assert.match(account,/Galeria e identidade visual/)
 assert.match(account,/JPG, PNG, WebP, GIF, MP4 ou WebM · até 50 MB/)
 assert.match(account,/loading="lazy" decoding="async"/)
 assert.match(css,/\.account-media-grid\{[^}]*align-items:start/)
 assert.match(css,/\.account-gallery-grid\{[^}]*auto-fill/)
})

test('performance navigation lives inside the merchant account workspace',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 const header=read('src/SiteHeader.jsx')
 assert.match(account,/label="Desempenho"/)
 assert.match(account,/location\.href=`\/conta\/analytics\?business_id=/)
 assert.doesNotMatch(header,/\['analytics','Desempenho','\/conta\/analytics'\]/)
})

test('Publicidade Premium fica integrada como seção interna da Minha Conta',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 const embedded=read('src/MerchantAdvertisingWorkspaceSection.jsx')
 assert.match(account,/label="Desempenho"/)
 assert.match(account,/section==='advertising'/)
 assert.match(account,/MerchantAdvertisingWorkspaceSection/)
 assert.match(account,/data-account-premium-ad-nav/)
 assert.match(embedded,/Solicitar banner/)
 assert.match(embedded,/owner_set_advertising_request_creative/)
 assert.match(embedded,/section className="ma-sales embedded"/)
 assert.doesNotMatch(account,/location\.href='\/conta\/publicidade'/)
})
