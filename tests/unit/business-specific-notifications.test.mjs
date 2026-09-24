import fs from 'node:fs'
import assert from 'node:assert/strict'

const profile=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')
const fn=fs.readFileSync('supabase/functions/send-promotion-notification/index.ts','utf8')
const migration=fs.readFileSync('supabase/migrations/20260924030000_business_notification_subscriptions.sql','utf8')

assert.match(profile,/business_notification_subscriptions/)
assert.match(profile,/Ativar notificações/)
assert.match(profile,/createPushSubscription/)
assert.match(profile,/syncPushSubscription/)
assert.match(profile,/Notification\.requestPermission/)
assert.match(fn,/business_notification_subscriptions/)
assert.match(fn,/business_enabled/)
assert.match(fn,/followedUserIds/)
assert.match(migration,/create table if not exists public\.business_notification_subscriptions/)
assert.match(migration,/auth\.uid\(\) = user_id/)
assert.match(migration,/primary key \(user_id,business_id\)/)

console.log('business-specific notifications tests passed')
