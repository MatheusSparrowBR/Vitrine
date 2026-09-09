import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

const state = { open: false, initialized: false, editingId: null, rows: [] }

const esc = (value = '') => String(value).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]))

function slugify(value = '') {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function isAdmin() {
  if (!supabase) return false
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  return profile?.role === 'admin'
}

function injectStyles() {
  if (document.getElementById('vl-categories-admin-css')) return
  const style = document.createElement('style')
  style.id = 'vl-categories-admin-css'
  style.textContent = `
    .vlcat-backdrop{position:fixed;inset:0;z-index:30000;background:rgba(4,10,20,.64);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.vlcat-modal{width:min(1050px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:22px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.28)}.vlcat-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.vlcat-kicker{font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#2474ff}.vlcat-head h2{margin:7px 0 8px;font:800 28px/1.05 Manrope;color:#122033}.vlcat-head p{margin:0;color:#738196;font-size:12px;line-height:1.55}.vlcat-close{border:0;background:#eef3f8;border-radius:50%;width:36px;height:36px;font-size:22px;color:#607089;cursor:pointer}.vlcat-form{margin-top:22px;padding:18px;border:1px solid #e0e7ef;border-radius:16px;background:#fbfcfe}.vlcat-grid{display:grid;grid-template-columns:1fr 1fr 120px;gap:11px}.vlcat-grid .full{grid-column:1/-1}.vlcat-field{display:grid;gap:6px}.vlcat-field span{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#6c7b90}.vlcat-field input,.vlcat-field textarea{width:100%;box-sizing:border-box;border:1px solid #d9e1ea;border-radius:10px;background:#fff;padding:10px 11px;font:500 12px 'DM Sans';outline:none;color:#26384f}.vlcat-field textarea{min-height:75px;resize:vertical}.vlcat-checkbox{display:flex;align-items:center;gap:7px;font-size:11px;color:#506077}.vlcat-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.vlcat-actions button{border:1px solid #d6dfe9;background:#fff;border-radius:9px;padding:9px 12px;font:700 11px 'DM Sans';color:#34465c;cursor:pointer}.vlcat-actions .primary{background:#2474ff;border-color:#2474ff;color:#fff}.vlcat-status{min-height:18px;margin-top:9px;font-size:11px;color:#65748a}.vlcat-status.error{color:#a42f2f}.vlcat-list-head{display:flex;justify-content:space-between;align-items:center;margin:23px 0 11px}.vlcat-list-head strong{font:800 16px Manrope;color:#24364d}.vlcat-list-head span{font-size:10px;color:#7b8798}.vlcat-row{display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center;padding:11px;border:1px solid #e0e7ef;border-radius:13px;background:#fff;margin-bottom:8px}.vlcat-icon{width:52px;height:52px;border-radius:12px;background:#eef4ff;display:grid;place-items:center;font-size:23px}.vlcat-info strong{display:block;font:800 13px Manrope;color:#25384e}.vlcat-info small{display:block;margin-top:3px;color:#7b8899;font-size:10px}.vlcat-info p{margin:5px 0 0;color:#6a788d;font-size:10px;line-height:1.4}.vlcat-actions-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.vlcat-actions-row button{border:1px solid #d7e0ea;background:#fff;border-radius:8px;padding:7px 9px;font:700 10px 'DM Sans';color:#3e5066;cursor:pointer}.vlcat-actions-row .toggle-off{background:#fff7e5;border-color:#ead5a5;color:#8b6500}.vlcat-actions-row .toggle-on{background:#eaf8f0;border-color:#b8dec8;color:#247b54}.vlcat-empty{padding:35px 15px;text-align:center;border:1px dashed #cdd8e4;border-radius:13px;color:#7b8899;font-size:11px}
    @media(max-width:760px){.vlcat-grid{grid-template-columns:1fr 1fr}.vlcat-row{grid-template-columns:45px 1fr}.vlcat-actions-row{grid-column:1/-1;justify-content:flex-start}.vlcat-icon{width:45px;height:45px}}@media(max-width:520px){.vlcat-modal{padding:18px}.vlcat-grid{grid-template-columns:1fr}.vlcat-grid .full{grid-column:auto}.vlcat-actions{flex-direction:column}.vlcat-actions button{width:100%}}
  `
  document.head.appendChild(style)
}

async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('id,name,slug,icon,description,active,sort_order,created_at').order('sort_order').order('name')
  if (error) throw error
  state.rows = data || []
}

function closeModal() {
  document.getElementById('vlcat-admin-root')?.remove()
  state.open = false
  state.editingId = null
}

function render() {
  const root = document.getElementById('vlcat-admin-root')
  if (!root) return
  const editing = state.rows.find((row) => row.id === state.editingId) || null
  const rows = state.rows
  root.innerHTML = `<div class="vlcat-backdrop"><div class="vlcat-modal">
    <div class="vlcat-head"><div><span class="vlcat-kicker">Catálogo</span><h2>Gerenciar categorias</h2><p>Crie novas categorias, altere a ordem, edite nomes e mantenha categorias desativadas sem apagar empresas que já usam essa classificação.</p></div><button class="vlcat-close" id="vlcat-close" type="button">×</button></div>
    <form class="vlcat-form" id="vlcat-form">
      <div class="vlcat-grid">
        <label class="vlcat-field"><span>Nome</span><input name="name" value="${esc(editing?.name || '')}" maxlength="80" required placeholder="Ex.: Academias"></label>
        <label class="vlcat-field"><span>Slug</span><input name="slug" value="${esc(editing?.slug || '')}" maxlength="80" placeholder="academias"></label>
        <label class="vlcat-field"><span>Ícone</span><input name="icon" value="${esc(editing?.icon || '✦')}" maxlength="8" placeholder="🏋️"></label>
        <label class="vlcat-field"><span>Ordem</span><input name="sort_order" type="number" min="0" max="9999" value="${Number(editing?.sort_order ?? ((rows[rows.length - 1]?.sort_order || 0) + 1))}"></label>
        <label class="vlcat-field"><span>Descrição</span><textarea name="description" class="full" maxlength="220" placeholder="Descrição curta da categoria">${esc(editing?.description || '')}</textarea></label>
      </div>
      ${editing ? `<label class="vlcat-checkbox"><input name="active" type="checkbox" ${editing.active ? 'checked' : ''}> Categoria ativa e visível para os moradores</label>` : ''}
      <div class="vlcat-status" id="vlcat-status"></div>
      <div class="vlcat-actions"><button type="button" id="vlcat-cancel">${editing ? 'Cancelar edição' : 'Limpar'}</button><button class="primary" type="submit">${editing ? 'Salvar alterações' : 'Criar categoria'}</button></div>
    </form>
    <div class="vlcat-list-head"><strong>Categorias cadastradas</strong><span>${rows.length} no total · ${rows.filter((x) => x.active).length} ativas</span></div>
    <div>${rows.length ? rows.map((row) => `<div class="vlcat-row"><div class="vlcat-icon">${esc(row.icon || '✦')}</div><div class="vlcat-info"><strong>${esc(row.name)}</strong><small>/${esc(row.slug)} · ordem ${row.sort_order ?? 0} · ${row.active ? 'ativa' : 'desativada'}</small>${row.description ? `<p>${esc(row.description)}</p>` : ''}</div><div class="vlcat-actions-row"><button data-edit="${row.id}">Editar</button><button class="${row.active ? 'toggle-off' : 'toggle-on'}" data-toggle="${row.id}">${row.active ? 'Desativar' : 'Ativar'}</button></div></div>`).join('') : '<div class="vlcat-empty">Nenhuma categoria cadastrada.</div>'}</div>
  </div></div>`

  root.querySelector('#vlcat-close').onclick = closeModal
  root.querySelector('#vlcat-cancel').onclick = () => { state.editingId = null; render() }

  const form = root.querySelector('#vlcat-form')
  const nameInput = form.querySelector('[name="name"]')
  const slugInput = form.querySelector('[name="slug"]')
  nameInput.addEventListener('input', () => { if (!state.editingId || !slugInput.value) slugInput.value = slugify(nameInput.value) })
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const status = form.querySelector('#vlcat-status')
    const data = new FormData(form)
    const name = String(data.get('name') || '').trim()
    const slug = slugify(String(data.get('slug') || name))
    if (!name) return
    const payload = { name, slug, icon: String(data.get('icon') || '✦').trim() || '✦', description: String(data.get('description') || '').trim() || null, sort_order: Number(data.get('sort_order') || 0) }
    if (editing) payload.active = data.get('active') === 'on'
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    status.textContent = editing ? 'Salvando…' : 'Criando…'
    try {
      const result = editing
        ? await supabase.from('categories').update(payload).eq('id', editing.id)
        : await supabase.from('categories').insert(payload)
      if (result.error) throw result.error
      await loadCategories()
      state.editingId = null
      render()
      status.textContent = ''
      if (!editing) window.setTimeout(() => document.querySelector('#vlcat-form [name="name"]')?.focus(), 0)
    } catch (error) {
      status.textContent = error?.message || 'Não foi possível salvar a categoria.'
      status.classList.add('error')
      button.disabled = false
    }
  })

  root.querySelectorAll('[data-edit]').forEach((button) => {
    button.onclick = () => { state.editingId = button.dataset.edit; render(); root.querySelector('[name="name"]')?.focus() }
  })
  root.querySelectorAll('[data-toggle]').forEach((button) => {
    button.onclick = async () => {
      const row = state.rows.find((item) => item.id === button.dataset.toggle)
      if (!row) return
      button.disabled = true
      const { error } = await supabase.from('categories').update({ active: !row.active }).eq('id', row.id)
      if (error) window.alert(`Erro: ${error.message}`)
      else await loadCategories()
      render()
    }
  })
}

async function openModal() {
  if (state.open || !supabase) return
  if (!(await isAdmin())) return window.alert('Acesso restrito ao administrador.')
  state.open = true
  injectStyles()
  const root = document.createElement('div')
  root.id = 'vlcat-admin-root'
  document.body.appendChild(root)
  try { await loadCategories(); render() }
  catch (error) { root.innerHTML = `<div class="vlcat-backdrop"><div class="vlcat-modal"><button class="vlcat-close" id="vlcat-close">×</button><h2>Erro ao carregar categorias</h2><p>${esc(error?.message || 'Erro desconhecido.')}</p></div></div>`; root.querySelector('#vlcat-close').onclick = closeModal }
}

async function refreshBadge() {
  const button = document.querySelector('[data-vl-categories-admin]')
  if (!button || !supabase || !(await isAdmin())) return
  const { count } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('active', true)
  button.querySelector('.vlcat-badge')?.remove()
  if (Number.isFinite(count)) {
    const badge = document.createElement('b')
    badge.className = 'vlcat-badge'
    badge.textContent = count
    button.appendChild(badge)
  }
}

function boot() {
  if (state.initialized) return
  state.initialized = true
  const observer = new MutationObserver(() => {
    const nav = document.querySelector('.admin-nav')
    if (!nav || nav.querySelector('[data-vl-categories-admin]')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'admin-nav-item'
    button.dataset.vlCategoriesAdmin = 'true'
    button.innerHTML = '<span>⌂</span>Categorias'
    button.onclick = openModal
    const anchor = [...nav.querySelectorAll('button')].find((item) => (item.textContent || '').includes('Empresas'))
    if (anchor) anchor.insertAdjacentElement('afterend', button)
    else nav.appendChild(button)
    refreshBadge()
  })
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
}

boot()
