import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || ''
const MP_ENVIRONMENT = (Deno.env.get('MP_ENVIRONMENT') || 'production').toLowerCase()
const MP_TEST_PAYER_EMAIL = Deno.env.get('MP_TEST_PAYER_EMAIL') || ''
const APP_URL = 'https://vitrinelocal.net'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const cors = {
  'Access-Control-Allow-Origin': 'https://vitrinelocal.net',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
const normalizeInterval = (value: unknown) => value === 'yearly' ? 'yearly' : 'monthly'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  if (!MP_ACCESS_TOKEN) return json({ error: 'Mercado Pago ainda não está configurado no ambiente.' }, 503)

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Sessão não encontrada.' }, 401)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Sessão inválida ou expirada.' }, 401)
  const user = userData.user

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Corpo da requisição inválido.' }, 400) }
  const businessId = String(body?.business_id || '')
  const planCode = String(body?.plan_code || '').toLowerCase()
  const interval = normalizeInterval(body?.interval)
  if (!businessId || !['pro', 'premium'].includes(planCode)) return json({ error: 'Plano ou empresa inválidos.' }, 400)

  const { data: business, error: businessError } = await supabase.from('businesses').select('id,name,status,owner_id').eq('id', businessId).eq('owner_id', user.id).maybeSingle()
  if (businessError) return json({ error: businessError.message }, 500)
  if (!business) return json({ error: 'Empresa não encontrada ou sem permissão.' }, 403)
  if (!['active', 'pending'].includes(business.status)) return json({ error: 'A empresa precisa estar ativa ou em análise para contratar um plano.' }, 409)

  const { data: plan, error: planError } = await supabase.from('plans').select('id,code,name,price_monthly,price_yearly,active').eq('code', planCode).eq('active', true).maybeSingle()
  if (planError) return json({ error: planError.message }, 500)
  if (!plan) return json({ error: 'Plano não encontrado.' }, 404)
  const amount = Number(interval === 'yearly' ? plan.price_yearly : plan.price_monthly)
  if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'Preço do plano inválido.' }, 500)

  const { data: existing, error: existingError } = await supabase.from('subscriptions').select('id,status,provider,provider_subscription_id,plan_id').eq('business_id', businessId).eq('user_id', user.id).eq('provider', 'mercadopago').in('status', ['pending', 'active', 'trialing', 'paused']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (existingError) return json({ error: existingError.message }, 500)
  if (existing) return json({ error: 'Esta empresa já possui uma assinatura Mercado Pago em andamento.', subscription_id: existing.id, provider_subscription_id: existing.provider_subscription_id, status: existing.status }, 409)

  const externalReference = `vitrinelocal:${businessId}:${planCode}:${interval}:${crypto.randomUUID()}`
  const returnUrl = `${APP_URL}/planos?business_id=${encodeURIComponent(businessId)}&checkout=return`
  const payerEmail = MP_ENVIRONMENT === 'test' ? MP_TEST_PAYER_EMAIL : user.email
  if (MP_ENVIRONMENT === 'test' && !payerEmail) return json({ error: 'Ambiente de teste sem MP_TEST_PAYER_EMAIL configurado.' }, 503)

  const mpPayload = {
    reason: `VitrineLocal ${plan.name} — ${interval === 'yearly' ? 'anual' : 'mensal'}`,
    external_reference: externalReference,
    payer_email: payerEmail,
    auto_recurring: { frequency: interval === 'yearly' ? 12 : 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'BRL' },
    back_url: returnUrl,
    status: 'pending',
  }

  const mpResponse = await fetch('https://api.mercadopago.com/preapproval', { method: 'POST', headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(mpPayload) })
  const mpData = await mpResponse.json().catch(() => ({}))
  if (!mpResponse.ok) return json({ error: 'O Mercado Pago recusou a criação da assinatura.', details: mpData?.message || mpData?.error || null }, mpResponse.status >= 500 ? 502 : 400)

  const providerSubscriptionId = String(mpData?.id || '')
  const rawCheckoutUrl = String(mpData?.init_point || '')
  if (!providerSubscriptionId || !rawCheckoutUrl) return json({ error: 'O Mercado Pago não retornou um link de checkout válido.' }, 502)

  let checkoutUrl = rawCheckoutUrl
  try {
    const normalized = new URL(rawCheckoutUrl)
    normalized.searchParams.delete('activation')
    checkoutUrl = normalized.toString()
  } catch {
    return json({ error: 'O Mercado Pago retornou um link de checkout inválido.' }, 502)
  }

  const { data: subscription, error: insertError } = await supabase.from('subscriptions').insert({
    user_id: user.id, business_id: businessId, plan_id: plan.id, status: 'pending', provider: 'mercadopago', billing_interval: interval,
    provider_subscription_id: providerSubscriptionId, provider_customer_id: mpData?.payer_id ? String(mpData.payer_id) : null,
    provider_checkout_url: checkoutUrl, external_reference: externalReference, provider_status: mpData?.status || 'pending',
    cancel_at_period_end: false,
  }).select('id,business_id,plan_id,status,provider,provider_subscription_id,provider_checkout_url,billing_interval').single()

  if (insertError || !subscription) {
    await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(providerSubscriptionId)}`, { method: 'PUT', headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }).catch(() => {})
    return json({ error: insertError?.message || 'Não foi possível registrar a assinatura.' }, 500)
  }

  return json({ ok: true, subscription_id: subscription.id, provider_subscription_id: providerSubscriptionId, checkout_url: checkoutUrl, plan_code: planCode, interval, amount })
})
