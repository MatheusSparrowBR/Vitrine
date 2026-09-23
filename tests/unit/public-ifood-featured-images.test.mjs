import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('homepage featured businesses loads profile logos and uses them before cover images',()=>{
 const page=fs.readFileSync('src/CityHomePage.jsx','utf8')
 assert.match(page,/cover_url,logo_url,address,featured/)
 assert.match(page,/b\.logo_url\?/)
 assert.match(page,/className='lvp-business-logo'/)
})

test('featured business profile images are centered and fully visible',()=>{
 const css=fs.readFileSync('src/public-home.css','utf8')
 assert.match(css,/\.lvp-business-image\.has-profile-logo/)
 assert.match(css,/\.lvp-business-image\.has-profile-logo/)
 assert.match(css,/object-fit:contain/)
 assert.match(css,/max-width:100%/)
 assert.match(css,/max-height:100%/)
 assert.match(css,/object-position:center/)
})

test('modern public business profile exposes iFood only when a link exists',()=>{
 const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')
 const css=fs.readFileSync('src/modern-business-profile-ux.css','utf8')
 assert.match(page,/business\.ifood_url&&/)
 assert.match(page,/data-track="ifood"/)
 assert.match(page,/iFood/)
 assert.doesNotMatch(page,/mbp-ifood-mark/)
 assert.doesNotMatch(page,/data-track="save"/)
 assert.match(page,/className="mbp-secondary-action" data-track="ifood"/)
})


test('public business directory keeps guest reads on the public view',()=>{
 const migration=fs.readFileSync('supabase/migrations/20260923093000_fix_public_business_directory_guest_access.sql','utf8')
 assert.match(migration,/public_business_directory set \(security_invoker = false\)/)
 assert.match(migration,/grant select on public\.public_business_directory to anon, authenticated/)
})


test('public business directory exposes iFood URLs for active businesses',()=>{
 const migration=fs.readFileSync('supabase/migrations/20260923094500_expose_ifood_in_public_business_directory.sql','utf8')
 assert.match(migration,/b\.ifood_url/)
 assert.match(migration,/create or replace view public\.public_business_directory/)
})
