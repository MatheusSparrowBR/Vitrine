import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Lembrete na véspera para quem salvou um evento.
// Disparada uma vez por dia pelo agendador, autenticada com CRON_SECRET; não usa sessão de usuário.
// Cria a notificação na central do usuário e envia push para os aparelhos com push ativo.

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
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// Data de amanhã (AAAA-MM-DD) no fuso de São Paulo.
function tomorrowInSaoPaulo(now = new Date()) {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow)
}

type EventRow = { id: string; title: string; start_time: string | null; location: string | null; image_url: string | null; cities: { slug?: string } | null }

function reminderText(event: EventRow) {
  const time = event.start_time ? String(event.start_time).slice(0, 5) : ''
  const details = [time ? `às ${time}` : '', event.location ? `em ${event.location}` : ''].filter(Boolean).join(' ')
  return {
    title: `Amanhã: ${event.title}`,
    body: details ? `É amanhã, ${details}. Veja os detalhes no VitrineLocal.` : 'É amanhã. Veja os detalhes no VitrineLocal.',
    url: `/${event.cities?.slug || 'laguna'}/evento/${event.id}`,
  }
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

    // Push é opcional: sem VAPID, o lembrete continua indo para a central de notificações.
    let pushEnabled = false
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')?.trim()
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')?.trim()
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')?.trim()
    if (vapidPublic && vapidPrivate && vapidSubject) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
      pushEnabled = true
    }

    const day = tomorrowInSaoPaulo()
    const { data: events, error: eventsError } = await admin
      .from('events')
      .select('id,title,start_time,location,image_url,cities(slug)')
      .eq('event_date', day)
      .eq('active', true)
      .eq('review_status', 'approved')
    if (eventsError) {
      logSafeError('events_lookup_failed', eventsError)
      return json({ error: 'events_lookup_failed' }, 500)
    }
    if (!events?.length) return json({ day, events: 0, reminders: 0, pushed: 0, skipped: 0 })

    let reminders = 0
    let pushed = 0
    let skipped = 0
    let failed = 0

    for (const event of events as EventRow[]) {
      const [{ data: favorites, error: favoritesError }, { data: alreadySent, error: sentError }] = await Promise.all([
        admin.from('event_favorites').select('user_id').eq('event_id', event.id),
        admin.from('event_reminders_sent').select('user_id').eq('event_id', event.id),
      ])
      if (favoritesError || sentError) {
        logSafeError('reminder_lookup_failed', favoritesError || sentError)
        failed += 1
        continue
      }
      const sentUsers = new Set((alreadySent || []).map(row => row.user_id))
      const userIds = [...new Set((favorites || []).map(row => row.user_id))].filter(id => !sentUsers.has(id))
      skipped += (favorites || []).length - userIds.length
      if (!userIds.length) continue

      const text = reminderText(event)
      const { data: subscriptions } = pushEnabled
        ? await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').eq('enabled', true).in('user_id', userIds)
        : { data: [] }

      for (const userId of userIds) {
        // Marca antes de enviar: se algo falhar no meio, o usuário não recebe o aviso duas vezes.
        const { error: markError } = await admin.from('event_reminders_sent').insert({ event_id: event.id, user_id: userId })
        if (markError) {
          skipped += 1
          continue
        }

        const deliveryToken = crypto.randomUUID() + crypto.randomUUID()
        const { data: notification, error: notificationError } = await admin.from('notifications').insert({
          user_id: userId,
          title: text.title,
          body: text.body,
          url: text.url,
          image_url: event.image_url || null,
          type: 'general',
          status: 'sent',
          sent_at: new Date().toISOString(),
          delivery_token_hash: await hashToken(deliveryToken),
        }).select('id').single()
        if (notificationError) {
          logSafeError('notification_create_failed', notificationError)
          failed += 1
          continue
        }
        reminders += 1

        for (const subscription of (subscriptions || []).filter(row => row.user_id === userId)) {
          try {
            await webpush.sendNotification(
              { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
              JSON.stringify({
                title: text.title,
                body: text.body,
                url: text.url,
                notification_id: notification.id,
                delivery_token: deliveryToken,
                delivery_feedback_url: `${supabaseUrl}/functions/v1/ack-notification-delivery`,
              }),
            )
            pushed += 1
          } catch (error) {
            const statusCode = Number((error as { statusCode?: number })?.statusCode || 0)
            if (statusCode === 404 || statusCode === 410) {
              await admin.from('push_subscriptions').update({ enabled: false }).eq('id', subscription.id)
            } else {
              logSafeError('push_failed', error)
            }
          }
        }
      }
    }

    return json({ day, events: events.length, reminders, pushed, skipped, failed })
  },
}
