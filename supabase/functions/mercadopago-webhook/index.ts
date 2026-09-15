const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || ''
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || ''

const headers = { 'Content-Type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0 }
function parseSignature(value: string) { const parts: Record<string, string> = {}; for (const chunk of value.split(',')) { const [key, ...rest] = chunk.split('='); if (key && rest.length) parts[key.trim()] = rest.join('=').trim() } return parts }
async function mpGet(path: string) { if (!MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado.'); const response = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data?.message || `Mercado Pago ${response.status}`); return data }
async function rest(path: string, init: RequestInit = {}) { return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: init.method === 'POST' ? 'return=minimal' : 'return=representation', ...(init.headers || {}), } }) }
async function findSubscription(providerSubscriptionId: string) { const res = await rest(`subscriptions?provider=eq.mercadopago&provider_subscription_id=eq.${encodeURIComponent(providerSubscriptionId)}&select=*`); const rows = await res.json().catch(() => []); return rows?.[0] || null }
async function updateSubscription(id: string, patch: Record<string, unknown>) { await rest(`subscriptions?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }) }
async function getBillingEvent(providerEventId: string) { const res = await rest(`billing_events?provider=eq.mercadopago&provider_event_id=eq.${encodeURIComponent(providerEventId)}&select=*`); const rows = await res.json().catch(() => []); return rows?.[0] || null }
async function markEvent(providerEventId: string, patch: Record<string, unknown>) { await rest(`billing_events?provider=eq.mercadopago&provider_event_id=eq.${encodeURIComponent(providerEventId)}`, { method: 'PATCH', body: JSON.stringify(patch) }) }
async function syncSubscriptionFromPreapproval(providerSubscriptionId: string, local: any = null, sub: any = null) {
  const providerSub = sub || await mpGet(`/preapproval/${encodeURIComponent(providerSubscriptionId)}`)
  const currentLocal = local || await findSubscription(providerSubscriptionId)
  if (!currentLocal) return null
  const rawStatus = String(providerSub?.status || '').toLowerCase()
  const mapped = rawStatus === 'authorized' || rawStatus === 'active' ? 'active' : rawStatus === 'paused' ? 'paused' : rawStatus === 'cancelled' || rawStatus === 'canceled' ? 'canceled' : 'pending'
  const auto = providerSub?.auto_recurring || {}
  await updateSubscription(currentLocal.id, {
    status: mapped,
    provider_status: rawStatus || null,
    provider_customer_id: providerSub?.payer_id ? String(providerSub.payer_id) : currentLocal.provider_customer_id,
    provider_checkout_url: providerSub?.init_point || currentLocal.provider_checkout_url,
    current_period_start: auto?.start_date || null,
    current_period_end: providerSub?.next_payment_date || null,
    ends_at: auto?.end_date || null,
    cancel_at_period_end: mapped === 'paused' || mapped === 'canceled',
    started_at: currentLocal.started_at || (mapped === 'active' ? new Date().toISOString() : null),
  })
  return mapped
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  const body = await req.json().catch(() => ({} as any))
  const url = new URL(req.url)
  const type = String(url.searchParams.get('type') || body?.type || '')
  const dataId = String(url.searchParams.get('data.id') || body?.data?.id || '')
  const requestId = req.headers.get('x-request-id') || ''
  const signatureHeader = req.headers.get('x-signature') || ''
  if (!MP_WEBHOOK_SECRET) return json({ error: 'MP_WEBHOOK_SECRET não configurado.' }, 503)
  if (!dataId || !signatureHeader || !requestId) return json({ error: 'Webhook sem dados de assinatura suficientes.' }, 401)

  const signature = parseSignature(signatureHeader)
  if (!signature.ts || !signature.v1) return json({ error: 'Assinatura de webhook inválida.' }, 401)
  const template = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${signature.ts};`
  const expected = await hmacHex(MP_WEBHOOK_SECRET, template)
  if (!safeEqual(expected, signature.v1)) return json({ error: 'Assinatura de webhook inválida.' }, 401)

  const providerEventId = String(body?.id || `${type}:${dataId}:${body?.action || 'update'}`)
  const eventType = body?.type || type || 'unknown'
  const eventInsert = await rest('billing_events', { method: 'POST', body: JSON.stringify({ provider: 'mercadopago', provider_event_id: providerEventId, event_type: eventType, payload: body, processing_status: 'received', processed_at: null }) })
  if (eventInsert.status === 409) {
    const existing = await getBillingEvent(providerEventId)
    if (existing?.processing_status === 'processed') return json({ ok: true, duplicate: true })
  } else if (!eventInsert.ok && eventInsert.status !== 201) {
    return json({ error: 'Não foi possível registrar o evento de billing.' }, 500)
  }

  try {
    if (eventType === 'subscription_preapproval' && dataId) {
      const sub = await mpGet(`/preapproval/${encodeURIComponent(dataId)}`)
      const local = await findSubscription(dataId)
      const mapped = await syncSubscriptionFromPreapproval(dataId, local, sub)
      if (!local) {
        await markEvent(providerEventId, { processing_status: 'processed', processed_at: new Date().toISOString(), error_message: null })
        return json({ ok: true, ignored: true })
      }
      await markEvent(providerEventId, { processing_status: 'processed', processed_at: new Date().toISOString(), error_message: null })
      return json({ ok: true, processed: 'subscription_preapproval', status: mapped })
    }

    if (eventType === 'subscription_authorized_payment' && dataId) {
      const invoice = await mpGet(`/authorized_payments/${encodeURIComponent(dataId)}`)
      const providerSubscriptionId = String(invoice?.preapproval_id || invoice?.subscription_id || '')
      const local = providerSubscriptionId ? await findSubscription(providerSubscriptionId) : null
      if (local) {
        const payment = invoice?.payment || {}
        const paymentStatus = String(payment?.status || invoice?.status || 'unknown').toLowerCase()
        const paymentStatusDetail = String(payment?.status_detail || invoice?.status_detail || '') || null
        const retryAt = invoice?.next_retry_date || invoice?.next_payment_date || invoice?.debit_date || null
        await updateSubscription(local.id, {
          last_payment_id: dataId,
          last_payment_status: paymentStatus,
          last_payment_status_detail: paymentStatusDetail,
          last_payment_retry_at: retryAt,
          last_payment_at: invoice?.last_modified || invoice?.date_created || new Date().toISOString(),
        })
        const status = await syncSubscriptionFromPreapproval(providerSubscriptionId, local)
        await markEvent(providerEventId, { processing_status: 'processed', processed_at: new Date().toISOString(), error_message: null })
        return json({ ok: true, processed: 'subscription_authorized_payment', status, payment_status: paymentStatus, payment_status_detail: paymentStatusDetail, retry_at: retryAt })
      }
      await markEvent(providerEventId, { processing_status: 'processed', processed_at: new Date().toISOString(), error_message: null })
      return json({ ok: true, processed: 'subscription_authorized_payment', ignored: true })
    }

    if (eventType === 'payment' && dataId) {
      const payment = await mpGet(`/v1/payments/${encodeURIComponent(dataId)}`)
      const providerSubscriptionId = String(payment?.metadata?.preapproval_id || payment?.metadata?.subscription_id || '')
      const local = providerSubscriptionId ? await findSubscription(providerSubscriptionId) : null
      if (local) await updateSubscription(local.id, { last_payment_id: dataId, last_payment_status: payment?.status || 'unknown', last_payment_status_detail: payment?.status_detail || null, last_payment_at: payment?.date_approved || payment?.date_created || new Date().toISOString() })
      await markEvent(providerEventId, { processing_status: 'processed', processed_at: new Date().toISOString(), error_message: null })
      return json({ ok: true, processed: 'payment' })
    }

    await markEvent(providerEventId, { processing_status: 'processed', processed_at: new Date().toISOString(), error_message: null })
    return json({ ok: true, ignored: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha interna no processamento.'
    console.error('Mercado Pago webhook processing error', message)
    await markEvent(providerEventId, { processing_status: 'failed', processed_at: null, error_message: message })
    return json({ error: 'Evento recebido, mas o processamento interno falhou.' }, 500)
  }
})
