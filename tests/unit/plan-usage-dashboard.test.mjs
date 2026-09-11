import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('meu plano carrega o CSS e renderiza os indicadores gráficos',()=>{
 const plan=read('src/PlanUsageReact.jsx')
 const css=read('src/plan-usage.css')
 assert.match(plan,/import\s*['"]\.\/plan-usage\.css['"]+/)
 assert.match(plan,/function Donut\(/)
 assert.match(plan,/vl-plan-donut/)
 assert.doesNotMatch(plan,/PLAN_USAGE_STYLE/)
 assert.match(css,/\.vl-plan-donut/)
 assert.match(css,/\.vl-plan-usage-grid/)
})

test('meu plano preserva limites de catálogo e quota mensal de IA',()=>{
 const plan=read('src/PlanUsageReact.jsx')
 assert.match(plan,/get_effective_plan_id/)
 assert.match(plan,/get_monthly_plan_usage/)
 assert.match(plan,/ai_posts/)
 assert.match(plan,/photos/)
 assert.match(plan,/items/)
 assert.match(plan,/promotions/)
})

test('quotas de catálogo só consideram consumo registrado no ciclo',()=>{
 const plan=read('src/PlanUsageReact.jsx')
 assert.match(plan,/getPlanCycleUsage\(businessId\)/)
 assert.match(plan,/used_count/)
 assert.match(plan,/cycleEnd/)
 assert.match(plan,/Excluir ou encerrar um recurso não devolve a unidade usada/)
})
