import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('migração do resumo semanal é opt-in e agrega no banco com acesso só do service role',()=>{
 const migration=read('supabase/migrations/20261011130000_add_weekly_merchant_summary.sql')
 assert.match(migration,/weekly_summary_enabled boolean not null default false/)
 assert.match(migration,/function public\.weekly_business_metrics\(p_since timestamptz\)/)
 assert.match(migration,/e\.event_type = 'profile_view'/)
 assert.match(migration,/e\.event_type = 'promotion_click'/)
 assert.match(migration,/'whatsapp_click','instagram_click','website_click','directions_click'/)
 assert.match(migration,/revoke all on function public\.weekly_business_metrics\(timestamptz\) from public, anon, authenticated/)
 assert.match(migration,/grant execute on function public\.weekly_business_metrics\(timestamptz\) to service_role/)
})

test('função de envio exige segredo do agendador e não usa sessão de usuário',()=>{
 const fn=read('supabase/functions/send-weekly-merchant-summary/index.ts')
 assert.match(fn,/Deno\.env\.get\('CRON_SECRET'\)/)
 assert.match(fn,/req\.headers\.get\('Authorization'\) !== `Bearer \$\{cronSecret\}`/)
 assert.match(fn,/\.eq\('weekly_summary_enabled', true\)/)
 assert.match(fn,/admin\.rpc\('weekly_business_metrics'/)
 assert.match(fn,/api\.resend\.com\/emails/)
})

test('e-mail escapa nomes de empresa antes de montar o HTML',()=>{
 const fn=read('supabase/functions/send-weekly-merchant-summary/index.ts')
 assert.match(fn,/function escapeHtml\(value: unknown\)/)
 assert.match(fn,/\$\{escapeHtml\(business\.name\)\}/)
})

test('comerciante liga e desliga o resumo na Visão geral da empresa',()=>{
 const workspace=read('src/AccountWorkspacePage.jsx')
 const toggle=read('src/WeeklySummaryToggle.jsx')
 assert.match(workspace,/import WeeklySummaryToggle from '\.\/WeeklySummaryToggle\.jsx'/)
 assert.match(workspace,/section==='overview'&&<WeeklySummaryToggle businessId=\{selected\.id\}/)
 assert.match(toggle,/from\('businesses'\)\s*\.select\('weekly_summary_enabled'\)/)
 assert.match(toggle,/update\(\{ weekly_summary_enabled: next \}\)/)
})
