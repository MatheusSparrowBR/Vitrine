import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('Pro e Premium recebem verificação e destaque automaticamente e planos gratuitos não podem forçar esses campos',()=>{
 const migration=read('supabase/migrations/20260911121303_plan_entitlements_and_advanced_analytics.sql')
 const fix=read('supabase/migrations/20260911121458_fix_paid_entitlement_sync_with_moderation_guards.sql')
 assert.match(migration,/sync_business_plan_entitlements/)
 assert.match(migration,/plan_feature_enabled\(b\.id, 'verified'\)/)
 assert.match(migration,/plan_feature_enabled\(b\.id, 'featured'\)/)
 assert.match(migration,/trg_sync_business_plan_entitlements/)
 assert.match(migration,/Selo de verificação disponível apenas nos planos Pro e Premium/)
 assert.match(migration,/Destaque nas buscas disponível apenas nos planos Pro e Premium/)
 assert.match(fix,/vitrine\.plan_sync/)
 assert.match(fix,/set_config\('vitrine\.plan_sync', 'on'/)
})

test('desempenho e estatísticas avançadas são recursos separados no painel',()=>{
 const page=read('src/CommercialAnalyticsPage.jsx')
 assert.match(page,/hasPlanFeature\(s\.plan\.features,'analytics',false\)/)
 assert.match(page,/hasPlanFeature\(s\.plan\.features,'advanced_analytics',false\)/)
 assert.match(page,/get_business_analytics_summary/)
 assert.match(page,/get_business_advanced_analytics/)
 assert.match(page,/ESTATÍSTICAS AVANÇADAS/)
 assert.match(page,/EXCLUSIVO DO PREMIUM/)
 assert.match(page,/Visitantes únicos/)
 assert.match(page,/Tendência diária/)
 assert.match(page,/Canais de contato/)
})

test('catálogo de planos mantém as regras comerciais esperadas',()=>{
 const plans=read('src/BillingPlansPage.jsx')
 assert.match(plans,/featured:'Destaque nas buscas'/)
 assert.match(plans,/verified:'Selo de verificação'/)
 assert.match(plans,/advanced_analytics:'Estatísticas avançadas'/)
})
