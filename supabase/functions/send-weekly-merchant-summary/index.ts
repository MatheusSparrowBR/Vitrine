import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

// Envia o resumo semanal por e-mail às empresas que ativaram a opção.
// Disparada por agendamento (cron), autenticada com CRON_SECRET; não usa sessão de usuário.
// Envio por SMTP da caixa do próprio domínio: SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASSWORD e MAIL_FROM.

const SITE_ORIGIN = 'https://vitrinelocal.net'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const SEND_INTERVAL_MS = 600 // o plano gratuito do Resend aceita cerca de 2 envios por segundo

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ENTITIES[char])
}

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

type Metrics = { visits: number; promotion_clicks: number; contact_clicks: number }

function buildEmail(business: { name: string; citySlug: string; slug: string }, metrics: Metrics) {
  const link = `${SITE_ORIGIN}/${encodeURIComponent(business.citySlug)}/empresa/${encodeURIComponent(business.slug)}`
  const subject = `Sua semana no VitrineLocal: ${metrics.visits} visitas à ${business.name}`
  const rows = [
    ['Visitas ao perfil', metrics.visits],
    ['Cliques em promoções', metrics.promotion_clicks],
    ['Contatos (WhatsApp, Instagram, site e rotas)', metrics.contact_clicks],
  ] as const

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0b1424">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td><p style="margin:0 0 6px;font-size:14px;color:#4a5a70;font-weight:700">RESUMO SEMANAL</p>
<h1 style="margin:0 0 18px;font-size:24px">${escapeHtml(business.name)}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.5">Veja como sua empresa foi vista nos últimos 7 dias.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
${rows.map(([label, value]) => `<tr><td style="padding:12px 0;border-top:1px solid #e3e9f2;font-size:16px">${escapeHtml(label)}</td><td align="right" style="padding:12px 0;border-top:1px solid #e3e9f2;font-size:20px;font-weight:800">${Number(value)}</td></tr>`).join('')}
</table>
<p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0b1424;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;font-size:16px">Ver minha página</a></p>
<p style="margin:24px 0 0;font-size:14px;color:#4a5a70;line-height:1.5">Você recebe este resumo porque ativou a opção no painel da sua empresa. Para parar de receber, desative a opção em Visão geral no painel da sua empresa.</p>
</td></tr></table></td></tr></table></body></html>`

  const text = [
    `Resumo semanal: ${business.name}`,
    '',
    `Visitas ao perfil: ${metrics.visits}`,
    `Cliques em promoções: ${metrics.promotion_clicks}`,
    `Contatos (WhatsApp, Instagram, site e rotas): ${metrics.contact_clicks}`,
    '',
    `Ver minha página: ${link}`,
    '',
    'Você recebe este resumo porque ativou a opção no painel da sua empresa.',
  ].join('\n')

  return { subject, html, text }
}

async function sendMail(smtp: SMTPClient, from: string, to: string, email: { subject: string; html: string; text: string }) {
  await smtp.send({ from, to, subject: email.subject, content: email.text, html: email.html })
}

export default {
  async fetch(req: Request) {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const cronSecret = Deno.env.get('CRON_SECRET')?.trim()
    const smtpHost = Deno.env.get('SMTP_HOST')?.trim()
    const smtpPort = Number(Deno.env.get('SMTP_PORT') || 465)
    const smtpUser = Deno.env.get('SMTP_USER')?.trim()
    const smtpPassword = Deno.env.get('SMTP_PASSWORD')
    const mailFrom = Deno.env.get('MAIL_FROM')?.trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!cronSecret || !smtpHost || !smtpUser || !smtpPassword || !mailFrom || !supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 503)

    if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) return json({ error: 'unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const since = new Date(Date.now() - WEEK_MS).toISOString()
    const { data: businessRows, error: businessError } = await admin
      .from('businesses')
      .select('id,name,slug,owner_id,status,cities(slug)')
      .eq('weekly_summary_enabled', true)
      .eq('status', 'active')
    if (businessError) {
      logSafeError('business_lookup_failed', businessError)
      return json({ error: 'business_lookup_failed' }, 500)
    }
    const businesses = businessRows || []
    if (!businesses.length) return json({ sent: 0, failed: 0, skipped: 0, businesses: 0 })

    const { data: metricRows, error: metricError } = await admin.rpc('weekly_business_metrics', { p_since: since })
    if (metricError) {
      logSafeError('metrics_failed', metricError)
      return json({ error: 'metrics_failed' }, 500)
    }
    const metricsByBusiness = new Map<string, Metrics>(
      (metricRows || []).map((row: { business_id: string; visits: number | string; promotion_clicks: number | string; contact_clicks: number | string }) => [
        row.business_id,
        { visits: Number(row.visits), promotion_clicks: Number(row.promotion_clicks), contact_clicks: Number(row.contact_clicks) },
      ]),
    )

    const smtp = new SMTPClient({
      connection: { hostname: smtpHost, port: smtpPort, tls: true, auth: { username: smtpUser, password: smtpPassword } },
    })
    try {
      await smtp.connect()
    } catch (error) {
      logSafeError('smtp_connect_failed', error)
      return json({ error: 'smtp_connect_failed' }, 502)
    }

    let sent = 0
    let failed = 0
    let skipped = 0
    try {
      for (const business of businesses) {
        const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(business.owner_id)
        const to = owner?.user?.email
        if (ownerError || !to) {
          skipped += 1
          continue
        }
        const metrics = metricsByBusiness.get(business.id) || { visits: 0, promotion_clicks: 0, contact_clicks: 0 }
        const citySlug = (business as { cities?: { slug?: string } }).cities?.slug || 'laguna'
        try {
          await sendMail(smtp, mailFrom, to, buildEmail({ name: business.name, citySlug, slug: business.slug }, metrics))
          sent += 1
        } catch (error) {
          logSafeError('summary_send_failed', error)
          failed += 1
        }
        await new Promise(resolve => setTimeout(resolve, SEND_INTERVAL_MS))
      }
    } finally {
      await smtp.close().catch(() => {})
    }

    return json({ sent, failed, skipped, businesses: businesses.length })
  },
}
