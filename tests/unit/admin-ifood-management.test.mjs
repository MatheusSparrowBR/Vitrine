import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('admin business editing exposes and persists iFood',()=>{
 const content=fs.readFileSync('src/AdminBusinessesPage.jsx','utf8')
 assert.match(content,/ifood_url:'')
 assert.match(content,/ifood_url:b\.ifood_url\|\|''/)
 assert.match(content,/label>iFood/)
 assert.match(content,/ifood_url:form\.ifood_url\.trim\(\)\|\|null/)
})

test('admin business creation exposes iFood and onboarding persists it',()=>{
 const page=fs.readFileSync('src/AdminOnboardingPage.jsx','utf8')
 const fn=fs.readFileSync('supabase/functions/admin-onboarding/index.ts','utf8')
 assert.match(page,/ifood_url:'')
 assert.match(page,/label>iFood/)
 assert.match(page,/business\.ifood_url/)
 assert.match(fn,/ifood_url: nullable\(params\.ifood_url\)/)
})
