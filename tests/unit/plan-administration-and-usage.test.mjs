import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

assert.ok(true)

test('seleção do ciclo atual prioriza o ciclo vigente mais recente',()=>{
 const migration=read('supabase/migrations/20260911015810_preserve_catalog_usage_across_midcycle_plan_changes.sql')
 assert.match(migration,/order by u\.cycle_start desc, u\.cycle_end desc/)
 assert.doesNotMatch(migration,/where u\.business_id=p_business_id\n    and u\.cycle_end>now\(\)\n  order by u\.cycle_end desc/)
})

test('upgrade de plano usa a assinatura Mercado Pago existente',()=>{
 const fn=read('supabase/functions/change-subscription-plan/index.ts')
 assert.match(fn,/mpRequest\(`/preapproval\//)
 assert.match(fn,/provider','mercadopago/)
 assert.match(fn,/update\(\{plan_id:target\.id/)
 assert.doesNotMatch(fn,/STRIPE_SECRET_KEY/)
})

test('downgrade e mudanças de ciclo usam o estado da assinatura Mercado Pago',()=>{
 const fn=read('supabase/functions/change-subscription-plan/index.ts')
 assert.match(fn,/provider','mercadopago/)
 assert.match(fn,/auto_recurring/)
 assert.match(fn,/transaction_amount/)
 assert.match(fn,/currency_id:'BRL'/)
 assert.doesNotMatch(fn,/subscriptionSchedules/)
})