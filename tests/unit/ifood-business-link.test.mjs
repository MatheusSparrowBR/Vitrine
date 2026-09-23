import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('iFood link is optional in business registration and account editing',()=>{
  const registration=read('src/BusinessRegistrationPage.jsx')
  const account=read('src/AccountWorkspacePage.jsx')
  assert.match(registration,/ifood_url:'',/)
  assert.match(registration,/label>iFood/)
  assert.match(registration,/ifood_url:form\.ifood_url\.trim\(\)\|\|null/)
  assert.match(account,/ifood_url:'',/)
  assert.match(account,/Field label="iFood"/)
  assert.match(account,/form\.ifood_url/)
})

test('public business profile only renders the iFood action when a URL exists',()=>{
  const profile=read('src/PublicCatalogPages.jsx')
  assert.match(profile,/business\.ifood_url&&<a className="outline ifood-button"/)
  assert.match(profile,/Pedir pelo iFood/)
})

test('iFood action follows the existing public profile button styling',()=>{
  const css=read('src/core.css')
  assert.match(css,/\.ifood-button\{gap:7px\}/)
  assert.match(css,/\.ifood-mark\{[^}]*background:#ea1d2c/)
})
