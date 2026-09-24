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

function logSafeError(label: string, error: unknown) {
  const value = error as { name?: unknown; message?: unknown; statusCode?: unknown }
  console.error(label, {
    name: typeof value?.name === 'string' ? value.name : 'Error',
    message: typeof value?.message === 'string' ? value.message : 'Unknown error',
    statusCode: Number(value?.statusCode || 0),
  })
}

async function hashToken(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
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

    let stage = 'request'
    try {
      const payload = await req.json().catch(() => ({}))
      const promotionId = typeof payload?.promotion_id === 'string' ? payload.promotion_id : ''
      const force = payload?.force === true
      if (!promotionId) return json({ error: 'promotion_id_required' }, 400)

      stage = 'promotion_lookup'
      const { data: promotion, error: promotionError } = await admin
        .from('promotions')
        .select('id,business_id,title,description,image_url,status')
        .eq('id', promotionId)
        .maybeSingle()

      if (promotionError) {
        logSafeError('promotion_lookup_failed', promotionError)
        return json({ error: 'promotion_lookup_failed' }, 500)
      }
      if (!promotion) return json({ error: 'promotion_not_found' }, 404)
      if (promotion.status !== 'published') return json({ error: 'promotion_not_published' }, 409)

      stage = 'business_lookup'
      const { data: business, error: businessError } = await admin
        .from('businesses')
        .select('id,name,owner_id,status,city_id,category_id')
        .eq('id', promotion.business_id)
        .maybeSingle()

      if (businessError) {
        logSafeError('business_lookup_failed', businessError)
        return json({ error: 'business_lookup_failed' }, 500)
      }
      if (!business || business.owner_id !== user.id) return json({ error: 'forbidden' }, 403)

      stage = 'vapid_configuration'
      try {
        const vapidConfig = getVapidConfig()
        webpush.setVapidDetails(vapidConfig.subject, vapidConfig.publicKey, vapidConfig.privateKey)
      } catch (error) {
        logSafeError('vapid_configuration_failed', error)
        return json({ error: 'vapid_configuration_failed' }, 503)
      }

      stage = 'subscription_lookup'
      const { data: subscriptions, error: subscriptionError } = await admin
        .from('push_subscriptions')
        .select('id,user_id,endpoint,p256dh,auth')
        .eq('enabled', true)

      if (subscriptionError) {
        logSafeError('subscription_lookup_failed', subscriptionError)
        return json({ error: 'subscription_lookup_failed' }, 500)
      }
      if (!subscriptions?.length) return json({ sent: 0, invalid: 0, created: 0, skipped: 0, subscriptions: 0 })

      const userIds = [...new Set(subscriptions.map(subscription => subscription.user_id).filter(Boolean))]
      const { data: preferences, error: preferenceError } = await admin
        .from('notification_preferences')
        .select('user_id,promotions_enabled,business_enabled,city_id,category_ids')
        .in('user_id', userIds)

      if (preferenceError) {
        logSafeError('notification_preferences_lookup_failed', preferenceError)
        return json({ error: 'notification_preferences_lookup_failed' }, 500)
      }

      const followedUserIds = new Set<string>()
      const { data: businessFollows, error: businessFollowError } = await admin
        .from('business_notification_subscriptions')
        .select('user_id')
        .eq('business_id', business.id)
        .eq('enabled', true)
        .in('user_id', userIds)

      if (businessFollowError) {
        logSafeError('business_notification_subscriptions_lookup_failed', businessFollowError)
        return json({ error: 'business_notification_subscriptions_lookup_failed' }, 500)
      }
      for (const row of businessFollows || []) followedUserIds.add(row.user_id)

      const preferenceByUser = new Map((preferences || []).map(row => [row.user_id, row]))
      const eligibleSubscriptions = subscriptions.filter(subscription => {
        const preference = preferenceByUser.get(subscription.user_id)
        if (preference?.promotions_enabled === false) return false
        if (preference?.city_id && preference.city_id !== business.city_id) return false
        const categories = Array.isArray(preference?.category_ids) ? preference.category_ids : []
        if (categories.length && !categories.includes(business.category_id)) return false
        const globalBusinessNotifications = preference?.business_enabled !== false
        if (!globalBusinessNotifications && !followedUserIds.has(subscription.user_id)) return false
        return true
      })

      if (!eligibleSubscriptions.length) return json({ sent: 0, invalid: 0, created: 0, skipped: subscriptions.length, subscriptions: subscriptions.length, eligible: 0 })

      const { data: quota, error: quotaError } = await admin.rpc('consume_promotion_notification_quota', {
        p_business_id: promotion.business_id,
        p_limit: 5,
      })
      if (quotaError) {
        logSafeError('notification_quota_failed', quotaError)
        return json({ error: 'notification_quota_failed' }, 500)
      }
      if (!quota?.allowed) return json({ error: 'notification_rate_limit', remaining: 0, limit: Number(quota?.limit ?? 0), used: Number(quota?.used ?? 0), retry_at: quota?.retry_at || null }, 429)

      let sent = 0
      let invalid = 0
      let created = 0
      let ineligible = subscriptions.length - eligibleSubscriptions.length
      let deduplicated = 0
      let failed = 0

      const baseNotification = {
        promotion_id: promotion.id,
        business_id: promotion.business_id,
        title: String(promotion.title || 'Nova promoção'),
        body: typeof promotion.description === 'string' && promotion.description.trim()
          ? promotion.description.trim()
          : `Nova promoção de ${business.name || 'uma empresa local'} no VitrineLocal.`,
        image_url: typeof promotion.image_url === 'string' && promotion.image_url.trim() ? promotion.image_url : null,
        target_city_id: business.city_id || null,
        target_category_id: business.category_id || null,
        url: `/laguna?promotion=${encodeURIComponent(promotion.id)}`,
        type: 'promotion',
      }

      for (const subscription of eligibleSubscriptions) {
        stage = 'notification_upsert'
        const deliveryToken = crypto.randomUUID() + crypto.randomUUID()
        const deliveryTokenHash = await hashToken(deliveryToken)
        let notificationId = ''
        const existing = await admin
          .from('notifications')
          .select('id,status')
          .eq('user_id', subscription.user_id)
          .eq('promotion_id', promotion.id)
          .eq('type', 'promotion')
          .maybeSingle()

        if (existing.error) {
          logSafeError('notification_lookup_failed', existing.error)
          return json({ error: 'notification_lookup_failed' }, 500)
        }

        if (existing.data?.id && !force) {
          deduplicated += 1
          continue
        }

        if (existing.data?.id) {
          const updateQueued = await admin.from('notifications').update({
            ...baseNotification,
            status: 'queued',
            sent_at: null,
            delivered_at: null,
            delivery_token_hash: deliveryTokenHash,
            read_at: null,
            error_code: null,
            error_message: null,
          }).eq('id', existing.data.id).select('id').maybeSingle()
          if (updateQueued.error || !updateQueued.data?.id) {
            logSafeError('notification_update_queue_failed', updateQueued.error || new Error('Notification id missing after update'))
            failed += 1
            continue
          }
          notificationId = updateQueued.data.id
        } else {
          const inserted = await admin.from('notifications').insert({
            ...baseNotification,
            user_id: subscription.user_id,
            status: 'queued',
            sent_at: null,
            delivered_at: null,
            delivery_token_hash: deliveryTokenHash,
            read_at: null,
            error_code: null,
            error_message: null,
          }).select('id').single()
          if (inserted.error || !inserted.data?.id) {
            logSafeError('notification_create_failed', inserted.error || new Error('Notification id missing after insert'))
            failed += 1
            continue
          }
          notificationId = inserted.data.id
        }

        try {
          stage = 'push_delivery'
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify({
              title: baseNotification.title,
              body: baseNotification.body,
              url: baseNotification.url,
              notification_id: notificationId,
              delivery_token: deliveryToken,
              delivery_feedback_url: `${supabaseUrl}/functions/v1/ack-notification-delivery`,
            }),
          )

          stage = 'notification_update'
          const { error: updateError } = await admin.from('notifications').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_code: null,
            error_message: null,
          }) .eq('id', notificationId)

          if (updateError) logSafeError('notification_update_failed', updateError)
          sent += 1
          created += 1
        } catch (error) {
          const statusCode = Number(error?.statusCode || 0)
          logSafeError('push_delivery_failed', error)

          if (statusCode === 404 || statusCode === 410) {
            invalid += 1
            await admin.from('push_subscriptions').update({
              enabled: false,
              last_seen_at: new Date().toISOString(),
            }).eq('id', subscription.id)
          }

          failed += 1
          await admin.from('notifications').update({
            status: 'failed',
            error_code: statusCode ? `HTTP_${statusCode}` : 'PUSH_SEND_FAILED',
            error_message: 'Falha na entrega da notificação.',
          }).eq('id', notification.data.id)
        }
      }

      return json({ sent, invalid, created, ineligible, deduplicated, failed, subscriptions: subscriptions.length, eligible: eligibleSubscriptions.length, remaining: Number(quota?.remaining ?? 0) })
    } catch (error) {
      logSafeError(`promotion_push_failed:${stage}`, error)
      return json({ error: `promotion_push_failed_${stage}` }, 500)
    }
  },
}
