import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('auth never trusts an external next redirect',()=>{
 const source=read('src/AuthPage.jsx')
 assert.match(source,/function safeNext\(value\)/)
 assert.match(source,/candidate\.startsWith\('\/'\)/)
 assert.match(source,/candidate\.startsWith\('\/\/'\)/)
 assert.match(source,/url\.origin!==window\.location\.origin/)
})

test('admin city updates use RLS instead of a callable security-definer RPC',()=>{
 const source=read('src/admin-city-actions.js')
 assert.match(source,/\.from\('cities'\)\.update\(/)
 assert.doesNotMatch(source,/\.rpc\('admin_set_city_active'/)
})

test('events use the project timezone for the public date boundary',()=>{
 const source=read('src/EventsPage.jsx')
 const service=read('src/promotion-service.js')
 assert.match(source,/projectTodayISO\(\)/)
 assert.match(service,/timeZone:'America\/Sao_Paulo'/)
})

test('premium banner admin uses project timezone and active entities',()=>{
 const source=read('src/AdminPremiumBannerPage.jsx')
 assert.match(source,/PROMOTION_TZ='America\/Sao_Paulo'/)
 assert.match(source,/projectInputToISO/)
 assert.match(source,/b\.status==='active'/)
 assert.match(source,/activeCities/)
})

test('phase2 enhancements has no promotion ownership or lifecycle code',()=>{
 const source=read('src/phase2-enhancements.js')
 assert.doesNotMatch(source,/promotion-service|promotionRefreshTimer|currentPromotions|applyPromotionVisibility|loadCurrentPromotions|createAccountPromotionForm|installAccountPromotionCreator/)
})
