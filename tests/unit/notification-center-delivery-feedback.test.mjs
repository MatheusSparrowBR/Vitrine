import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
import path from'node:path'
const root=process.cwd()

test('notification center supports type, city, category and unread filters',()=>{
 const source=fs.readFileSync(path.join(root,'src/NotificationCenter.jsx'),'utf8')
 assert.match(source,/TYPE_OPTIONS/)
 assert.match(source,/target_city_id/)
 assert.match(source,/target_category_id/)
 assert.match(source,/unreadOnly/)
 assert.match(source,/notification-center-/)
 assert.match(source,/postgres_changes/)
})

test('notification delivery feedback stores a token hash and acknowledges from service worker',()=>{
 const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260924010000_notifications_controls.sql'),'utf8')
 const sender=fs.readFileSync(path.join(root,'supabase/functions/send-promotion-notification/index.ts'),'utf8')
 const feedback=fs.readFileSync(path.join(root,'supabase/functions/ack-notification-delivery/index.ts'),'utf8')
 const sw=fs.readFileSync(path.join(root,'public/sw.js'),'utf8')
 assert.match(migration,/delivery_token_hash/)
 assert.match(sender,/delivery_token_hash/)
 assert.match(sender,/delivery_feedback_url/)
 assert.match(sender,/delivery_token/)
 assert.match(feedback,/SHA-256/)
 assert.match(feedback,/status', \['sent'\]/)
 assert.match(sw,/delivery_feedback_url/)
 assert.match(sw,/notification_id/)
 assert.match(sw,/method: 'POST'/)
})

test('notification controls migration enables notifications realtime publication',()=>{
 const source=fs.readFileSync(path.join(root,'supabase/migrations/20260924010000_notifications_controls.sql'),'utf8')
 assert.match(source,/supabase_realtime/)
 assert.match(source,/tablename = 'notifications'/)
})
