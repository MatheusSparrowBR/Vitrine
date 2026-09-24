import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const APP_URL = 'https://vitrinelocal.net'
const MEDIA_BUCKET = 'business-media'
const MAX_IMAGE_BYTES = 1572864

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_URL,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders })
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function internalUrl(value: unknown, fallback = '/laguna') {
  const raw = clean(value)
  if (!raw) return fallback
  try {
    const parsed = new URL(raw, APP_URL)
    if (parsed.origin !== APP_URL) return fallback
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return fallback
  }
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

async function requireAdmin(adminDb: ReturnType<typeof createClient>, req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { error: json({ error: 'Sessão não encontrada.', code: 'unauthorized' }, 401) } as const

  const { data, error } = await adminDb.auth.getUser(token)
  if (error || !data.user) return { error: json({ error: 'Sessão inválida ou expirada.', code: 'unauthorized' }, 401) } as const

  const { data: profile, error: profileError } = await adminDb
    .from('profiles')
    .select('id,role,account_status')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) return { error: json({ error: profileError.message, code: 'profile_lookup_failed' }, 500) } as const
  if (profile?.role !== 'admin' || profile.account_status !== 'active') {
    return { error: json({ error: 'Acesso restrito a administradores ativos.', code: 'forbidden' }, 403) } as const
  }

  return { user: data.user } as const
}

async function uploadImage(adminDb: ReturnType<typeof createClient>, imageData: string, imageType: string) {
  if (!imageData) return null
  const match = imageData.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/)
  if (!match) throw new Error('A imagem precisa ser JPG, PNG, WEBP ou GIF.')
  const mime = match[1]
  const base64 = match[2]
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('A imagem deve ter no máximo 1,5 MB.')

  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]
  const path = `admin-notifications/${crypto.randomUUID()}.${extension}`
  const { error } = await adminDb.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType: imageType || mime,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return adminDb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Método não permitido.', code: 'method_not_allowed' }, 405)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Servidor não configurado.', code: 'server_not_configured' }, 503)

    const adminDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const auth = await requireAdmin(adminDb, req)
    if ('error' in auth) return auth.error

    try {
      const payload = await req.json().catch(() => ({}))
      const sourceType = clean(payload?.source_type) || 'custom'
      const sourceId = clean(payload?.source_id)
      const targetCityId = clean(payload?.target_city_id) || null
      const targetCategoryId = clean(payload?.target_category_id) || null

      let type = 'system'
      let promotionId: string | null = null
      let businessId: string | null = null
      let title = clean(payload?.title)
      let body = clean(payload?.body)
      let imageUrl = clean(payload?.image_url)
      let url = internalUrl(payload?.url)
      let effectiveCityId = targetCityId
      let effectiveCategoryId = targetCategoryId
      let followBusinessId: string | null = null
      let sourceName = 'Mensagem administrativa'

      if (!['custom', 'promotion', 'event', 'business'].includes(sourceType)) {
        return json({ error: 'Fonte de notificação inválida.', code: 'invalid_source_type' }, 400)
      }

      if (sourceType === 'promotion') {
        if (!sourceId) return json({ error: 'Selecione uma promoção.', code: 'promotion_required' }, 400)
        const { data: promotion, error: promotionError } = await adminDb
          .from('promotions')
          .select('id,business_id,title,description,image_url,status')
          .eq('id', sourceId)
          .maybeSingle()
        if (promotionError) {
          logSafeError('promotion_lookup_failed', promotionError)
          return json({ error: 'Não foi possível carregar a promoção.', code: 'promotion_lookup_failed' }, 500)
        }
        if (!promotion || promotion.status !== 'published') {
          return json({ error: 'A promoção precisa estar publicada para ser enviada.', code: 'promotion_not_published' }, 409)
        }

        const { data: business, error: businessError } = await adminDb
          .from('businesses')
          .select('id,name,slug,city_id,category_id')
          .eq('id', promotion.business_id)
          .maybeSingle()
        if (businessError || !business) {
          return json({ error: 'Empresa da promoção não encontrada.', code: 'business_not_found' }, 404)
        }
        const { data: city } = await adminDb.from('cities').select('slug').eq('id', business.city_id).maybeSingle()

        type = 'promotion'
        promotionId = promotion.id
        businessId = business.id
        followBusinessId = business.id
        sourceName = promotion.title
        title ||= promotion.title
        body ||= promotion.description || `Nova promoção de ${business.name} no VitrineLocal.`
        imageUrl ||= promotion.image_url || ''
        url = `/${city?.slug || 'laguna'}?promotion=${encodeURIComponent(promotion.id)}`
        effectiveCityId ||= business.city_id
        effectiveCategoryId ||= business.category_id
      }

      if (sourceType === 'business') {
        if (!sourceId) return json({ error: 'Selecione uma empresa.', code: 'business_required' }, 400)
        const { data: business, error: businessError } = await adminDb
          .from('businesses')
          .select('id,name,slug,short_description,description,logo_url,cover_url,city_id,category_id,status')
          .eq('id', sourceId)
          .maybeSingle()
        if (businessError || !business) return json({ error: 'Empresa não encontrada.', code: 'business_not_found' }, 404)
        if (business.status !== 'active') return json({ error: 'A empresa precisa estar ativa para ser enviada.', code: 'business_not_active' }, 409)
        const { data: city } = await adminDb.from('cities').select('slug').eq('id', business.city_id).maybeSingle()

        type = 'business'
        businessId = business.id
        followBusinessId = business.id
        sourceName = business.name
        title ||= business.name
        body ||= business.short_description || business.description || `Conheça ${business.name} no VitrineLocal.`
        imageUrl ||= business.logo_url || business.cover_url || ''
        url = `/${city?.slug || 'laguna'}/empresa/${business.slug}`
        effectiveCityId ||= business.city_id
        effectiveCategoryId ||= business.category_id
      }

      if (sourceType === 'event') {
        if (!sourceId) return json({ error: 'Selecione um evento.', code: 'event_required' }, 400)
        const { data: event, error: eventError } = await adminDb
          .from('events')
          .select('id,city_id,title,description,image_url,active')
          .eq('id', sourceId)
          .maybeSingle()
        if (eventError || !event) return json({ error: 'Evento não encontrado.', code: 'event_not_found' }, 404)
        if (!event.active) return json({ error: 'O evento precisa estar ativo para ser enviado.', code: 'event_not_active' }, 409)
        const { data: city } = await adminDb.from('cities').select('slug').eq('id', event.city_id).maybeSingle()

        type = 'system'
        sourceName = event.title
        title ||= event.title
        body ||= event.description || `Confira o evento “${event.title}” no VitrineLocal.`
        imageUrl ||= event.image_url || ''
        url = `/${city?.slug || 'laguna'}/eventos`
        effectiveCityId ||= event.city_id
      }

      if (!title) return json({ error: 'Informe o título da notificação.', code: 'title_required' }, 400)
      if (!body) return json({ error: 'Informe o texto da notificação.', code: 'body_required' }, 400)
      if (title.length > 120) return json({ error: 'O título pode ter no máximo 120 caracteres.', code: 'title_too_long' }, 400)
      if (body.length > 500) return json({ error: 'O texto pode ter no máximo 500 caracteres.', code: 'body_too_long' }, 400)

      if (targetCityId) {
        const { data: city } = await adminDb.from('cities').select('id,active').eq('id', targetCityId).maybeSingle()
        if (!city?.active) return json({ error: 'A cidade selecionada está inválida ou inativa.', code: 'invalid_city' }, 400)
      }
      if (targetCategoryId) {
        const { data: category } = await adminDb.from('categories').select('id,active').eq('id', targetCategoryId).maybeSingle()
        if (!category?.active) return json({ error: 'A categoria selecionada está inválida ou inativa.', code: 'invalid_category' }, 400)
      }

      if (payload?.image_data) {
        imageUrl = await uploadImage(adminDb, String(payload.image_data), String(payload.image_type || ''))
      }

      let vapid
      try {
        vapid = getVapidConfig()
        webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
      } catch (error) {
        logSafeError('vapid_configuration_failed', error)
        return json({ error: 'Push não está configurado.', code: 'vapid_not_configured' }, 503)
      }

      const { data: subscriptions, error: subscriptionError } = await adminDb
        .from('push_subscriptions')
        .select('id,user_id,endpoint,p256dh,auth')
        .eq('enabled', true)
        .limit(5000)
      if (subscriptionError) {
        logSafeError('subscription_lookup_failed', subscriptionError)
        return json({ error: 'Não foi possível carregar as subscriptions.', code: 'subscription_lookup_failed' }, 500)
      }

      if (!subscriptions?.length) {
        return json({ sent: 0, invalid: 0, created: 0, ineligible: 0, failed: 0, subscriptions: 0, eligible: 0, source: sourceName })
      }

      const userIds = [...new Set(subscriptions.map(row => row.user_id).filter(Boolean))]
      const [{ data: profiles, error: profileError }, { data: preferences, error: preferenceError }] = await Promise.all([
        adminDb.from('profiles').select('id,account_status').in('id', userIds),
        adminDb.from('notification_preferences').select('user_id,promotions_enabled,business_enabled,system_enabled,city_id,category_ids').in('user_id', userIds),
      ])
      if (profileError) return json({ error: 'Não foi possível carregar os perfis dos destinatários.', code: 'profile_lookup_failed' }, 500)
      if (preferenceError) return json({ error: 'Não foi possível carregar as preferências dos destinatários.', code: 'preferences_lookup_failed' }, 500)

      const follows = new Set<string>()
      if (followBusinessId) {
        const { data: rows, error: followError } = await adminDb
          .from('business_notification_subscriptions')
          .select('user_id')
          .eq('business_id', followBusinessId)
          .eq('enabled', true)
          .in('user_id', userIds)
        if (followError) return json({ error: 'Não foi possível carregar os acompanhamentos da empresa.', code: 'business_follow_lookup_failed' }, 500)
        for (const row of rows || []) follows.add(row.user_id)
      }

      const profileByUser = new Map((profiles || []).map(row => [row.id, row]))
      const preferenceByUser = new Map((preferences || []).map(row => [row.user_id, row]))
      const eligibleSubscriptions = subscriptions.filter(subscription => {
        const profile = profileByUser.get(subscription.user_id)
        if (!profile || profile.account_status !== 'active') return false
        const preference = preferenceByUser.get(subscription.user_id)

        if (type === 'promotion' && preference?.promotions_enabled === false) return false
        if (type === 'business' && preference?.business_enabled === false && !follows.has(subscription.user_id)) return false
        if (type === 'system' && preference?.system_enabled === false) return false

        if (effectiveCityId && preference?.city_id && preference.city_id !== effectiveCityId) return false
        if (targetCityId && profile && effectiveCityId === null) {
          // The explicit admin target is applied to the recipient's segmentation above.
        }

        const categories = Array.isArray(preference?.category_ids) ? preference.category_ids : []
        if (effectiveCategoryId && categories.length && !categories.includes(effectiveCategoryId)) return false
        if (targetCategoryId && categories.length && !categories.includes(targetCategoryId)) return false
        return true
      })

      if (!eligibleSubscriptions.length) {
        return json({
          sent: 0,
          invalid: 0,
          created: 0,
          ineligible: subscriptions.length,
          failed: 0,
          subscriptions: subscriptions.length,
          eligible: 0,
          source: sourceName,
        })
      }

      let sent = 0
      let invalid = 0
      let created = 0
      let failed = 0
      const targetIds = eligibleSubscriptions.map(subscription => subscription.user_id)

      for (let index = 0; index < eligibleSubscriptions.length; index += 1) {
        const subscription = eligibleSubscriptions[index]
        const deliveryToken = crypto.randomUUID() + crypto.randomUUID()
        const deliveryTokenHash = await hashToken(deliveryToken)

        let notificationId = ''

        if (type === 'promotion' && promotionId) {
          const existing = await adminDb
            .from('notifications')
            .select('id')
            .eq('user_id', subscription.user_id)
            .eq('promotion_id', promotionId)
            .eq('type', 'promotion')
            .maybeSingle()

          if (existing.error) {
            failed += 1
            continue
          }

          if (existing.data?.id) {
            const updated = await adminDb.from('notifications').update({
              business_id: businessId,
              title,
              body,
              image_url: imageUrl || null,
              url,
              status: 'queued',
              sent_at: null,
              delivered_at: null,
              read_at: null,
              delivery_token_hash: deliveryTokenHash,
              error_code: null,
              error_message: null,
              target_city_id: targetCityId || effectiveCityId || null,
              target_category_id: targetCategoryId || effectiveCategoryId || null,
            }).eq('id', existing.data.id).select('id').maybeSingle()
            if (updated.error || !updated.data?.id) {
              failed += 1
              continue
            }
            notificationId = updated.data.id
          } else {
            const inserted = await adminDb.from('notifications').insert({
              user_id: subscription.user_id,
              business_id: businessId,
              promotion_id: promotionId,
              title,
              body,
              image_url: imageUrl || null,
              url,
              type,
              status: 'queued',
              target_city_id: targetCityId || effectiveCityId || null,
              target_category_id: targetCategoryId || effectiveCategoryId || null,
              delivery_token_hash: deliveryTokenHash,
            }).select('id').single()
            if (inserted.error || !inserted.data?.id) {
              failed += 1
              continue
            }
            notificationId = inserted.data.id
            created += 1
          }
        } else {
          const inserted = await adminDb.from('notifications').insert({
            user_id: subscription.user_id,
            business_id: businessId,
            promotion_id: null,
            title,
            body,
            image_url: imageUrl || null,
            url,
            type,
            status: 'queued',
            target_city_id: targetCityId || effectiveCityId || null,
            target_category_id: targetCategoryId || effectiveCategoryId || null,
            delivery_token_hash: deliveryTokenHash,
          }).select('id').single()
          if (inserted.error || !inserted.data?.id) {
            failed += 1
            continue
          }
          notificationId = inserted.data.id
          created += 1
        }

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify({
              title,
              body,
              url,
              image_url: imageUrl || null,
              notification_id: notificationId,
              delivery_token: deliveryToken,
              delivery_feedback_url: `${supabaseUrl}/functions/v1/ack-notification-delivery`,
            }),
          )

          const { error: updateError } = await adminDb.from('notifications').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_code: null,
            error_message: null,
          }).eq('id', notificationId)

          if (updateError) {
            logSafeError('notification_mark_sent_failed', updateError)
            failed += 1
            continue
          }

          sent += 1
        } catch (error) {
          const statusCode = Number(error?.statusCode || 0)
          logSafeError('push_delivery_failed', error)
          if (statusCode === 404 || statusCode === 410) {
            invalid += 1
            await adminDb.from('push_subscriptions').update({
              enabled: false,
              last_seen_at: new Date().toISOString(),
            }).eq('id', subscription.id)
          }

          failed += 1
          await adminDb.from('notifications').update({
            status: 'failed',
            error_code: statusCode ? `HTTP_${statusCode}` : 'PUSH_SEND_FAILED',
            error_message: 'Falha na entrega da notificação.',
          }).eq('id', notificationId)
        }
      }

      await adminDb.from('admin_audit_logs').insert({
        actor_id: auth.user.id,
        action: 'notification_broadcast_sent',
        entity_type: 'notification',
        entity_id: null,
        metadata: {
          source_type: sourceType,
          source_id: sourceId || null,
          notification_type: type,
          title,
          target_city_id: targetCityId,
          target_category_id: targetCategoryId,
          subscriptions: subscriptions.length,
          eligible: eligibleSubscriptions.length,
          sent,
          invalid,
          created,
          failed,
          source: sourceName,
        },
      })

      return json({
        sent,
        invalid,
        created,
        ineligible: subscriptions.length - eligibleSubscriptions.length,
        failed,
        subscriptions: subscriptions.length,
        eligible: eligibleSubscriptions.length,
        source: sourceName,
        target_user_count: new Set(targetIds).size,
      })
    } catch (error) {
      logSafeError('admin_notification_broadcast_failed', error)
      return json({ error: error instanceof Error ? error.message : 'Não foi possível enviar a notificação.', code: 'broadcast_failed' }, 500)
    }
  },
}
