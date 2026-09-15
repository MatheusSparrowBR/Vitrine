import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('meu plano renderiza o mesmo gráfico de utilização para mídias, produtos e promoções',()=>{
 const plan=read('src/PlanUsageReact.jsx')
 for(const value of ["LABELS={photos:'Mídias'","LABELS={photos:'Mídias',items:'Produtos e serviços',promotions:'Promoções'",'function UsageCard(','USO NO CICLO','Math.round(percent)','const unlimited=limit<0','unlimited?\'∞\'','SEM LIMITE PARA TESTES'])assert.ok(plan.includes(value),`Meu plano precisa conter ${value}`)
})

test('área administrativa expõe navegação para alterar plano por empresa',()=>{
 const shell=read('src/AdminShell.jsx'),platform=read('src/AdminPlatformPage.jsx'),assignment=read('src/AdminPlanAssignments.jsx')
 assert.ok(shell.includes("['plan_assignments','Planos por empresa'"))
 assert.ok(shell.includes('/admin/gestao?tab=assignments'))
 assert.ok(platform.includes("tab==='assignments'?<AdminPlanAssignments supabase={supabase}/>"))
 assert.ok(assignment.includes('admin_set_business_plan'))
 assert.ok(assignment.includes('Validade manual'))
 assert.ok(assignment.includes('window.confirm'))
})

test('concessão manual permanece independente de provedores de pagamento',()=>{
 const migration=read('supabase/migrations/20260914150000_reset_payments_and_fix_public_catalog.sql')
 for(const value of ['drop column if exists provider','drop column if exists provider_subscription_id','drop column if exists external_subscription_id','drop column if exists mercadopago_payer_id'])assert.ok(migration.includes(value),`reset de pagamentos precisa conter ${value}`)
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
 assert.ok(helper.includes('unlimited:rawLimit<0'))
 assert.ok(helper.includes('limit:Number.isFinite(rawLimit)?rawLimit:0'))
})

test('troca de plano no meio do ciclo preserva o ciclo e o consumo já realizado',()=>{
 const migration=read('supabase/migrations/20260911015810_preserve_catalog_usage_across_midcycle_plan_changes.sql')
 assert.match(migration,/business_plan_usage_cycles/)
 assert.match(migration,/cycle_start<=now\(\)/)
 assert.match(migration,/cycle_end>now\(\)/)
 assert.match(migration,/return query/)
 assert.match(migration,/v_existing_cycle\.cycle_start/)
 assert.match(migration,/v_existing_cycle\.cycle_end/)
 const service=read('src/plan-cycle-usage.js')
 assert.match(service,/get_business_plan_usage_cycle/)
})

test('seleção do ciclo atual prioriza o ciclo vigente mais recente',()=>{
 const migration=read('supabase/migrations/20260911015810_preserve_catalog_usage_across_midcycle_plan_changes.sql')
 assert.match(migration,/order by u\.cycle_start desc, u\.cycle_end desc/)
 assert.doesNotMatch(migration,/where u\.business_id=p_business_id\n    and u\.cycle_end>now\(\)\n  order by u\.cycle_end desc/)
})

test('checkout Mercado Pago está habilitado para Pro e Premium',()=>{
 const page=read('src/BillingPlansPage.jsx')
 assert.ok(page.includes('Assinar com Mercado Pago'))
 assert.ok(page.includes('mercadopago-authorize-subscription'))
 assert.ok(page.includes('checkout_url'))
 assert.ok(page.includes('price_monthly'))
 assert.ok(page.includes('price_yearly'))
 assert.equal(page.includes('create-checkout-session'),false)
 assert.equal(page.includes('stripe'),false)
})

test('conta não depende de estado de assinatura de provedor externo',()=>{
 const plan=read('src/PlanUsageReact.jsx')
 assert.ok(plan.includes('Gerenciado pela administração'))
 assert.equal(plan.includes('provider_subscription_id'),false)
 assert.equal(plan.includes('billing-portal'),false)
 assert.equal(plan.includes('mercadopago'),false)
 assert.equal(plan.includes('stripe'),false)
})
