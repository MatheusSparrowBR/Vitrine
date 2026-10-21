import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('Admin Analytics mostra período, resumo, tendência, funil, canais e rankings',()=>{
 const page=read('src/AdminAnalyticsPageFixed.jsx')
 const css=read('src/admin-analytics.css')
 assert.match(page,/Últimos 7 dias/)
 assert.match(page,/Últimos 30 dias/)
 assert.match(page,/Últimos 90 dias/)
 assert.match(page,/RESUMO EXECUTIVO/)
 assert.match(page,/TENDÊNCIA/)
 assert.match(page,/FUNIL DE DESCOBERTA/)
 assert.match(page,/CANAIS/)
 assert.match(page,/TOP NEGÓCIOS/)
 assert.match(page,/BUSCA/)
 assert.match(page,/PUBLICIDADE/)
 assert.match(page,/Taxa de contato/)
 assert.match(page,/function TrendChart/)
 assert.match(page,/vs\. período anterior/)
 assert.match(css,/\.aa-toolbar/)
 assert.match(css,/\.aa-insight/)
 assert.match(css,/\.aa-funnel/)
 assert.match(css,/\.aa-channel/)
 assert.match(css,/\.aa-linechart/)
 assert.match(css,/\.aa-table/)
})

test('dados vêm de uma função do banco que só o administrador executa',()=>{
 const page=read('src/AdminAnalyticsPageFixed.jsx')
 const migration=read('supabase/migrations/20261021120000_admin_analytics_overview.sql')
 assert.match(page,/p\?\.role!=='admin'/)
 assert.match(page,/db\.rpc\('admin_analytics_overview',\{p_days:range\}\)/)
 assert.match(migration,/if not public\.is_admin\(\) then/)
 assert.match(migration,/revoke all on function public\.admin_analytics_overview\(integer\) from public, anon;/)
 assert.match(migration,/grant execute on function public\.admin_analytics_overview\(integer\) to authenticated;/)
})

test('MRR vem das assinaturas ativas e do preço do plano (mensal ou anual)',()=>{
 const migration=read('supabase/migrations/20261021120000_admin_analytics_overview.sql')
 assert.match(migration,/s\.status in \('active', 'trialing'\)/)
 assert.match(migration,/s\.billing_interval = 'yearly'/)
 assert.match(migration,/coalesce\(p\.price_yearly, 0\) \/ 12/)
})

test('funil e canais contam os mesmos tipos de contato',()=>{
 const format=read('src/admin-analytics-format.js')
 assert.match(format,/CONTACT_TYPES = \['whatsapp_click', 'instagram_click', 'website_click'\]/)
 assert.match(format,/export const contactsOf = totals => countOf\(totals, CONTACT_TYPES\)/)
})
