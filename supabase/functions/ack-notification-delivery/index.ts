import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders })
}

async function hashToken(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 503)

    try {
      const payload = await req.json().catch(() => ({}))
      const notificationId = typeof payload?.notification_id === 'string' ? payload.notification_id : ''
      const token = typeof payload?.token === 'string' ? payload.token : ''
      if (!notificationId || !token || token.length < 32) return json({ error: 'feedback_credentials_required' }, 400)

      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const tokenHash = await hashToken(token)
      const { data, error } = await admin
        .from('notifications')
        .update({ status: 'delivered', delivered_at: new Date().toISOString(), delivery_token_hash: null })
        .eq('id', notificationId)
        .eq('delivery_token_hash', tokenHash)
        .in('status', ['sent'])
        .select('id')
        .maybeSingle()

      if (error) return json({ error: 'delivery_feedback_failed' }, 500)
      return json({ delivered: Boolean(data?.id) })
    } catch {
      return json({ error: 'delivery_feedback_failed' }, 500)
    }
  },
}
