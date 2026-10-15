import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Avisa quem pediu "Me avise" quando um evento em modo Em breve é revelado
// (na data automática ou quando o admin desliga o modo). Roda de hora em hora pelo agendador.

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
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
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

type EventRow = {
  id: string; title: string; image_url: string | null; page_slug: string | null
  teaser_enabled: boolean; teaser_auto_reveal: boolean; teaser_reveal_at: string | null
  cities: { slug?: string } | null
}

// Mesma regra do banco (event_teaser_active).
function teaserActive(event: EventRow, now = Date.now()) {
  if (!event.teaser_enabled) return false
  if (event.teaser_auto_reveal === false || !event.teaser_reveal_at) return true
  return new Date(event.teaser_reveal_at).getTime() > now
}

export default {
  async fetch(req: Request) {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
    const cronSecret = Deno.env.get('CRON_SECRET')?.trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!cronSecret || !supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 503)
    if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) return json({ error: 'unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    let pushEnabled = false
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')?.trim()
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')?.trim()
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')?.trim()
    if (vapidPublic && vapidPrivate && vapidSubject) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
      pushEnabled = true
    }

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const { data: candidates, error } = await admin
      .from('events')
      .select('id,title,image_url,page_slug,teaser_enabled,teaser_auto_reveal,teaser_reveal_at,cities(slug)')
      .eq('active', true)
      .eq('review_status', 'approved')
      .gte('event_end_date', today)
      .not('teaser_started_at', 'is', null)
      .is('teaser_reveal_notified_at', null)
    if (error) {
      logSafeError('events_lookup_failed', error)
      return json({ error: 'events_lookup_failed' }, 500)
    }

    const revealed = (candidates as EventRow[] || []).filter(event => !teaserActive(event))
    let notified = 0
    let pushed = 0

    for (const event of revealed) {
      // Marca antes de enviar: o aviso de revelação sai uma única vez por evento.
      const { data: marked, error: markError } = await admin
        .from('events')
        .update({ teaser_reveal_notified_at: new Date().toISOString() })
        .eq('id', event.id)
        .is('teaser_reveal_notified_at', null)
        .select('id')
      if (markError || !marked?.length) continue

      const { data: favorites } = await admin.from('event_favorites').select('user_id').eq('event_id', event.id)
      const userIds = [...new Set((favorites || []).map(row => row.user_id))]
      if (!userIds.length) continue

      const url = `/${event.cities?.slug || 'laguna'}/evento/${event.page_slug || event.id}`
      const title = `Revelado: ${event.title}`
      const body = 'Os detalhes do evento já estão no VitrineLocal. Confira!'
      const { data: subscriptions } = pushEnabled
        ? await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').eq('enabled', true).in('user_id', userIds)
        : { data: [] }

      for (const userId of userIds) {
        const deliveryToken = crypto.randomUUID() + crypto.randomUUID()
        const { data: notification, error: notificationError } = await admin.from('notifications').insert({
          user_id: userId, title, body, url, image_url: event.image_url || null, type: 'general',
          status: 'sent', sent_at: new Date().toISOString(), delivery_token_hash: await hashToken(deliveryToken),
        }).select('id').single()
        if (notificationError) {
          logSafeError('notification_create_failed', notificationError)
          continue
        }
        notified += 1
        for (const subscription of (subscriptions || []).filter(row => row.user_id === userId)) {
          try {
            await webpush.sendNotification(
              { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
              JSON.stringify({ title, body, url, notification_id: notification.id, delivery_token: deliveryToken, delivery_feedback_url: `${supabaseUrl}/functions/v1/ack-notification-delivery` }),
            )
            pushed += 1
          } catch (pushError) {
            const statusCode = Number((pushError as { statusCode?: number })?.statusCode || 0)
            if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').update({ enabled: false }).eq('id', subscription.id)
            else logSafeError('push_failed', pushError)
          }
        }
      }
    }

    return json({ revealed: revealed.length, notified, pushed })
  },
}
