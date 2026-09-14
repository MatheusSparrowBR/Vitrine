import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('Minha conta expõe acesso direto à Publicidade Premium no menu lateral e a rota usa o fluxo comercial',()=>{
 const app=read('src/app-entry.jsx')
 const nav=read('src/account-premium-nav.js')
 assert.match(app,/MerchantAdvertisingSalesPage/)
 assert.match(app,/account-premium-nav\.js/)
 assert.doesNotMatch(app,/AccountPremiumShortcut/)
 assert.match(nav,/href='\/conta\/publicidade'/)
 assert.match(nav,/account-premium-nav-item/)
 assert.match(nav,/insertBefore\(item,media\)/)
})

test('fluxo comercial do anunciante exige plano Premium, arte quando aplicável e não cria cobrança',()=>{
 const page=read('src/MerchantAdvertisingSalesPage.jsx')
 assert.match(page,/premium_ads/)
 assert.match(page,/owner_set_advertising_request_creative/)
 assert.match(page,/Vou enviar minha arte/)
 assert.match(page,/Quero que o VitrineLocal crie a arte/)
 assert.match(page,/Nenhuma cobrança é criada/)
 assert.match(page,/ativação manual/)
 assert.doesNotMatch(page,/create-advertising-checkout-session/)
 assert.doesNotMatch(page,/Pagar e contratar/)
 assert.doesNotMatch(page,/mercadopago/i)
 assert.doesNotMatch(page,/stripe/i)
})

test('admin define preço final e mantém a ativação manual',()=>{
 const page=read('src/AdminAdvertisingSalesPage.jsx')
 assert.match(page,/Valor final mensal/)
 assert.match(page,/>Aprovar</)
 assert.match(page,/final_price/)
 assert.match(page,/ativação será feita pelo fluxo operacional/)
 assert.doesNotMatch(page,/payment_status/)
 assert.doesNotMatch(page,/Aguardando pagamento/)
 assert.doesNotMatch(page,/mercadopago/i)
 assert.doesNotMatch(page,/stripe/i)
})

test('migration do fluxo comercial protege upload de arte e vincula campanha à solicitação',()=>{
 const migration=read('supabase/migrations/20260911152000_premium_advertising_commercial_flow.sql')
 assert.match(migration,/advertising-request-art/)
 assert.match(migration,/owner_set_advertising_request_creative/)
 assert.match(migration,/advertising_request_id uuid/)
 assert.match(migration,/final_price/)
})

test('fontes de cobrança da publicidade foram removidas do repositório',()=>{
 for(const file of [
  'supabase/functions/create-advertising-checkout-session/index.ts',
  'supabase/functions/mercadopago-webhook/index.ts',
  'supabase/functions/mercadopago-authorize-subscription/index.ts'
 ])assert.equal(fs.existsSync(file),false,`${file} não deveria existir`)
})

test('manutenção agendada continua cuidando apenas do estado operacional dos anúncios',()=>{
 const migration=read('supabase/migrations/20260911152100_activate_paid_advertising_automatically.sql')
 assert.match(migration,/billing_status='paid'/)
 assert.match(migration,/ads_activated=/)
 assert.match(migration,/ads_deactivated=/)
 assert.match(migration,/grant execute on function public.run_operational_maintenance\(\) to postgres/)
})
