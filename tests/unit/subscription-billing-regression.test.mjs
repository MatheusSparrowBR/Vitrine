import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('planos oferecem checkout Mercado Pago sem checkout legado',()=>{
 const page=read('src/BillingPlansPage.jsx')
 assert.ok(page.includes('Assinar com Mercado Pago'))
 assert.ok(page.includes('mercadopago-authorize-subscription'))
 assert.ok(page.includes('checkout_url'))
 assert.ok(page.includes('Começar grátis'))
 assert.equal(page.includes('create-checkout-session'),false)
 assert.equal(page.includes('billing-portal'),false)
 assert.equal(page.includes('stripe'),false)
})

test('painel Meu plano integra o status do Mercado Pago sem expor detalhes sensíveis do provedor',()=>{
 const panel=read('src/PlanUsageReact.jsx')
 assert.ok(panel.includes('Gerenciado pelo Mercado Pago'))
 assert.ok(panel.includes('provider_status'))
 assert.equal(panel.includes('provider_subscription_id'),false)
 assert.equal(panel.includes('billing-portal'),false)
 assert.equal(panel.includes('stripe'),false)
})

test('webhook sincroniza a assinatura também em pagamentos autorizados',()=>{
 const webhook=read('supabase/functions/mercadopago-webhook/index.ts')
 const block=webhook.split("if (eventType === 'subscription_authorized_payment' && dataId)")[1]||''
 const helper=webhook.split('async function syncSubscriptionFromPreapproval')[1]?.split("\n\nDeno.serve")[0]||''
 assert.ok(block.includes("/authorized_payments/"))
 assert.ok(block.includes('syncSubscriptionFromPreapproval(providerSubscriptionId, local)'))
 assert.ok(helper.includes("/preapproval/"))
 assert.ok(helper.includes('provider_status'))
 assert.ok(helper.includes('current_period_end'))
 assert.ok(helper.includes('status: mapped'))
})

test('publicidade Premium permanece em fluxo manual sem cobrança automática',()=>{
 const merchant=read('src/MerchantAdvertisingSalesPage.jsx')
 const admin=read('src/AdminAdvertisingSalesPage.jsx')
 assert.ok(merchant.includes('Nenhuma cobrança é criada'))
 assert.ok(admin.includes('ativação manual'))
 assert.equal(merchant.includes('create-advertising-checkout-session'),false)
 assert.equal(admin.includes('payment_status'),false)
 assert.equal(merchant.includes('mercadopago'),false)
 assert.equal(admin.includes('stripe'),false)
})

test('fontes legadas de checkout não fazem parte do repositório',()=>{
 for(const path of [
  'public/checkout/mercadopago.html',
  'src/MercadoPagoCheckoutPage.jsx',
  'supabase/functions/_shared/mercadopago.ts',
  'supabase/functions/create-checkout-session/index.ts',
  'supabase/functions/change-subscription-plan/index.ts',
  'supabase/functions/billing-portal/index.ts',
  'supabase/functions/create-advertising-checkout-session/index.ts'
 ])assert.equal(fs.existsSync(path),false,`${path} não deveria existir`)
 assert.equal(fs.existsSync('supabase/functions/mercadopago-authorize-subscription/index.ts'),true)
 assert.equal(fs.existsSync('supabase/functions/mercadopago-webhook/index.ts'),true)
})

test('schema de assinaturas usado pela aplicação não depende do legado de Stripe',()=>{
 const migration=read('supabase/migrations/20260914150000_reset_payments_and_fix_public_catalog.sql')
 for(const value of ['drop column if exists external_customer_id','drop column if exists provider_subscription_id','drop column if exists provider','drop column if exists mercadopago_payer_id'])assert.ok(migration.includes(value),`migration precisa limpar ${value}`)
})

test('workspace mantém formulário React de promoções',()=>{
 const promotion=read('src/OwnerPromotionsSection.jsx')
 assert.equal(promotion.includes('window.prompt'),false)
 assert.equal(promotion.includes('window.confirm'),false)
 assert.ok(promotion.includes('<form onSubmit={submit}>'))
})
