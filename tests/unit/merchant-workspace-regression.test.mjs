import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('merchant workspace has a single React entrypoint',()=>{
 const account=read('src/AccountPage.jsx')
 assert.match(account,/OwnerPromotionsSection/)
 assert.match(account,/AccountResourceUsage/)
 assert.match(account,/OwnerItemForm/)
 assert.match(account,/function MediaSection\(/)
 assert.match(account,/function ItemsSection\(/)
 assert.doesNotMatch(account,/account-company\.js/)
 assert.doesNotMatch(account,/window\.prompt\(/)
 assert.equal(fs.existsSync('src/account-company.js'),false)
})

test('merchant workspace writes go through Supabase client and shared storage bucket',()=>{
 const account=read('src/AccountPage.jsx')
 const itemForm=read('src/OwnerItemForm.jsx')
 assert.match(account,/const MEDIA_BUCKET='business-media'/)
 assert.match(account,/(?:supabase|db)\.storage\.from\(MEDIA_BUCKET\)\.upload/)
 assert.match(account,/db\.from\('business_photos'\)\.insert/)
 assert.match(account,/OwnerItemForm/)
 assert.match(itemForm,/db\.from\('business_items'\)\.insert/)
 assert.match(itemForm,/business-media|MEDIA_BUCKET/)
 assert.doesNotMatch(itemForm,/window\.prompt\(/)
})
