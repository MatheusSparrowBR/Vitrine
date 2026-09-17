import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('admin onboarding routes and shortcuts are present',()=>{
 const entry=read('src/app-entry.jsx')
 const shell=read('src/AdminShell.jsx')
 const page=read('src/AdminOnboardingPage.jsx')
 assert.match(entry,/AdminOnboardingPage/)
 assert.match(entry,/\/admin\/novo-parceiro/)
 assert.match(entry,/\/admin\/novo-usuario/)
 assert.match(entry,/\/admin\/nova-empresa/)
 assert.match(shell,/\/admin\/novo-parceiro/)
 assert.match(shell,/\/admin\/novo-usuario/)
 assert.match(shell,/\/admin\/nova-empresa/)
 assert.match(page,/admin-onboarding/)
 assert.match(page,/create_partner/)
 assert.match(page,/create_business/)
})

test('admin onboarding uses backend-only user creation and owner-scoped business creation',()=>{
 const fn=read('supabase/functions/admin-onboarding/index.ts')
 assert.match(fn,/verify_jwt: true|Authorization/)
 assert.match(fn,/role !== 'admin'/)
 assert.match(fn,/inviteUserByEmail/)
 assert.match(fn,/role: 'business_owner'/)
 assert.match(fn,/admin\.deleteUser/)
 assert.match(fn,/action === 'create_business'/)
 assert.match(fn,/\['business_owner', 'admin'\]/)
 assert.match(fn,/admin_audit_logs/)
})

test('admin onboarding page does not expose service-role credentials',()=>{
 const page=read('src/AdminOnboardingPage.jsx')
 assert.doesNotMatch(page,/SUPABASE_SERVICE_ROLE_KEY|service_role|VITE_SUPABASE_SERVICE_ROLE/)
})
