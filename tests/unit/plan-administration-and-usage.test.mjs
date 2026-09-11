import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('meu plano renderiza o mesmo gráfico de utilização para mídias, produtos e promoções',()=>{
 const plan=read('src/PlanUsageReact.jsx')
 for(const value of ["LABELS={photos:'Mídias'","LABELS={photos:'Mídias',items:'Produtos e serviços',promotions:'Promoções'","<Donut percent={percent} state={state} label=\"utilizado\"/>","GRÁFICO DE UTILIZAÇÃO",'Math.round(percent)'])assert.ok(plan.includes(value),`Meu plano precisa conter ${value}`)
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
