import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

const state = { initialized: false, open: false, rows: [], filter: 'pending_review', search: '' }
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char])
const money = (value) => value == null ? '—' : `R$ ${Number(value).toFixed(2).replace('.', ',')}`
const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem data'
const now = () => new Date()

function injectStyles() {
  if (document.getElementById('vl-promotions-admin-styles')) return
  const style = document.createElement('style')
  style.id = 'vl-promotions-admin-styles'
  style.textContent = `
    .vl-promotions-backdrop{position:fixed;inset:0;z-index:30000;background:rgba(5,11,20,.62);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.vl-promotions-modal{width:min(1100px,100%);max-height:min(88vh,920px);overflow:auto;background:#fff;border-radius:22px;box-shadow:0 30px 90px rgba(0,0,0,.28);padding:26px}.vl-promotions-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.vl-promotions-kicker{font-size:10px;text-transform:uppercase;letter-spacing:1.3px;font-weight:800;color:#2474ff}.vl-promotions-head h2{font:800 28px/1.05 Manrope;margin:7px 0;color:#122033;letter-spacing:-1px}.vl-promotions-head p{margin:0;color:#748197;font-size:12px;line-height:1.5;max-width:760px}.vl-promotions-close{border:0;background:#eef3f8;border-radius:50%;width:36px;height:36px;font-size:23px;color:#64748b;cursor:pointer}.vl-promotions-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0 16px}.vl-promotions-toolbar input{flex:1;min-width:220px;border:1px solid #d9e1ea;border-radius:10px;padding:10px 12px;font:500 13px 'DM Sans';outline:none}.vl-promo-tab{border:1px solid #d9e1ea;background:#fff;border-radius:999px;padding:9px 12px;font:700 11px 'DM Sans';color:#526276;cursor:pointer}.vl-promo-tab.active{background:#10253f;color:#fff;border-color:#10253f}.vl-promo-count{margin-left:4px;opacity:.65}.vl-promo-grid{display:grid;gap:12px}.vl-promo-card{display:grid;grid-template-columns:170px 1fr auto;gap:15px;border:1px solid #e2e8ef;border-radius:16px;padding:13px;background:#fff}.vl-promo-media{height:130px;border-radius:11px;overflow:hidden;background:#eef3f8;display:grid;place-items:center;color:#9aabba;font:800 28px Manrope}.vl-promo-media img{width:100%;height:100%;object-fit:cover}.vl-promo-info h3{margin:5px 0 6px;font:800 18px Manrope;color:#1b2e45}.vl-promo-info p{margin:0;color:#6d7a8e;font-size:12px;line-height:1.5}.vl-promo-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.vl-promo-chip{border:1px solid #dfe6ee;border-radius:999px;padding:5px 8px;font-size:10px;color:#5e6d82;background:#fafbfd}.vl-promo-business{font-weight:800;color:#2474ff}.vl-promo-actions{display:flex;flex-direction:column;justify-content:center;gap:7px;min-width:145px}.vl-promo-actions button{border:1px solid #d6dee8;background:#fff;border-radius:9px;padding:9px 10px;font:700 11px 'DM Sans';cursor:pointer;color:#34465d}.vl-promo-actions .approve{background:#2474ff;border-color:#2474ff;color:#fff}.vl-promo-actions .danger{background:#fff5f5;border-color:#f1cccc;color:#a02e2e}.vl-promo-actions button:disabled{opacity:.55;cursor:not-allowed}.vl-promo-status{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px}.vl-promo-status.pending{background:#fff5da;color:#9b6900}.vl-promo-status.published{background:#eaf8f0;color:#218151}.vl-promo-status.rejected{background:#fff0f0;color:#a52f2f}.vl-promo-status.archived{background:#edf1f5;color:#66758a}.vl-promo-empty{border:1px dashed #ccd7e4;border-radius:14px;padding:45px 20px;text-align:center;color:#7a8798}.vl-promo-empty strong{display:block;color:#34465c;font:800 17px Manrope;margin-bottom:6px}.vl-promo-empty span{font-size:11px}.vl-promotions-footer{margin-top:14px;font-size:10px;color:#8290a2}.vl-promo-expired{opacity:.76}
    @media(max-width:820px){.vl-promo-card{grid-template-columns:110px 1fr}.vl-promo-actions{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);min-width:0}.vl-promo-media{height:100px}}@media(max-width:560px){.vl-promotions-modal{padding:18px}.vl-promotions-toolbar{display:grid}.vl-promotions-toolbar input{min-width:0}.vl-promo-card{grid-template-columns:1fr}.vl-promo-media{height:160px}.vl-promo-actions{grid-template-columns:1fr}.vl-promotions-head h2{font-size:24px}}
  `
  document.head.appendChild(style)
}

async function assertAdmin() {
  if (!supabase) return false
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  return profile?.role === 'admin'
}

async function loadPromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('id,business_id,title,description,image_url,price,original_price,starts_at,ends_at,status,created_at,updated_at,businesses(name,slug,cities(name,state))')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  state.rows = data || []
}

function statusLabel(status) {
  const labels = { pending_review: ['Em revisão', 'pending'], published: ['Publicada', 'published'], rejected: ['Rejeitada', 'rejected'], archived: ['Arquivada', 'archived'], draft: ['Rascunho', 'archived'] }
  return labels[status] || [status, 'archived']
}

function isExpired(row) { return row.ends_at && new Date(row.ends_at) < now() }

function filteredRows() {
  const q = state.search.trim().toLowerCase()
  return state.rows.filter((row) => {
    const matchesFilter = state.filter === 'expired' ? isExpired(row) : state.filter === 'all' ? true : row.status === state.filter
    const text = [row.title,row.description,row.businesses?.name,row.businesses?.cities?.name].filter(Boolean).join(' ').toLowerCase()
    return matchesFilter && (!q || text.includes(q))
  })
}

async function mutate(id, patch, success) {
  const { error } = await supabase.from('promotions').update(patch).eq('id', id)
  if (error) throw error
  await loadPromotions()
  renderModalContent()
  notify(success)
}

function notify(message) {
  let toast = document.getElementById('vl-promotions-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'vl-promotions-toast'
    Object.assign(toast.style, { position:'fixed', right:'20px', bottom:'20px', zIndex:31000, background:'#10253f', color:'#fff', padding:'12px 15px', borderRadius:'11px', boxShadow:'0 15px 35px rgba(0,0,0,.22)', font:'700 12px DM Sans' })
    document.body.appendChild(toast)
  }
  toast.textContent = message
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => toast.remove(), 2600)
}

function renderModalContent() {
  const modal = document.getElementById('vl-promotions-admin-modal')
  if (!modal) return
  const rows = filteredRows()
  const counts = {
    pending_review: state.rows.filter(x => x.status === 'pending_review').length,
    published: state.rows.filter(x => x.status === 'published' && !isExpired(x)).length,
    rejected: state.rows.filter(x => x.status === 'rejected').length,
    archived: state.rows.filter(x => x.status === 'archived').length,
    expired: state.rows.filter(isExpired).length,
  }
  const list = rows.length ? rows.map((row) => {
    const [statusText,statusClass] = statusLabel(row.status)
    const expired = isExpired(row)
    const canApprove = row.status === 'pending_review' || row.status === 'draft'
    const canReject = row.status !== 'rejected' && row.status !== 'archived'
    const canPublishAgain = row.status === 'rejected' || row.status === 'archived'
    const actionButtons = []
    if (canApprove) actionButtons.push(`<button class="approve" data-promo-action="publish" data-id="${row.id}">Aprovar e publicar</button>`)
    if (canReject) actionButtons.push(`<button class="danger" data-promo-action="reject" data-id="${row.id}">Rejeitar</button>`)
    if (row.status === 'published') actionButtons.push(`<button data-promo-action="archive" data-id="${row.id}">Pausar</button>`)
    if (canPublishAgain) actionButtons.push(`<button data-promo-action="publish" data-id="${row.id}">Publicar novamente</button>`)
    return `<article class="vl-promo-card ${expired ? 'vl-promo-expired' : ''}">
      <div class="vl-promo-media">${row.image_url ? `<img src="${escapeHtml(row.image_url)}" alt="">` : '🔥'}</div>
      <div class="vl-promo-info">
        <span class="vl-promo-status ${statusClass}">${statusText}</span>
        <h3>${escapeHtml(row.title || 'Promoção sem título')}</h3>
        <p>${escapeHtml(row.description || 'Sem descrição informada.')}</p>
        <div class="vl-promo-meta"><span class="vl-promo-chip vl-promo-business">${escapeHtml(row.businesses?.name || 'Empresa')}</span><span class="vl-promo-chip">${escapeHtml(row.businesses?.cities?.name || 'Cidade')}</span><span class="vl-promo-chip">${money(row.price)} ${row.original_price ? `· de ${money(row.original_price)}` : ''}</span><span class="vl-promo-chip">Início: ${dateTime(row.starts_at)}</span><span class="vl-promo-chip">Fim: ${row.ends_at ? dateTime(row.ends_at) : 'Sem término'}</span></div>
      </div>
      <div class="vl-promo-actions">${actionButtons.join('') || '<span style="font-size:11px;color:#7b8798;text-align:center">Sem ações</span>'}</div>
    </article>`
  }).join('') : `<div class="vl-promo-empty"><strong>Nenhuma promoção nesta fila</strong><span>Quando uma promoção for enviada para análise, ela aparecerá aqui.</span></div>`

  modal.innerHTML = `<div class="vl-promotions-backdrop"><div class="vl-promotions-modal">
    <div class="vl-promotions-head"><div><span class="vl-promotions-kicker">Moderação comercial</span><h2>Aprovação de promoções</h2><p>Revise as ofertas antes que apareçam no site. Somente administradores conseguem publicar ou rejeitar.</p></div><button class="vl-promotions-close" id="vl-promotions-close" type="button">×</button></div>
    <div class="vl-promotions-toolbar"><input id="vl-promotions-search" value="${escapeHtml(state.search)}" placeholder="Buscar por promoção, empresa ou cidade…"><button class="vl-promo-tab ${state.filter === 'pending_review' ? 'active' : ''}" data-promo-filter="pending_review">Pendentes <span class="vl-promo-count">${counts.pending_review}</span></button><button class="vl-promo-tab ${state.filter === 'published' ? 'active' : ''}" data-promo-filter="published">Publicadas <span class="vl-promo-count">${counts.published}</span></button><button class="vl-promo-tab ${state.filter === 'rejected' ? 'active' : ''}" data-promo-filter="rejected">Rejeitadas <span class="vl-promo-count">${counts.rejected}</span></button><button class="vl-promo-tab ${state.filter === 'archived' ? 'active' : ''}" data-promo-filter="archived">Arquivadas <span class="vl-promo-count">${counts.archived}</span></button><button class="vl-promo-tab ${state.filter === 'expired' ? 'active' : ''}" data-promo-filter="expired">Expiradas <span class="vl-promo-count">${counts.expired}</span></button><button class="vl-promo-tab ${state.filter === 'all' ? 'active' : ''}" data-promo-filter="all">Todas</button></div>
    <div class="vl-promo-grid">${list}</div><div class="vl-promotions-footer">Uma promoção publicada só fica visível publicamente durante o período definido, quando houver datas de início/fim.</div>
  </div></div>`

  modal.querySelector('#vl-promotions-close').addEventListener('click', closeModal)
  modal.querySelector('#vl-promotions-search').addEventListener('input', (event) => { state.search = event.target.value; renderModalContent() })
  modal.querySelectorAll('[data-promo-filter]').forEach((button) => button.addEventListener('click', () => { state.filter = button.dataset.promoFilter; renderModalContent() }))
  modal.querySelectorAll('[data-promo-action]').forEach((button) => button.addEventListener('click', async () => {
    const id = button.dataset.id
    const action = button.dataset.promoAction
    button.disabled = true
    try {
      const labels = { publish:'Promoção aprovada e publicada.', reject:'Promoção rejeitada.', archive:'Promoção pausada.' }
      const patch = action === 'publish' ? { status:'published' } : action === 'reject' ? { status:'rejected' } : { status:'archived' }
      await mutate(id, patch, labels[action])
    } catch (error) {
      notify(`Erro: ${error?.message || 'não foi possível atualizar a promoção.'}`)
      button.disabled = false
    }
  }))
}

function closeModal() {
  document.getElementById('vl-promotions-admin-modal')?.remove()
  state.open = false
}

async function openModal() {
  if (state.open || !supabase) return
  const admin = await assertAdmin()
  if (!admin) return notify('Acesso restrito ao administrador.')
  state.open = true
  injectStyles()
  const modal = document.createElement('div')
  modal.id = 'vl-promotions-admin-modal'
  document.body.appendChild(modal)
  try {
    await loadPromotions()
    renderModalContent()
  } catch (error) {
    modal.innerHTML = `<div class="vl-promotions-backdrop"><div class="vl-promotions-modal"><button class="vl-promotions-close" id="vl-promotions-close">×</button><h2>Não foi possível carregar as promoções</h2><p>${escapeHtml(error?.message || 'Erro desconhecido.')}</p></div></div>`
    modal.querySelector('#vl-promotions-close').addEventListener('click', closeModal)
  }
}

function ensureButton() {
  const nav = document.querySelector('.admin-nav')
  if (!nav || nav.querySelector('[data-vl-promotions-admin]')) return
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'admin-nav-item'
  button.dataset.vlPromotionsAdmin = 'true'
  button.innerHTML = '<span>🔥</span>Promoções'
  button.addEventListener('click', openModal)
  const businessButton = [...nav.querySelectorAll('button')].find((item) => (item.textContent || '').includes('Empresas'))
  if (businessButton?.nextElementSibling) nav.insertBefore(button, businessButton.nextElementSibling)
  else nav.appendChild(button)
}

async function refreshBadge() {
  if (!supabase) return
  try {
    if (!(await assertAdmin())) return
    const { count } = await supabase.from('promotions').select('id', { count:'exact', head:true }).eq('status', 'pending_review')
    const button = document.querySelector('[data-vl-promotions-admin]')
    if (!button) return
    button.querySelector('[data-vl-pending-count]')?.remove()
    if ((count || 0) > 0) {
      const badge = document.createElement('b')
      badge.dataset.vlPendingCount = 'true'
      badge.textContent = count
      button.appendChild(badge)
    }
  } catch (error) { console.debug('[VitrineLocal] promo badge', error?.message || error) }
}

function boot() {
  if (state.initialized) return
  state.initialized = true
  const observer = new MutationObserver(() => { ensureButton(); refreshBadge() })
  observer.observe(document.getElementById('root') || document.body, { childList:true, subtree:true })
  ensureButton()
}

boot()
