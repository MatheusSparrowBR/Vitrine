import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('meu plano renderiza o mesmo gráfico de utilização para mídias, produtos e promoções',()=>{
 const plan=read('src/PlanUsageReact.jsx')
 for(const value of ["LABELS={photos:'Mídias'","LABELS={photos:'Mídias',items:'Produtos e serviços',promotions:'Promoções'",'function UsageCard(','USO NO CICLO','Math.round(percent)'])assert.ok(plan.includes(value),`Meu plano precisa conter ${value}`)
})

test('área administrativa expõe navegação para alterar plano por empresa',()=>{
 const shell=read('src/AdminShell.jsx'),platform=read('src/AdminPlatformPage.jsx'),assignment=read('src/AdminPlanAssignments.jsx')
 assert.ok(shell.includes("['plan_assignments','Planos por empresa'"))
 assert.ok(shell.includes('/admin/gestao?tab=assignments'))
 assert.ok(platform.includes("tab==='assignments'?<AdminPlanAssignments supabase={supabase}/>") )
 assert.ok(assignment.includes('admin_set_business_plan'))
 assert.ok(assignment.includes('Validade manual'))
 assert.ok(assignment.includes('window.confirm'))
})

test('concessão manual não pode mascarar assinatura Stripe ativa',()=>{
 const migration=read('supabase/migrations/20260911002500_harden_manual_plan_assignment_against_stripe.sql')
 assert.ok(migration.includes("provider='stripe'"))
 assert.ok(migration.includes("raise exception 'A empresa possui uma assinatura Stripe ativa."))
 assert.ok(migration.includes('provider_subscription_id is not null'))
})

test('uso do catálogo é separado do inventário atual',()=>{
 const plan=read('src/PlanUsageReact.jsx'),service=read('src/plan-cycle-usage.js'),migration=read('supabase/migrations/20260911014109_plan_catalog_usage_by_billing_cycle_v2.sql')
 assert.ok(plan.includes('getPlanCycleUsage'))
 assert.ok(service.includes("get_business_plan_usage_cycle"))
 assert.ok(migration.includes('business_plan_usage_cycles'))
})

test('empresas pertencentes a administradores têm recursos ilimitados para testes',()=>{
 const migration=fs.readdirSync('supabase/migrations').sort().filter(x=>x.includes('admin_owned_businesses_unlimited_test_access')).at(-1)
 assert.ok(migration,'Migration de empresas admin não encontrada')
 const sql=read(`supabase/migrations/${migration}`)
 assert.ok(sql.includes('is_admin_owned_business'))
 assert.ok(sql.includes('when private.is_admin_owned_business(p_business_id) then -1'))
 assert.ok(sql.includes("when private.is_admin_owned_business(p_business_id) then true"))
 const helper=read('src/plan-cycle-usage.js')
 assert.ok(helper.includes('ADMIN_UNLIMITED_LIMIT=2147483647'))
})
