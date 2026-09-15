import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || ''

const cors = {
  'Access-Control-Allow-Origin': 'https://vitrinelocal.net',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function mpGet(path: string) {
  if (!MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado.')
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || `Mercado Pago ${response.status}`)
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  if (!MP_ACCESS_TOKEN) return json({ error: 'Mercado Pago não está configurado.' }, 503)

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Sessão não encontrada.' }, 401)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Sessão inválida ou expirada.' }, 401)

  const body = await req.json().catch(() => ({} as any))
  const businessId = String(body?.business_id || '')
  if (!businessId) return json({ error: 'Empresa não informada.' }, 400)

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', userData.user.id)
    .maybeSingle()
  if (businessError) return json({ error: businessError.message }, 500)
  if (!business) return json({ error: 'Empresa não encontrada ou sem permissão.' }, 403)

  const { data: local, error: localError } = await supabase
    .from('subscriptions')
    .select('id,plan_id,status,provider,provider_subscription_id,provider_checkout_url,started_at,ends_at,provider_status')
    .eq('business_id', businessId)
    .eq('user_id', userData.user.id)
    .eq('provider', 'mercadopago')
    .in('status', ['pending', 'active', 'trialing', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (localError) return json({ error: localError.message }, 500)
  if (!local?.provider_subscription_id) return json({ ok: true, synced: false, reason: 'no_subscription' })

  try {
    const remote = await mpGet(`/preapproval/${encodeURIComponent(local.provider_subscription_id)}`)
    const rawStatus = String(remote?.status || '').toLowerCase()
    const mapped = rawStatus === 'authorized' || rawStatus === 'active'
      ? 'active'
      : rawStatus === 'paused'
        ? 'paused'
        : rawStatus === 'cancelled' || rawStatus === 'canceled'
          ? 'canceled'
          : 'pending'
    const auto = remote?.auto_recurring || {}
    const patch = {
      status: mapped,
      provider_status: rawStatus || null,
      provider_customer_id: remote?.payer_id ? String(remote.payer_id) : null,
      provider_checkout_url: remote?.init_point || local.provider_checkout_url,
      current_period_start: auto?.start_date || null,
      current_period_end: remote?.next_payment_date || null,
      ends_at: auto?.end_date || null,
      cancel_at_period_end: mapped === 'paused' || mapped === 'canceled',
      started_at: local.started_at || (mapped === 'active' ? new Date().toISOString() : null),
    }
    const { error: updateError } = await supabase.from('subscriptions').update(patch).eq('id', local.id)
    if (updateError) return json({ error: updateError.message }, 500)
    return json({ ok: true, synced: true, subscription_id: local.id, status: mapped, provider_status: rawStatus })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Não foi possível sincronizar a assinatura.' }, 502)
  }
})
