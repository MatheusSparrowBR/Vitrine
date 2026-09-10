import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('home and public listing both use the shared promotion service',()=>{
 const home=read('src/CityHomePage.jsx')
 const catalog=read('src/PublicCatalogPages.jsx')
 assert.match(home,/getActiveCityPromotions\(db,city\.id/)
 assert.match(catalog,/getActiveCityPromotions\(db,c\.id/)
})

test('home promotion cards are complete without DOM post-processing',()=>{
 const home=read('src/CityHomePage.jsx')
 assert.match(home,/p\.image_url\|\|DEFAULT_PROMOTION_IMAGE/)
 assert.match(home,/p\.businesses\?\.name/)
 assert.match(home,/p\.original_price/)
 assert.match(home,/p\.price/)
})

test('promotion service guards publication, dates and active business',()=>{
 const source=read('src/promotion-service.js')
 assert.match(source,/\.eq\('status','published'\)/)
 assert.match(source,/\.eq\('status','active'\)/)
 assert.match(source,/filter\(p=>isPromotionCurrent\(p,now\)\)/)
 assert.match(source,/p\.businesses&&isPromotionCurrent/)
})

test('promotion status changes remain governed by database workflow',()=>{
 const account=read('src/AccountPage.jsx')
 const admin=read('src/AdminPromotionsPage.jsx')
 assert.match(account,/status:'pending_review'/)
 assert.match(admin,/quickStatus\(row,status\)/)
 assert.match(admin,/status,updated_at:new Date\(\)\.toISOString\(\)/)
})
