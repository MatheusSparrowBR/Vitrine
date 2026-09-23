import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('fase 2.1 cria armazenamento seguro para subscriptions push',()=>{
  const sql=read('supabase/migrations/20260923180000_create_push_subscriptions.sql')
  assert.match(sql,/create table if not exists public\.push_subscriptions/)
  assert.match(sql,/user_id uuid not null references public\.profiles\(id\) on delete cascade/)
  assert.match(sql,/constraint push_subscriptions_endpoint_key unique \(endpoint\)/)
  assert.match(sql,/alter table public\.push_subscriptions enable row level security/)
  assert.match(sql,/to authenticated\nusing \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(sql,/to authenticated\nwith check \(\(select auth\.uid\(\)\) = user_id\)/)
})

test('cliente push exige HTTPS, service worker e PushManager',()=>{
  const js=read('src/push-notifications.js')
  assert.match(js,/window\.isSecureContext/)
  assert.match(js,/'serviceWorker' in navigator/)
  assert.match(js,/'PushManager' in window/)
  assert.match(js,/userVisibleOnly:true/)
  assert.match(js,/applicationServerKey/)
})

test('chave VAPID fica configurada somente no ambiente publico do frontend',()=>{
  const js=read('src/push-notifications.js')
  assert.match(js,/VITE_VAPID_PUBLIC_KEY/)
  assert.doesNotMatch(js,/SERVICE_ROLE/)
  assert.doesNotMatch(js,/VAPID_PRIVATE/)
})
