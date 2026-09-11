import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('uso de catálogo é cumulativo por ciclo e não depende do inventário atual',()=>{
 const migration=read('supabase/migrations/20260911014109_plan_catalog_usage_by_billing_cycle_v2.sql')
 const fix=read('supabase/migrations/20260911014537_plan_catalog_usage_cycle_bootstrap_fix.sql')
 assert.match(migration,/business_plan_usage_cycles/)
 assert.match(migration,/consume_plan_cycle_usage/)
 assert.match(migration,/get_business_plan_usage_cycle/)
 assert.match(migration,/tg_op='UPDATE' and new\.business_id=old\.business_id/)
 assert.match(fix,/created_at>=u\.cycle_start/)
 assert.match(fix,/created_at<u\.cycle_end/)
})

test('Meu plano usa a quota do ciclo para mídias, itens e promoções',()=>{
 const plan=read('src/PlanUsageReact.jsx')
 assert.match(plan,/getPlanCycleUsage/)
 assert.match(plan,/getPlanCycleUsage\(businessId\)/)
 assert.doesNotMatch(plan,/business_photos.*count:'exact'/s)
 assert.doesNotMatch(plan,/business_items.*count:'exact'/s)
 assert.doesNotMatch(plan,/promotions.*count:'exact'/s)
})

test('telas do comerciante consultam o mesmo serviço de consumo do ciclo',()=>{
 for(const path of ['src/AccountResourceUsage.jsx','src/OwnerItemForm.jsx','src/OwnerPromotionsSection.jsx']){
  const content=read(path)
  assert.match(content,/plan-cycle-usage\.js/,`${path} deve usar a quota compartilhada do ciclo`)
 }
})

test('exclusão não possui caminho de decremento da quota',()=>{
 const workspace=read('src/AccountWorkspacePage.jsx')
 assert.match(workspace,/deletePhoto\(photo\)/)
 assert.match(workspace,/deleteItem\(item\)/)
 assert.doesNotMatch(workspace,/business_plan_usage_cycles.*delete/s)
 assert.doesNotMatch(workspace,/consume_plan_cycle_usage\([^\n]*-1/s)
})
