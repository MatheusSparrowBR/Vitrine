import { withSupabase } from 'npm:@supabase/server@0.9.0'
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
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    try {
      const { publicKey, privateKey, subject } = getVapidConfig()
      webpush.setVapidDetails(subject, publicKey, privateKey)

      const { data: subscriptions, error } = await ctx.supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', ctx.userClaims?.sub)
        .eq('enabled', true)

      if (error) return json({ error: 'subscription_lookup_failed' }, 500)
      if (!subscriptions?.length) return json({ sent: 0, invalid: 0, message: 'Nenhuma subscription ativa neste dispositivo.' })

      let sent = 0
      let invalid = 0
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify({
              title: 'VitrineLocal',
              body: 'Teste concluído: suas notificações Push estão funcionando! 🔔',
              url: '/conta',
              tag: 'vitrine-local-push-test',
            }),
          )
          sent += 1
        } catch (error) {
          const statusCode = Number(error?.statusCode || 0)
          if (statusCode === 404 || statusCode === 410) {
            invalid += 1
            await ctx.supabase
              .from('push_subscriptions')
              .update({ enabled: false, last_seen_at: new Date().toISOString() })
              .eq('id', subscription.id)
          }
        }
      }

      return json({ sent, invalid })
    } catch (error) {
      if (error?.message === 'VAPID_NOT_CONFIGURED') return json({ error: 'vapid_not_configured' }, 503)
      return json({ error: 'push_send_failed' }, 500)
    }
  }),
}
