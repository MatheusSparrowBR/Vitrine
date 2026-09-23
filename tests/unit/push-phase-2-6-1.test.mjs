import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const migration=fs.readFileSync('supabase/migrations/20260923200000_create_notifications.sql','utf8')

test('fase 2.6.1 cria historico de notificacoes com contexto de promocao',()=>{
 assert.match(migration,/create table if not exists public\.notifications/)
 assert.match(migration,/user_id uuid not null/)
 assert.match(migration,/business_id uuid references public\.businesses/)
 assert.match(migration,/promotion_id uuid references public\.promotions/)
 assert.match(migration,/title text not null/)
 assert.match(migration,/body text not null/)
 assert.match(migration,/image_url text/)
 assert.match(migration,/url text/)
})

test('fase 2.6.1 controla status e leitura com RLS por usuario',()=>{
 assert.match(migration,/status text not null default 'queued'/)
 assert.match(migration,/status in \('queued', 'sent', 'delivered', 'failed'\)/)
 assert.match(migration,/read_at timestamptz/)
 assert.match(migration,/enable row level security/)
 assert.match(migration,/notifications_select_own/)
 assert.match(migration,/notifications_update_own/)
 assert.match(migration,/revoke insert, delete on public\.notifications from authenticated/)
})
