import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('planos cobre checkout, upgrade/downgrade e retorno da empresa selecionada',()=>{
 const page=read('src/BillingPlansPage.jsx')
 assert.match(page,/create-checkout-session/)
 assert.match(page,/change-subscription-plan/)
 assert.match(page,/billing-portal/)
 assert.match(page,/business_id=.*checkout=success/)
 assert.match(page,/business_id=.*checkout=cancelled/)
 assert.match(page,/cancel_at_period_end/)
 assert.match(page,/scheduled_change_at/)
})

test('checkout usa preço persistente do Stripe e não confia no Origin',()=>{
 const fn=read('supabase/functions/create-checkout-session/index.ts')
 assert.match(fn,/stripe_price_monthly_id/)
 assert.match(fn,/stripe_price_yearly_id/)
 assert.match(fn,/stripe\.prices\.create/)
 assert.match(fn,/SITE_URL/)
 assert.doesNotMatch(fn,/req\.headers\.get\('origin'\)/)
 assert.match(fn,/owner_id.*user\.id|owner_id.*\.eq\(/)
})

test('alteração de assinatura protege upgrade imediato, mudança agendada e cancelamento no fim do ciclo',()=>{
 const fn=read('supabase/functions/change-subscription-plan/index.ts')
 assert.match(fn,/subscriptionSchedules/)
 assert.match(fn,/cancel_at_period_end:true/)
 assert.match(fn,/current_period_end/)
 assert.match(fn,/scheduled_plan_id/)
 assert.match(fn,/proration_behavior:'create_prorations'/)
 assert.match(fn,/owner_id.*user\.id|owner_id.*\.eq\(/)
})

test('webhook identifica plano pelo preço atual antes de metadata antiga',()=>{
 const fn=read('supabase/functions/stripe-webhook/index.ts')
 assert.match(fn,/if\(priceId\)/)
 assert.match(fn,/stripe_price_monthly_id\.eq\.\$\{priceId\}/)
 assert.match(fn,/invoice\.paid/)
 assert.match(fn,/invoice\.payment_failed/)
 assert.match(fn,/customer\.subscription\.updated/)
 assert.match(fn,/billing_events/)
 assert.doesNotMatch(fn,/detail:String\(e/) 
})

test('portal valida o proprietário e aceita estados que exigem cobrança',()=>{
 const fn=read('supabase/functions/billing-portal/index.ts')
 assert.match(fn,/owner_id.*user\.id|owner_id.*\.eq\(/)
 assert.match(fn,/past_due/)
 assert.match(fn,/unpaid/)
 assert.match(fn,/return_to===\'account\'/)
})

test('migration versiona produtos/preços Stripe e mudanças agendadas',()=>{
 const migration=read('supabase/migrations/20260910200000_harden_billing_and_scheduled_plan_changes.sql')
 assert.match(migration,/stripe_product_id/)
 assert.match(migration,/scheduled_plan_id/)
 assert.match(migration,/scheduled_billing_interval/)
 assert.match(migration,/scheduled_change_at/)
 assert.match(migration,/plans_stripe_price_monthly_uidx/)
 assert.match(migration,/plans_stripe_price_yearly_uidx/)
})

test('painel Meu plano exibe estado real da assinatura',()=>{
 const panel=read('src/PlanUsageReact.jsx')
 assert.match(panel,/function SubscriptionArea/)
 assert.match(panel,/provider_subscription_id/)
 assert.match(panel,/scheduled_plan_id/)
 assert.match(panel,/billing-portal/)
 assert.match(panel,/current_period_end/)
 assert.match(panel,/import'\.\/plan-usage\.css'/)
})

test('workspace mantém fluxo React sem prompt para promoções',()=>{
 const promotion=read('src/OwnerPromotionsSection.jsx')
 assert.doesNotMatch(promotion,/window\.prompt/)
 assert.doesNotMatch(promotion,/window\.confirm/)
})
