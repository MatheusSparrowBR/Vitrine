import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=new URL('../../',import.meta.url)
const read=path=>fs.readFileSync(new URL(path,root),'utf8')

test('catalog resources use reusable usage graphs',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 const usage=read('src/AccountResourceUsage.jsx')
 assert.match(account,/AccountResourceUsage/)
 assert.match(account,/resource="photos"/)
 assert.match(account,/resource="items"/)
 assert.match(usage,/RESOURCE_COPY/)
 assert.match(usage,/photos:/)
 assert.match(usage,/items:/)
 assert.match(usage,/getPlanCycleFeatureUsage/)
})

test('products and services no longer use browser prompts',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 assert.doesNotMatch(account,/function addItem\(/)
 assert.doesNotMatch(account,/window\.prompt\([^)]*(produto|serviço)/i)
})

test('product and service form validates type, image, price and plan enforcement',()=>{
 const form=read('src/OwnerItemForm.jsx')
 assert.match(form,/type:form\.type/)
 assert.match(form,/business_items/)
 assert.match(form,/image_path/)
 assert.match(form,/price,active/)
 assert.match(form,/limit===0/)
 assert.match(form,/usedCount>=limit/)
 assert.match(form,/getPlanCycleFeatureUsage/)
 assert.match(form,/editing\?await db\.from\('business_items'\)\.update/)
 assert.match(form,/Alterações não consomem nova unidade do ciclo/)
})

test('public business profile keeps products and services in separate sections',()=>{
 const profile=read('src/ModernBusinessProfilePage.jsx')
 assert.match(profile,/normalizeItemType/)
 assert.match(profile,/data-offer-type="products"/)
 assert.match(profile,/data-offer-type="services"/)
 assert.match(profile,/products\.filter|normalized\.filter\(i=>i\.__normalizedType==='product'\)/)
 assert.match(profile,/services\.filter|normalized\.filter\(i=>i\.__normalizedType==='service'\)/)
 assert.doesNotMatch(profile,/PRODUTOS E SERVIÇOS.*O que a empresa oferece/s)
})

test('media adaptation does not double-adapt catalog item uploads',()=>{
 const adapter=read('src/media-adapter.js')
 assert.match(adapter,/input\.closest\('\.vl-item-file'\)\)return/)
})

test('media add control is disabled at plan limit',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 assert.match(account,/mediaUsage/)
 assert.match(account,/const mediaReached=Boolean\(mediaUsage\?\.reached\)/)
 assert.match(account,/disabled=\{mediaReached\}/)
})
