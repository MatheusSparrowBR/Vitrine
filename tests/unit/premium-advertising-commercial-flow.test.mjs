import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('Minha conta expõe acesso direto à Publicidade Premium e a rota usa o novo fluxo comercial',()=>{
 const app=read('src/app-entry.jsx')
 assert.match(app,/MerchantAdvertisingSalesPage/)
 assert.match(app,/account-premium-ad-shortcut/)
 assert.match(app,/href="\/conta\/publicidade"/)
})

test('fluxo comercial do anunciante exige plano Premium, arte quando aplicável e oferece pagamento Stripe',()=>{
 const page=read('src/MerchantAdvertisingSalesPage.jsx')
 assert.match(page,/premium_ads/)
 assert.match(page,/owner_set_advertising_request_creative/)
 assert.match(page,/Vou enviar minha arte/)
 assert.match(page,/Quero que o VitrineLocal crie a arte/)
 assert.match(page,/create-advertising-checkout-session/)
 assert.match(page,/Pagar e contratar/)
 assert.doesNotMatch(page,/active:\s*true.*submit/)
})

test('admin define preço final e libera pagamento em vez de publicar diretamente',()=>{
 const page=read('src/AdminAdvertisingSalesPage.jsx')
 assert.match(page,/Valor final mensal/)
 assert.match(page,/Aprovar e liberar pagamento/)
 assert.match(page,/final_price/)
 assert.match(page,/payment_status/)
 assert.match(page,/Aguardando pagamento/)
 assert.doesNotMatch(page,/Campanha marcada como cancelada/)
})

test('migration do fluxo comercial protege upload de arte e vincula campanha à solicitação',()=>{
 const migration=read('supabase/migrations/20260911152000_premium_advertising_commercial_flow.sql')
 assert.match(migration,/advertising-request-art/)
 assert.match(migration,/owner_set_advertising_request_creative/)
 assert.match(migration,/advertising_request_id uuid/)
 assert.match(migration,/payment_status/)
 assert.match(migration,/final_price/)
})

test('Stripe possui checkout dedicado e webhook distingue publicidade de assinatura de plano',()=>{
 const checkout=read('supabase/functions/create-advertising-checkout-session/index.ts')
 const webhook=read('supabase/functions/stripe-webhook/index.ts')
 assert.match(checkout,/mode:'subscription'/)
 assert.match(checkout,/flow:'premium_advertising'/)
 assert.match(checkout,/subscription_data/)
 assert.match(webhook,/syncPremiumAdvertisingSubscription/)
 assert.match(webhook,/flow==='premium_advertising'/)
 assert.match(webhook,/advertising_requests/)
 assert.match(webhook,/advertisements/)
})

test('manutenção agendada ativa anúncios pagos no período e desativa vencidos',()=>{
 const migration=read('supabase/migrations/20260911152100_activate_paid_advertising_automatically.sql')
 assert.match(migration,/billing_status='paid'/)
 assert.match(migration,/ads_activated=/)
 assert.match(migration,/ads_deactivated=/)
 assert.match(migration,/grant execute on function public.run_operational_maintenance\(\) to postgres/)
})
