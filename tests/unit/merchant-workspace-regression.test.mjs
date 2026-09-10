import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('merchant workspace has a single React entrypoint',()=>{
 const account=read('src/AccountPage.jsx')
 assert.match(account,/OwnerPromotionsSection/)
 assert.match(account,/function MediaSection\(/)
 assert.match(account,/function ItemsSection\(/)
 assert.doesNotMatch(account,/account-company\.js/)
 assert.equal(fs.existsSync('src/account-company.js'),false)
})

test('merchant workspace writes go through Supabase client and shared storage bucket',()=>{
 const account=read('src/AccountPage.jsx')
 assert.match(account,/const MEDIA_BUCKET='business-media'/)
 assert.match(account,/supabase\.storage\.from\(MEDIA_BUCKET\)\.upload/)
 assert.match(account,/supabase\.from\('business_photos'\)\.insert/)
 assert.match(account,/supabase\.from\('business_items'\)\.insert/)
})
