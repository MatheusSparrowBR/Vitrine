import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('planos cobre checkout, troca, cancelamento e retorno da empresa',()=>{
 const page=read('src/BillingPlansPage.jsx')
 for(const value of ['create-checkout-session','change-subscription-plan','billing-portal','params.get(\'checkout\')','mercadopago'])assert.ok(page.includes(value),`BillingPlansPage precisa conter ${value}`)
})

test('checkout usa Mercado Pago, dono autenticado e preço derivado do plano',()=>{
 const fn=read('supabase/functions/create-checkout-session/index.ts')
 for(const value of ['MERCADOPAGO_ACCESS_TOKEN','mpRequest(\'/preapproval\'','owner_id','user.id','price_monthly','price_yearly','external_reference','frequency_type:\'months\'','currency_id:\'BRL\''])assert.ok(fn.includes(value),`checkout precisa conter ${value}`)
 assert.equal(fn.includes('STRIPE_SECRET_KEY'),false)
 assert.equal(fn.includes('stripe.checkout.sessions.create'),false)
})

test('alteração de assinatura usa Mercado Pago e valida proprietário',()=>{
 const fn=read('supabase/functions/change-subscription-plan/index.ts')
 for(const value of ['MERCADOPAGO_ACCESS_TOKEN','/preapproval/','owner_id','user.id','auto_recurring','transaction_amount','currency_id'])assert.ok(fn.includes(value),`troca precisa conter ${value}`)
 assert.equal(fn.includes('STRIPE_SECRET_KEY'),false)
})

test('gestão da assinatura usa Mercado Pago',()=>{
 const fn=read('supabase/functions/billing-portal/index.ts')
 for(const value of ['MERCADOPAGO_ACCESS_TOKEN','/preapproval/','provider_subscription_id','owner_id','user.id'])assert.ok(fn.includes(value),`gestão precisa conter ${value}`)
 assert.equal(fn.includes('STRIPE_SECRET_KEY'),false)
})

test('webhook Mercado Pago valida assinatura, deduplica e sincroniza assinatura',()=>{
 const fn=read('supabase/functions/mercadopago-webhook/index.ts')
 for(const value of ['MERCADOPAGO_WEBHOOK_SECRET','x-signature','x-request-id','HMAC','subscription_preapproval','subscription_authorized_payment','billing_events','provider:\'mercadopago\'','provider_subscription_id','23505'])assert.ok(fn.includes(value),`webhook precisa conter ${value}`)
 assert.equal(fn.includes('stripe-signature'),false)
})

test('publicidade Premium usa Mercado Pago',()=>{
 const fn=read('supabase/functions/create-advertising-checkout-session/index.ts')
 for(const value of ['MERCADOPAGO_ACCESS_TOKEN','/preapproval','VL-AD-','mercadopago_subscription_id','payment_provider:\'mercadopago\''])assert.ok(fn.includes(value),`publicidade precisa conter ${value}`)
 assert.equal(fn.includes('STRIPE_SECRET_KEY'),false)
})

test('migração de billing versiona provider e identificadores Mercado Pago',()=>{
 const migration=read('supabase/migrations/20260912130000_migrate_billing_to_mercadopago.sql')
 for(const value of ['payment_provider','mercadopago_subscription_id','mercadopago_payment_id','mercadopago_payer_id','subscriptions_mercadopago_sub_uidx','billing_events_mercadopago_event_uidx'])assert.ok(migration.includes(value),`migration precisa conter ${value}`)
})

test('painel Meu plano reconhece assinatura Mercado Pago',()=>{
 const panel=read('src/PlanUsageReact.jsx')
 for(const value of ['provider===\'mercadopago\'','pending','Gerenciar assinatura','billing-portal'])assert.ok(panel.includes(value),`painel precisa conter ${value}`)
})

test('workspace mantém formulário React de promoções',()=>{
 const promotion=read('src/OwnerPromotionsSection.jsx')
 assert.equal(promotion.includes('window.prompt'),false)
 assert.equal(promotion.includes('window.confirm'),false)
 assert.ok(promotion.includes('<form onSubmit={submit}>'))
})
