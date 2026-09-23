import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders })
}

function getVapidConfig() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')?.trim()
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')?.trim()
  const subject = Deno.env.get('VAPID_SUBJECT')?.trim()
  if (!publicKey || !privateKey || !subject) throw new Error('VAPID_NOT_CONFIGURED')
  return { publicKey, privateKey, subject }
}

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 503)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.slice(7)
    const { data: { user }, error: userError } = await admin.auth.getUser(token)
    if (userError || !user) return json({ error: 'unauthorized' }, 401)

    try {
      const payload = await req.json().catch(() => ({}))
      const promotionId = typeof payload?.promotion_id === 'string' ? payload.promotion_id : ''
      if (!promotionId) return json({ error: 'promotion_id_required' }, 400)

      const { data: promotion, error: promotionError } = await admin
        .from('promotions')
        .select('id,business_id,title,description,image_url,status,starts_at,ends_at,businesses(name)')
        .eq('id', promotionId)
        .maybeSingle()

      if (promotionError) return json({ error: 'promotion_lookup_failed' }, 500)
      if (!promotion) return json({ error: 'promotion_not_found' }, 404)
      if (promotion.status !== 'published') return json({ error: 'promotion_not_published' }, 409)

      const { data: business, error: businessError } = await admin
        .from('businesses')
        .select('id,name,owner_id,status')
        .eq('id', promotion.business_id)
        .maybeSingle()

      if (businessError) return json({ error: 'business_lookup_failed' }, 500)
      if (!business || business.owner_id !== user.id) return json({ error: 'forbidden' }, 403)

      const { publicKey, privateKey, subject } = getVapidConfig()
      webpush.setVapidDetails(subject, publicKey, privateKey)

      const { data: subscriptions, error: subscriptionError } = await admin
        .from('push_subscriptions')
        .select('id,user_id,endpoint,p256dh,auth')
        .eq('enabled', true)

      if (subscriptionError) return json({ error: 'subscription_lookup_failed' }, 500)
      if (!subscriptions?.length) return json({ sent: 0, invalid: 0, created: 0 })

      let sent = 0
      let invalid = 0
      let created = 0
      let skipped = 0

      const baseNotification = {
        promotion_id: promotion.id,
        business_id: promotion.business_id,
        title: promotion.title,
        body: promotion.description?.trim() || `Nova promoção de ${business.name || 'uma empresa local'} no VitrineLocal.`,
        image_url: promotion.image_url || null,
        url: `/laguna?promotion=${encodeURIComponent(promotion.id)}`,
        type: 'promotion',
      }

      for (const subscription of subscriptions) {
        const notification = await admin
          .from('notifications')
          .upsert(
            { ...baseNotification, user_id: subscription.user_id, status: 'queued' },
            { onConflict: 'user_id,promotion_id,type', ignoreDuplicates: true },
          )
          .select('id')
          .maybeSingle()

        if (notification.error) return json({ error: 'notification_create_failed' }, 500)
        if (!notification.data?.id) {
          skipped += 1
          continue
        }

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify({
              title: promotion.title,
              body: baseNotification.body,
              image: promotion.image_url || undefined,
              url: baseNotification.url,
              tag: `vitrine-promotion-${promotion.id}`,
            }),
          )

          await admin.from('notifications').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_code: null,
            error_message: null,
          }).eq('id', notification.data.id)

          sent += 1
          created += 1
        } catch (error) {
          const statusCode = Number(error?.statusCode || 0)
          if (statusCode === 404 || statusCode === 410) {
            invalid += 1
            await admin.from('push_subscriptions').update({
              enabled: false,
              last_seen_at: new Date().toISOString(),
            }).eq('id', subscription.id)
          }

          await admin.from('notifications').update({
            status: 'failed',
            error_code: statusCode ? `HTTP_${statusCode}` : 'PUSH_SEND_FAILED',
            error_message: 'Falha na entrega da notificação.',
          }).eq('id', notification.data.id)
        }
      }

      return json({ sent, invalid, created, skipped })
    } catch (error) {
      if (error?.message === 'VAPID_NOT_CONFIGURED') return json({ error: 'vapid_not_configured' }, 503)
      return json({ error: 'promotion_push_failed' }, 500)
    }
  },
}
