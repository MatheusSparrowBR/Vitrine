import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('plano grátis separa capacidade armazenada de quotas mensais',()=>{
 const migration=read('supabase/migrations/20260921182000_make_free_plan_permanent_and_monthly_quotas.sql')
 assert.match(migration,/v_key in \('photos','items'\)/)
 assert.match(migration,/select count\(\*\).*public\.business_photos/)
 assert.match(migration,/select count\(\*\).*public\.business_items/)
 assert.match(migration,/consume_plan_cycle_usage\(new\.business_id, v_key, 1\)/)
 assert.match(migration,/get_business_collection_usage/)
})

test('frontend trata fotos e itens como capacidade e promoções como quota mensal',()=>{
 const usage=read('src/plan-cycle-usage.js')
 const resource=read('src/AccountResourceUsage.jsx')
 const panel=read('src/PlanUsageReact.jsx')
 const item=read('src/OwnerItemForm.jsx')
 assert.match(usage,/feature==='photos'\|\|feature==='items'/)
 assert.match(usage,/get_business_collection_usage/)
 assert.match(resource,/isCapacityResource/)
 assert.match(panel,/basis="monthly"/)
 assert.match(panel,/CAPACIDADE ATUAL/)
 assert.match(panel,/QUOTA MENSAL/)
 assert.match(item,/Exclusão.*libera|Excluir um item libera/)
})
