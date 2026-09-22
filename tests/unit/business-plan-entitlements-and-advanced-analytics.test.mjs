import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('Pro e Premium recebem verificação e destaque automaticamente e planos gratuitos não podem forçar esses campos',()=>{
 const migration=read('supabase/migrations/20260911121303_plan_entitlements_and_advanced_analytics.sql')
 const fix=read('supabase/migrations/20260911121458_fix_paid_entitlement_sync_with_moderation_guards.sql')
 assert.match(migration,/sync_business_plan_entitlements/)
 assert.ok(migration.includes("plan_feature_enabled(b.id, 'verified')"))
 assert.ok(migration.includes("plan_feature_enabled(b.id, 'featured')"))
 assert.match(migration,/trg_sync_business_plan_entitlements/)
 assert.match(migration,/Selo de verificação disponível apenas nos planos Pro e Premium/)
 assert.match(migration,/Destaque nas buscas disponível apenas nos planos Pro e Premium/)
 assert.ok(fix.includes("vitrine.plan_sync"))
 assert.ok(fix.includes("set_config('vitrine.plan_sync', 'on'"))
})

test('desempenho e estatísticas avançadas são recursos separados sem duplicar gráficos',()=>{
 const page=read('src/CommercialAnalyticsPage.jsx')
 assert.ok(page.includes("hasPlanFeature(plan.features,'analytics',false)"))
 assert.ok(page.includes("hasPlanFeature(plan.features,'advanced_analytics',false)"))
 assert.ok(page.includes('get_business_analytics_summary'))
 assert.ok(page.includes('get_business_advanced_analytics'))
 assert.ok(page.includes('ESTATÍSTICAS AVANÇADAS'))
 assert.ok(page.includes('EXCLUSIVO DO PREMIUM'))
 assert.ok(page.includes('Visitantes únicos'))
 assert.ok(page.includes('O que os dados avançados acrescentam'))
 assert.doesNotMatch(page,/ca-advanced-card[\s\S]*Tendência diária/)
 assert.doesNotMatch(page,/ca-advanced-card[\s\S]*Canais de contato/)
})

test('catálogo de planos mantém as regras comerciais esperadas',()=>{
 const plans=read('src/BillingPlansPage.jsx')
 assert.match(plans,/featured:'Destaque nas buscas'/)
 assert.match(plans,/verified:'Selo de verificação'/)
 assert.match(plans,/advanced_analytics:'Estatísticas avançadas'/)
})