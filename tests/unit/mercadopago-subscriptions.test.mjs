import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=new URL('../../',import.meta.url)
const read=path=>fs.readFileSync(new URL(path,root),'utf8')

test('Mercado Pago usa os preços atuais do Pro e Premium e oferece cobrança mensal/anual',()=>{
 const billing=read('src/BillingPlansPage.jsx')
 assert.match(billing,/price_monthly:29\.9/)
 assert.match(billing,/price_yearly:299/)
 assert.match(billing,/price_monthly:59\.9/)
 assert.match(billing,/price_yearly:599/)
 assert.match(billing,/mercadopago-authorize-subscription/)
 assert.match(billing,/plan_code:code/)
 assert.match(billing,/interval\}/)
 assert.match(billing,/checkout_url/)
})

test('backend de assinatura não confia no preço enviado pelo navegador',()=>{
 const fn=read('supabase/functions/mercadopago-authorize-subscription/index.ts')
 assert.match(fn,/from\('plans'\)/)
 assert.match(fn,/price_monthly/)
 assert.match(fn,/price_yearly/)
 assert.match(fn,/transaction_amount: amount/)
 assert.match(fn,/eq\('owner_id', user\.id\)/)
 assert.match(fn,/preapproval/)
 assert.match(fn,/status: 'pending'/)
})

test('webhook valida assinatura secreta e mantém idempotência dos eventos',()=>{
 const fn=read('supabase/functions/mercadopago-webhook/index.ts')
 assert.match(fn,/x-signature/)
 assert.match(fn,/x-request-id/)
 assert.match(fn,/HMAC/)
 assert.match(fn,/billing_events/)
 assert.match(fn,/provider_event_id/)
 assert.match(fn,/subscription_preapproval/)
 assert.match(fn,/subscription_authorized_payment/)
})

test('schema de billing possui dados do provedor sem depender de Stripe',()=>{
 const migration=read('supabase/migrations/20260915070000_restore_mercadopago_subscription_runtime.sql')
 assert.match(migration,/provider_subscription_id/)
 assert.match(migration,/provider_checkout_url/)
 assert.match(migration,/last_payment_status/)
 assert.match(migration,/billing_events/)
 assert.doesNotMatch(migration,/stripe_price_monthly_id/)
})
