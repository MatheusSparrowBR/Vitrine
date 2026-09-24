import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
import path from'node:path'
const root=process.cwd()
test('notification center supports history, unread state and preferences',()=>{
 const source=fs.readFileSync(path.join(root,'src/NotificationCenter.jsx'),'utf8')
 assert.match(source,/notification_preferences/)
 assert.match(source,/read_at/)
 assert.match(source,/Marcar todas como lidas/)
 assert.match(source,/onUnreadChange/)
 assert.match(source,/location\.href=row\.url/)
})
test('promotion push enforces preferences, segmentation preparation and quota',()=>{
 const source=fs.readFileSync(path.join(root,'supabase/functions/send-promotion-notification/index.ts'),'utf8')
 assert.match(source,/consume_promotion_notification_quota/)
 assert.match(source,/promotions_enabled/)
 assert.match(source,/city_id/)
 assert.match(source,/category_ids/)
 assert.match(source,/notification_rate_limit/)
})
test('notification controls migration enables RLS and private quota execution',()=>{
 const source=fs.readFileSync(path.join(root,'supabase/migrations/20260924010000_notifications_controls.sql'),'utf8')
 assert.match(source,/enable row level security/)
 assert.match(source,/consume_promotion_notification_quota/)
 assert.match(source,/grant execute on function public\.consume_promotion_notification_quota/)
 assert.match(source,/target_city_id/)
 assert.match(source,/target_category_id/)
})
