import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('admin-owned businesses remain unlimited and feature-gated resources stay enabled',()=>{
 const migration=read('supabase/migrations/20260916194000_admin_owned_feature_access_and_security_hardening_v2.sql')
 const usage=read('src/plan-cycle-usage.js')
 assert.match(migration,/private\.is_admin_owned_business\(p_business_id\) then -1/)
 assert.match(migration,/private\.is_admin_owned_business\(p_business_id\) then true/)
 assert.match(migration,/private\.business_has_feature/)
 assert.match(migration,/grant execute on function private\.is_admin_owned_business\(uuid\) to authenticated/)
 assert.match(migration,/grant execute on function private\.business_has_feature\(uuid,text\) to authenticated/)
 assert.match(usage,/rawLimit<0\?ADMIN_UNLIMITED_LIMIT/)
})

test('admin business delete RPC is not anonymously callable',()=>{
 const migration=read('supabase/migrations/20260916194000_admin_owned_feature_access_and_security_hardening_v2.sql')
 assert.match(migration,/revoke execute on function public\.delete_business_admin\(uuid\) from anon/i)
 assert.match(migration,/grant execute on function public\.delete_business_admin\(uuid\) to authenticated/i)
})
