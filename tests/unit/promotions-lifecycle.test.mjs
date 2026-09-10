import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('promotion visibility is no longer controlled by phase2 DOM code',()=>{
 const source=read('src/phase2-enhancements.js')
 assert.doesNotMatch(source,/applyPromotionVisibility|loadCurrentPromotions|promotionRefreshTimer|currentPromotions|promotionKey|promotionNameKey/)
 assert.doesNotMatch(source,/\.promotion-card.*remove|querySelectorAll\(.*promotion/)
})

test('React owns the public promotion data flow',()=>{
 const service=read('src/promotion-service.js')
 const home=read('src/CityHomePage.jsx')
 const catalog=read('src/PublicCatalogPages.jsx')
 const profile=read('src/ModernBusinessProfilePage.jsx')
 assert.match(service,/export async function getActiveCityPromotions/)
 assert.match(service,/export async function getActiveBusinessPromotions/)
 assert.match(home,/getActiveCityPromotions\(db,city\.id/)
 assert.match(home,/DEFAULT_PROMOTION_IMAGE/)
 assert.match(catalog,/getActiveCityPromotions\(db,c\.id/)
 assert.match(profile,/getActiveBusinessPromotions\(db,b\.id/)
})

test('public promotion service enforces published status and active period',()=>{
 const source=read('src/promotion-service.js')
 assert.match(source,/promotion\.status!=='published'/)
 assert.match(source,/start!==null&&start>now/)
 assert.match(source,/end!==null&&end<=now/)
 assert.match(source,/\.eq\('status','published'\)/)
 assert.match(source,/\.eq\('status','active'\)/)
})

test('promotion image fallback exists',()=>{
 const service=read('src/promotion-service.js')
 assert.match(service,/DEFAULT_PROMOTION_IMAGE='\/promotion-default\.svg'/)
 assert.equal(fs.existsSync('public/promotion-default.svg'),true)
})
