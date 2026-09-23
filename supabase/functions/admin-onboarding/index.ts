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
const clean = (v: unknown) => String(v ?? '').trim()
const nullable = (v: unknown) => clean(v) || null
const slugify = (value: string) => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 90)

async function requireAdmin(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { error: json({ error: 'Sessão não encontrada.' }, 401) } as const
  const { data, error } = await adminDb.auth.getUser(token)
  if (error || !data.user) return { error: json({ error: 'Sessão inválida ou expirada.' }, 401) } as const
  const { data: profile, error: profileError } = await adminDb.from('profiles').select('id,role,account_status').eq('id', data.user.id).maybeSingle()
  if (profileError) return { error: json({ error: profileError.message }, 500) } as const
  if (profile?.role !== 'admin' || profile.account_status !== 'active') return { error: json({ error: 'Acesso restrito a administradores ativos.' }, 403) } as const
  return { user: data.user } as const
}

async function uniqueBusinessSlug(base: string) {
  const initial = slugify(base) || `empresa-${crypto.randomUUID().slice(0, 8)}`
  let candidate = initial
  for (let i = 2; i < 100; i++) {
    const { data } = await adminDb.from('businesses').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${initial}-${i}`.slice(0, 100)
  }
  return `${initial}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 100)
}

async function applyInitialPlan(businessId: string, ownerId: string | null, planCode: string, endsAt: string | null) {
  const normalized = clean(planCode).toLowerCase() || 'free'
  if (!['free', 'pro', 'premium'].includes(normalized)) return { error: 'Plano inicial inválido.' }
  if (normalized === 'free') return { error: null }
  if (!ownerId) return { error: 'Vincule um proprietário antes de selecionar um plano pago.' }
  const { data: plan, error: planError } = await adminDb.from('plans').select('id,code,active').eq('code', normalized).eq('active', true).maybeSingle()
  if (planError) return { error: planError.message }
  if (!plan) return { error: 'Plano inicial não encontrado ou inativo.' }
  const now = new Date().toISOString()
  const { error } = await adminDb.from('subscriptions').insert({ user_id: ownerId, plan_id: plan.id, business_id: businessId, status: 'active', started_at: now, ends_at: endsAt, current_period_start: now, current_period_end: endsAt, provider: 'manual', billing_interval: 'monthly', cancel_at_period_end: false })
  return { error: error?.message || null }
}

async function createBusiness(params: any, actorId: string, forcedOwnerId?: string) {
  const ownerId = forcedOwnerId || nullable(params.owner_id)
  const name = clean(params.name)
  const cityId = clean(params.city_id)
  const planCode = clean(params.plan_code).toLowerCase() || 'free'
  if (!name || !cityId) return { response: json({ error: 'Nome da empresa e cidade são obrigatórios.' }, 400) }
  if (!ownerId && planCode !== 'free') return { response: json({ error: 'Vincule um proprietário antes de selecionar um plano pago.' }, 400) }
  if (ownerId) {
    const { data: owner, error: ownerError } = await adminDb.from('profiles').select('id,role,account_status').eq('id', ownerId).maybeSingle()
    if (ownerError) return { response: json({ error: ownerError.message }, 500) }
    if (!owner || !['business_owner', 'admin'].includes(owner.role)) return { response: json({ error: 'O responsável precisa ser proprietário de empresa ou administrador.' }, 400) }
    if (owner.account_status !== 'active') return { response: json({ error: 'O responsável está com a conta inativa.' }, 409) }
  }
  const { data: city, error: cityError } = await adminDb.from('cities').select('id,active').eq('id', cityId).maybeSingle()
  if (cityError) return { response: json({ error: cityError.message }, 500) }
  if (!city || !city.active) return { response: json({ error: 'Cidade inválida ou inativa.' }, 400) }
  const categoryId = nullable(params.category_id)
  if (categoryId) {
    const { data: category, error: categoryError } = await adminDb.from('categories').select('id,active').eq('id', categoryId).maybeSingle()
    if (categoryError) return { response: json({ error: categoryError.message }, 500) }
    if (!category?.active) return { response: json({ error: 'Categoria inválida ou inativa.' }, 400) }
  }
  const slug = await uniqueBusinessSlug(nullable(params.slug) || name)
  const status = ['pending', 'active'].includes(clean(params.status)) ? clean(params.status) : 'pending'
  const { data: business, error: businessError } = await adminDb.from('businesses').insert({ owner_id: ownerId, city_id: cityId, category_id: categoryId, name, slug, short_description: nullable(params.short_description), description: nullable(params.description), address: nullable(params.address), neighborhood: nullable(params.neighborhood), phone: nullable(params.phone), whatsapp: nullable(params.whatsapp), instagram_url: nullable(params.instagram_url), website_url: nullable(params.website_url), ifood_url: nullable(params.ifood_url), facebook_url: nullable(params.facebook_url), has_delivery: Boolean(params.has_delivery), has_pickup: Boolean(params.has_pickup), has_dine_in: Boolean(params.has_dine_in), status }).select('id,name,slug,owner_id,city_id,category_id,status,has_delivery,has_pickup,has_dine_in').single()
  if (businessError || !business) return { response: json({ error: businessError?.message || 'Não foi possível criar a empresa.' }, 500) }
  const planResult = await applyInitialPlan(business.id, ownerId, planCode, nullable(params.plan_ends_at))
  if (planResult.error) { await adminDb.from('businesses').delete().eq('id', business.id); return { response: json({ error: planResult.error }, 500) } }
  await adminDb.from('admin_audit_logs').insert({ actor_id: actorId, action: 'business_created', entity_type: 'business', entity_id: business.id, metadata: { owner_id: ownerId, city_id: cityId, plan_code: planCode, has_delivery: Boolean(params.has_delivery), has_pickup: Boolean(params.has_pickup), has_dine_in: Boolean(params.has_dine_in), source: 'admin_onboarding' } })
  return { data: business }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  let body: any
  try { body = await req.json() } catch { return json({ error: 'Corpo da requisição inválido.' }, 400) }
  const action = clean(body?.action)

  if (action === 'create_partner') {
    const fullName = clean(body?.user?.full_name)
    const email = clean(body?.user?.email).toLowerCase()
    if (!fullName || !email) return json({ error: 'Nome e e-mail do usuário são obrigatórios.' }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400)
    const { data: invited, error: inviteError } = await adminDb.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo: `${APP_URL}/atualizar-senha` })
    if (inviteError || !invited.user) return json({ error: inviteError?.message || 'Não foi possível criar o usuário. Verifique se o e-mail já está cadastrado.' }, 409)
    const newUser = invited.user
    const { error: profileError } = await adminDb.from('profiles').upsert({ id: newUser.id, full_name: fullName, role: 'business_owner', account_status: 'active', updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (profileError) { await adminDb.auth.admin.deleteUser(newUser.id).catch(() => {}); return json({ error: profileError.message }, 500) }
    let business: any = null
    if (body?.business?.create) {
      const result = await createBusiness(body.business, auth.user.id, newUser.id)
      if ('response' in result) { await adminDb.auth.admin.deleteUser(newUser.id).catch(() => {}); return result.response }
      business = result.data
    }
    await adminDb.from('admin_audit_logs').insert({ actor_id: auth.user.id, action: 'user_created', entity_type: 'profile', entity_id: newUser.id, metadata: { role: 'business_owner', email, business_id: business?.id || null, source: 'admin_onboarding' } })
    return json({ ok: true, user: { id: newUser.id, email, full_name: fullName, role: 'business_owner', account_status: 'active' }, business, access_url: `${APP_URL}/usuario/login` })
  }

  if (action === 'create_business') {
    const result = await createBusiness(body.business || {}, auth.user.id)
    if ('response' in result) return result.response
    return json({ ok: true, business: result.data, access_url: result.data?.owner_id ? `${APP_URL}/conta` : `${APP_URL}/admin/empresas` })
  }

  return json({ error: 'Ação não suportada.' }, 400)
})

