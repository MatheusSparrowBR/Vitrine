import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = 'https://vitrinelocal.net'
const adminDb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const cors = {
  'Access-Control-Allow-Origin': APP_URL,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
const clean = (value: unknown) => String(value ?? '').trim()

async function requireAdmin(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { error: json({ error: 'Sessão não encontrada.' }, 401) } as const
  const { data, error } = await adminDb.auth.getUser(token)
  if (error || !data.user) return { error: json({ error: 'Sessão inválida ou expirada.' }, 401) } as const
  const { data: profile, error: profileError } = await adminDb
    .from('profiles')
    .select('id,role,account_status')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profileError) return { error: json({ error: profileError.message }, 500) } as const
  if (profile?.role !== 'admin' || profile.account_status !== 'active') {
    return { error: json({ error: 'Acesso restrito a administradores ativos.' }, 403) } as const
  }
  return { user: data.user } as const
}

async function listAllUsers() {
  const users: any[] = []
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminDb.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const batch = data?.users || []
    users.push(...batch)
    if (batch.length < 1000) break
  }
  return users
}

function pendingInvite(user: any) {
  return Boolean(user?.email && user?.invited_at && !user?.email_confirmed_at)
}

async function buildPendingUsers() {
  const users = (await listAllUsers()).filter(pendingInvite)
  if (!users.length) return []

  const ids = users.map(user => user.id)
  const [{ data: profiles, error: profileError }, { data: businesses, error: businessError }] = await Promise.all([
    adminDb.from('profiles').select('id,full_name,role,account_status,created_at').in('id', ids),
    adminDb.from('businesses').select('id,name,owner_id,status').in('owner_id', ids),
  ])
  if (profileError) throw profileError
  if (businessError) throw businessError

  const profileById = new Map((profiles || []).map(row => [row.id, row]))
  const businessesByOwner = new Map<string, any[]>()
  for (const business of businesses || []) {
    const list = businessesByOwner.get(business.owner_id) || []
    list.push(business)
    businessesByOwner.set(business.owner_id, list)
  }

  return users.map(user => ({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || profileById.get(user.id)?.full_name || '',
    role: profileById.get(user.id)?.role || null,
    account_status: profileById.get(user.id)?.account_status || null,
    created_at: user.created_at,
    invited_at: user.invited_at,
    confirmation_sent_at: user.confirmation_sent_at,
    business: businessesByOwner.get(user.id)?.[0] || null,
  })).sort((a, b) => String(b.invited_at || b.created_at).localeCompare(String(a.invited_at || a.created_at)))
}

async function getUser(userId: string) {
  const { data, error } = await adminDb.auth.admin.getUserById(userId)
  if (error || !data.user) throw new Error('Usuário do convite não foi encontrado.')
  return data.user
}

async function requirePendingUser(userId: string) {
  const user = await getUser(userId)
  if (!pendingInvite(user)) throw new Error('Este convite não está mais pendente. O usuário pode já ter confirmado o e-mail.')
  return user
}

async function getOwnedBusinesses(userId: string) {
  const { data, error } = await adminDb.from('businesses').select('id,name,owner_id,status').eq('owner_id', userId)
  if (error) throw error
  return data || []
}

async function audit(actorId: string, action: string, entityId: string | null, metadata: Record<string, unknown>) {
  await adminDb.from('admin_audit_logs').insert({
    actor_id: actorId,
    action,
    entity_type: 'auth_invitation',
    entity_id: entityId,
    metadata,
  })
}

async function buildHistory(rows: any[], users: any[]) {
  const userById = new Map((users || []).map(user => [user.id, user]))
  return rows.map(row => {
    const user = row.entity_id ? userById.get(row.entity_id) : null
    const metadata = row.metadata || {}
    const pending = Boolean(user && pendingInvite(user))
    const status = user ? (pending ? 'pending' : (user.email_confirmed_at ? 'completed' : 'active')) : 'cancelled'
    return {
      id: row.id,
      action: row.action,
      entity_id: row.entity_id,
      email: user?.email || metadata.email || 'E-mail não informado',
      full_name: user?.user_metadata?.full_name || metadata.full_name || 'Usuário',
      created_at: row.created_at,
      status,
      can_manage: pending,
    }
  })
}

async function cancelInvitation(userId: string, actorId: string) {
  const user = await requirePendingUser(userId)
  const businesses = await getOwnedBusinesses(userId)
  if (businesses.length) {
    throw new Error('Este convite já está ligado a uma empresa. Para não perder o vínculo, use “Gerar novo link” em vez de cancelar a conta.')
  }
  const { error } = await adminDb.auth.admin.deleteUser(userId)
  if (error) throw error
  await audit(actorId, 'invite_cancelled', userId, { email: user.email, full_name: user.user_metadata?.full_name || null })
  return { email: user.email }
}

async function generateInviteLink(userId: string) {
  const user = await requirePendingUser(userId)
  const { data, error } = await adminDb.auth.admin.generateLink({
    type: 'invite',
    email: user.email,
    options: {
      data: { full_name: user.user_metadata?.full_name || '' },
      redirectTo: `${APP_URL}/atualizar-senha`,
    },
  })
  if (error) throw error
  const link = data?.properties?.action_link || data?.properties?.actionLink || ''
  if (!link) throw new Error('O Supabase não retornou um novo link de convite.')
  return { email: user.email, invite_link: link }
}

async function cancelAndResend(userId: string, actorId: string) {
  const user = await requirePendingUser(userId)
  const businesses = await getOwnedBusinesses(userId)
  if (businesses.length) {
    throw new Error('Este convite já está ligado a uma empresa. Para preservar o vínculo, gere um novo link em vez de cancelar e recriar.')
  }

  const email = user.email
  const fullName = user.user_metadata?.full_name || ''
  const { error: deleteError } = await adminDb.auth.admin.deleteUser(userId)
  if (deleteError) throw deleteError

  const { data: invited, error: inviteError } = await adminDb.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${APP_URL}/atualizar-senha`,
  })
  if (inviteError || !invited?.user) {
    throw new Error(inviteError?.message || 'O convite anterior foi cancelado, mas não foi possível reenviar um novo convite.')
  }

  const newUser = invited.user
  const { error: profileError } = await adminDb.from('profiles').upsert({
    id: newUser.id,
    full_name: fullName,
    role: 'business_owner',
    account_status: 'active',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (profileError) {
    await adminDb.auth.admin.deleteUser(newUser.id).catch(() => {})
    throw profileError
  }

  await audit(actorId, 'invite_resent', newUser.id, {
    email,
    previous_user_id: userId,
    full_name: fullName || null,
  })

  return { email, new_user_id: newUser.id, invite_email_sent: true }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const action = clean(body?.action)

  try {
    if (action === 'list') {
      const [pending, historyResult, allUsers] = await Promise.all([
        buildPendingUsers(),
        adminDb.from('admin_audit_logs')
          .select('id,action,entity_id,metadata,created_at')
          .in('action', ['user_created', 'invite_resent', 'invite_cancelled'])
          .order('created_at', { ascending: false })
          .limit(100),
        listAllUsers(),
      ])

      const history = buildHistory(historyResult.data || [], allUsers)

      return json({
        pending,
        history,
        history_error: historyResult.error?.message || null,
      })
    }

    if (!body?.user_id) return json({ error: 'Usuário do convite não informado.' }, 400)

    if (action === 'generate_link') {
      return json({ ok: true, ...(await generateInviteLink(body.user_id)) })
    }

    if (action === 'cancel') {
      return json({ ok: true, ...(await cancelInvitation(body.user_id, auth.user.id)) })
    }

    if (action === 'cancel_and_resend') {
      return json({ ok: true, ...(await cancelAndResend(body.user_id, auth.user.id)) })
    }

    return json({ error: 'Ação não suportada.' }, 400)
  } catch (error) {
    console.error('admin_invitation_action_failed', error)
    return json({ error: error instanceof Error ? error.message : 'Não foi possível concluir a operação.' }, 400)
  }
})
