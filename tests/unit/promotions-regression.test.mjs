import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL(`../../${path}`,import.meta.url),'utf8')

test('promotion runtime does not remove React cards before data is loaded',()=>{
 const source=read('src/phase2-enhancements.js')
 assert.match(source,/let promotionsLoaded = false/)
 assert.match(source,/function applyPromotionVisibility\(\)\{\s*if\(!promotionsLoaded\)return/)
 assert.match(source,/promotionsLoaded=false/)
})

test('promotion forms persist the storage path with the image URL',()=>{
 const account=read('src/phase2-enhancements.js')
 const admin=read('src/AdminPromotionsPage.jsx')
 assert.match(account,/image_url:imageUrl,image_path:imagePath/)
 assert.match(admin,/select\('id,business_id,title,description,image_url,image_path,price,original_price/)
 assert.match(admin,/image_url:imageUrl,image_path:imagePath/)
})

test('public promotion surfaces enforce the same active-period rule',()=>{
 const home=read('src/CityHomePage.jsx')
 const catalog=read('src/PublicCatalogPages.jsx')
 const profile=read('src/ModernBusinessProfilePage.jsx')
 assert.match(home,/setPromotions\(\(p\.data\|\|\[\]\)\.filter\(isPromotionCurrent\)\)/)
 assert.match(catalog,/setItems\(\(data\|\|\[\]\)\.filter\(isPromotionCurrent\)\)/)
 assert.match(profile,/setPromotions\(\(pr\.data\|\|\[\]\)\.filter\(isPromotionCurrent\)\)/)
})

test('promotion route resolves to the public PromotionsPage component',()=>{
 const app=read('src/app-entry.jsx')
 assert.ok(app.includes("if(route.kind==='promotions')return <PromotionsPage citySlug={route.citySlug}/>") || app.includes("if(route.kind==='promotions')return <PromotionsPage citySlug={route.citySlug}/>"))
})
