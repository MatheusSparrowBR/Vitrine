import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const migration=fs.readFileSync('supabase/migrations/20260923210000_add_promotion_notification_constraints.sql','utf8')
const fn=fs.readFileSync('supabase/functions/send-promotion-notification/index.ts','utf8')

test('fase 2.6.2 evita duplicar notificacao da mesma promocao para o usuario',()=>{
 assert.match(migration,/unique index if not exists notifications_user_promotion_type_uidx/)
 assert.match(migration,/notifications\(user_id, promotion_id, type\)/)
 assert.match(fn,/\.eq\('user_id', subscription\.user_id\)/)
 assert.match(fn,/\.eq\('promotion_id', promotion\.id\)/)
 assert.match(fn,/\.eq\('type', 'promotion'\)/)
 assert.match(fn,/deduplicated/)
 assert.match(fn,/\.eq\('id', notificationId\)/)
 assert.doesNotMatch(fn,/notification\.data\.id/)
 assert.match(fn,/ineligible: subscriptions\.length/)
 assert.doesNotMatch(fn,/skipped: subscriptions\.length/)
})

test('fase 2.6.2 exige promocao publicada e dono autenticado',()=>{
 assert.match(fn,/promotion\.status !== 'published'/)
 assert.match(fn,/business\.owner_id !== user\.id/)
 assert.match(fn,/promotion_id_required/)
})

test('fase 2.6.2 envia Web Push e desativa subscriptions expiradas',()=>{
 assert.match(fn,/webpush\.sendNotification/)
 assert.match(fn,/statusCode === 404 \|\| statusCode === 410/)
 assert.match(fn,/enabled: false/)
 assert.match(fn,/status: 'sent'/)
 assert.match(fn,/status: 'failed'/)
})
