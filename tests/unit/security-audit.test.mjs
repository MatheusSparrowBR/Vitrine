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
 assert.match(source,/.from\('cities'\)\.update\(/)
 assert.doesNotMatch(source,/.rpc\('admin_set_city_active'/)
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

test('profile moderation status is protected by a database migration',()=>{
 const source=read('supabase/migrations/20260915180000_protect_profile_moderation_status.sql')
 assert.match(source,/protect_profile_moderation_fields/)
 assert.match(source,/new\.account_status := old\.account_status/)
 assert.match(source,/new\.status_reason := old\.status_reason/)
 assert.match(source,/new\.status_updated_by := old\.status_updated_by/)
 assert.match(source,/trg_protect_profile_moderation_status/)
})

test('billing events admin read has both RLS and authenticated table grant',()=>{
 const migration=read('supabase/migrations/20260916122000_grant_admin_select_billing_events.sql')
 assert.match(migration,/grant select on table public\.billing_events to authenticated;/)
})

test('private helper functions revoke direct client execution',()=>{
 const migration=read('supabase/migrations/20260916150000_revoke_private_helper_execute_access.sql')
 assert.match(migration,/revoke execute on function private\.is_admin\(\) from anon, authenticated;/)
 assert.match(migration,/revoke execute on function private\.is_business_owner\(uuid\) from anon, authenticated;/)
 assert.match(migration,/revoke execute on function private\.business_has_feature\(uuid, text\) from anon, authenticated;/)
 assert.match(migration,/revoke execute on function private\.get_business_plan_cycle\(uuid\) from anon, authenticated;/)
})
