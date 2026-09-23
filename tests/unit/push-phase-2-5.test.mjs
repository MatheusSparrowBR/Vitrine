import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const fn=fs.readFileSync('supabase/functions/send-push-test/index.ts','utf8')

test('fase 2.5 exige autenticação de usuário e VAPID somente no servidor',()=>{
 assert.match(fn,/withSupabase\(\{ auth: 'user' \}/)
 assert.match(fn,/VAPID_PRIVATE_KEY/)
 assert.match(fn,/VAPID_PUBLIC_KEY/)
 assert.match(fn,/VAPID_SUBJECT/)
 assert.doesNotMatch(fn,/VITE_VAPID_PRIVATE|service_role/i)
})

test('fase 2.5 envia Push usando subscriptions ativas do usuário',()=>{
 assert.match(fn,/from\('push_subscriptions'\)/)
 assert.match(fn,/eq\('user_id', ctx\.userClaims\?\.sub\)/)
 assert.match(fn,/eq\('enabled', true\)/)
 assert.match(fn,/webpush\.sendNotification\(/)
 assert.match(fn,/title: 'VitrineLocal'/)
 assert.match(fn,/tag: 'vitrine-local-push-test'/)
})

test('fase 2.5 desativa subscriptions expiradas',()=>{
 assert.match(fn,/statusCode === 404 \|\| statusCode === 410/)
 assert.match(fn,/update\(\{[\s\S]*enabled: false/)
})
