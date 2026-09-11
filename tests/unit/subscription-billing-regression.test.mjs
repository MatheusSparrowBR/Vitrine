import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('planos cobre checkout, troca, cancelamento e retorno da empresa',()=>{
 const page=read('src/BillingPlansPage.jsx')
 for(const value of ['create-checkout-session','change-subscription-plan','billing-portal','params.get(\'checkout\')','cancel_at_period_end','scheduled_change_at'])assert.ok(page.includes(value),`BillingPlansPage precisa conter ${value}`)
 const checkout=read('supabase/functions/create-checkout-session/index.ts')
 for(const value of ['checkout=success','checkout=cancelled','success_url','cancel_url','business_id'])assert.ok(checkout.includes(value),`checkout precisa conter ${value}`)
})

test('checkout usa preços Stripe persistentes, origem fixa e dono autenticado',()=>{
 const fn=read('supabase/functions/create-checkout-session/index.ts')
 for(const value of ['stripe_price_monthly_id','stripe_price_yearly_id','stripe.prices.create','SITE_URL','owner_id','user.id'])assert.ok(fn.includes(value),`checkout precisa conter ${value}`)
 assert.equal(fn.includes("req.headers.get('origin')"),false)
 assert.ok(fn.includes("['monthly','yearly'].includes(requestedInterval)"),'checkout deve rejeitar intervalos inválidos')
})

test('troca de assinatura cobre upgrade imediato, agendamento e cancelamento no fim do ciclo',()=>{
 const fn=read('supabase/functions/change-subscription-plan/index.ts')
 for(const value of ['subscriptionSchedules','cancel_at_period_end:true','current_period_end','scheduled_plan_id',"proration_behavior:'create_prorations'",'owner_id','user.id'])assert.ok(fn.includes(value),`troca de plano precisa conter ${value}`)
})

test('webhook verifica assinatura Stripe, deduplica eventos concorrentes, valida proprietário/cliente e sincroniza estado real',()=>{
 const fn=read('supabase/functions/stripe-webhook/index.ts')
 for(const value of ['constructEventAsync','if(priceId)','stripe_price_monthly_id.eq.${priceId}','invoice.paid','invoice.payment_failed','customer.subscription.updated','billing_events','business.owner_id!==userId','Cliente Stripe não corresponde','subscriptions.retrieve(String(obj.subscription)','rec.code===\'23505\''])assert.ok(fn.includes(value),`webhook precisa conter ${value}`)
 assert.equal(fn.includes('detail:String(e'),false)
 assert.ok(fn.includes('processed_at'),'webhook deve persistir o processamento do evento')
 assert.ok(fn.includes('if(existingEvent?.processed_at)'),'webhook deve deduplicar apenas eventos já processados')
})

test('portal de cobrança valida proprietário e preserva o destino interno',()=>{
 const fn=read('supabase/functions/billing-portal/index.ts')
 for(const value of ['owner_id','user.id','past_due','unpaid','returnTo','body.return_to','account'])assert.ok(fn.includes(value),`portal precisa conter ${value}`)
})

test('migration de billing cria produto/preços Stripe e mudanças agendadas',()=>{
 const migration=read('supabase/migrations/20260910200000_harden_billing_and_scheduled_plan_changes.sql')
 for(const value of ['stripe_product_id','scheduled_plan_id','scheduled_billing_interval','scheduled_change_at','plans_stripe_product_uidx','plans_stripe_price_monthly_uidx','plans_stripe_price_yearly_uidx'])assert.ok(migration.includes(value),`migration precisa conter ${value}`)
})

test('painel Meu plano exibe estado real da assinatura',()=>{
 const panel=read('src/PlanUsageReact.jsx')
 for(const value of ['function SubscriptionArea','provider_subscription_id','scheduled_plan_id','billing-portal','current_period_end',"import'./plan-usage.css'"])assert.ok(panel.includes(value),`painel precisa conter ${value}`)
})

test('workspace mantém formulário React de promoções',()=>{
 const promotion=read('src/OwnerPromotionsSection.jsx')
 assert.equal(promotion.includes('window.prompt'),false)
 assert.equal(promotion.includes('window.confirm'),false)
 assert.ok(promotion.includes('<form onSubmit={submit}>'))
})

test('auditoria de segurança básica não encontra helper admin público antigo',()=>{
 for(const p of ['src/AccountPage.jsx','src/BillingPlansPage.jsx','src/PlanUsageReact.jsx','src/OwnerPromotionsSection.jsx'])assert.equal(read(p).includes('public.is_admin()'),false)
})
