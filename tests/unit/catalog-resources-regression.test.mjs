import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=new URL('../../',import.meta.url)
const read=path=>fs.readFileSync(new URL(path,root),'utf8')

test('catalog resources use reusable usage graphs',()=>{
 const account=read('src/AccountPage.jsx')
 const usage=read('src/AccountResourceUsage.jsx')
 assert.match(account,/AccountResourceUsage/)
 assert.match(account,/resource="photos"/)
 assert.match(account,/resource="items"/)
 assert.match(usage,/RESOURCE_COPY/)
 assert.match(usage,/photos:/)
 assert.match(usage,/items:/)
 assert.match(usage,/get_effective_plan_id/)
})

test('products and services no longer use browser prompts',()=>{
 const account=read('src/AccountPage.jsx')
 assert.doesNotMatch(account,/function addItem\(/)
 assert.doesNotMatch(account,/window\.prompt\([^)]*(produto|serviço)/i)
})

test('product service form includes type, image and plan enforcement',()=>{
 const form=read('src/OwnerItemForm.jsx')
 assert.match(form,/type:form\.type/)
 assert.match(form,/business_items/)
 assert.match(form,/image_path/)
 assert.match(form,/limit<=0/)
 assert.match(form,/activeCount>=limit/)
})

test('media add control is disabled at plan limit',()=>{
 const account=read('src/AccountPage.jsx')
 assert.match(account,/mediaUsage\.reached/)
 assert.match(account,/disabled=\{mediaUsage\.reached\}/)
})
