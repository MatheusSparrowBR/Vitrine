import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

const state = { open: false, editingId: null, rows: [] }

const esc = (value = '') => String(value).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' })[c])
const slugify = (value = '') => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function isAdmin() {
  if (!supabase) return false
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  return profile?.role === 'admin'
}

function injectStyles() {
  if (document.getElementById('vl-cities-admin-css')) return
  const style = document.createElement('style')
  style.id = 'vl-cities-admin-css'
  style.textContent = `
    .vlcity-backdrop{position:fixed;inset:0;z-index:30000;background:rgba(4,10,20,.64);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.vlcity-modal{width:min(1050px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:22px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.28)}.vlcity-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.vlcity-kicker{font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#2474ff}.vlcity-head h2{margin:7px 0 8px;font:800 28px/1.05 Manrope;color:#122033}.vlcity-head p{margin:0;color:#738196;font-size:12px;line-height:1.55}.vlcity-close{border:0;background:#eef3f8;border-radius:50%;width:36px;height:36px;font-size:22px;color:#607089;cursor:pointer}.vlcity-form{margin-top:22px;padding:18px;border:1px solid #e0e7ef;border-radius:16px;background:#fbfcfe}.vlcity-grid{display:grid;grid-template-columns:1.2fr .7fr 1fr 1fr;gap:11px}.vlcity-field{display:grid;gap:6px}.vlcity-field span{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#6c7b90}.vlcity-field input{width:100%;box-sizing:border-box;border:1px solid #d9e1ea;border-radius:10px;background:#fff;padding:10px 11px;font:500 12px 'DM Sans';outline:none;color:#26384f}.vlcity-check{display:flex;align-items:center;gap:7px;font-size:11px;color:#506077;margin-top:12px}.vlcity-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.vlcity-actions button{border:1px solid #d6dfe9;background:#fff;border-radius:9px;padding:9px 12px;font:700 11px 'DM Sans';color:#34465c;cursor:pointer}.vlcity-actions .primary{background:#2474ff;border-color:#2474ff;color:#fff}.vlcity-status{min-height:18px;margin-top:9px;font-size:11px;color:#65748a}.vlcity-status.error{color:#a42f2f}.vlcity-list-head{display:flex;justify-content:space-between;align-items:center;margin:23px 0 11px}.vlcity-list-head strong{font:800 16px Manrope;color:#24364d}.vlcity-list-head span{font-size:10px;color:#7b8798}.vlcity-row{display:grid;grid-template-columns:54px 1fr auto;gap:12px;align-items:center;padding:11px;border:1px solid #e0e7ef;border-radius:13px;background:#fff;margin-bottom:8px}.vlcity-icon{width:54px;height:54px;border-radius:12px;background:#eef4ff;display:grid;place-items:center;font-size:24px}.vlcity-info strong{display:block;font:800 14px Manrope;color:#25384e}.vlcity-info small{display:block;margin-top:3px;color:#7b8899;font-size:10px}.vlcity-actions-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.vlcity-actions-row button{border:1px solid #d7e0ea;background:#fff;border-radius:8px;padding:7px 9px;font:700 10px 'DM Sans';color:#3e5066;cursor:pointer}.vlcity-actions-row .toggle-off{background:#fff7e5;border-color:#ead5a5;color:#8b6500}.vlcity-actions-row .toggle-on{background:#eaf8f0;border-color:#b8dec8;color:#247b54}.vlcity-empty{padding:35px 15px;text-align:center;border:1px dashed #cdd8e4;border-radius:13px;color:#7b8899;font-size:11px}@media(max-width:760px){.vlcity-grid{grid-template-columns:1fr 1fr}.vlcity-row{grid-template-columns:45px 1fr}.vlcity-actions-row{grid-column:1/-1;justify-content:flex-start}.vlcity-icon{width:45px;height:45px}}@media(max-width:520px){.vlcity-modal{padding:18px}.vlcity-grid{grid-template-columns:1fr}.vlcity-actions{flex-direction:column}.vlcity-actions button{width:100%}}
  `
  document.head.appendChild(style)
}

async function loadCities() {
  const { data, error } = await supabase.from('cities').select('id,name,state,slug,country,active,created_at,updated_at').order('name')
  if (error) throw error
  state.rows = data || []
}

function closeModal() {
  document.getElementById('vlcity-admin-root')?.remove()
  state.open = false
  state.editingId = null
}

function render() {
  const root = document.getElementById('vlcity-admin-root')
  if (!root) return
  const editing = state.rows.find((row) => row.id === state.editingId) || null
  root.innerHTML = `<div class="vlcity-backdrop"><div class="vlcity-modal">
    <div class="vlcity-head"><div><span class="vlcity-kicker">Expansão</span><h2>Gerenciar cidades</h2><p>Cadastre novas cidades, defina o slug público e ative/desative cidades sem apagar o histórico de conteúdo.</p></div><button class="vlcity-close" id="vlcity-close" type="button">×</button></div>
    <form class="vlcity-form" id="vlcity-form">
      <div class="vlcity-grid">
        <label class="vlcity-field"><span>Nome da cidade</span><input name="name" value="${esc(editing?.name || '')}" maxlength="90" required placeholder="Ex.: Imbituba"></label>
        <label class="vlcity-field"><span>UF</span><input name="state" value="${esc(editing?.state || '')}" maxlength="2" required placeholder="SC"></label>
        <label class="vlcity-field"><span>Slug</span><input name="slug" value="${esc(editing?.slug || '')}" maxlength="90" placeholder="imbituba"></label>
        <label class="vlcity-field"><span>País</span><input name="country" value="${esc(editing?.country || 'BR')}" maxlength="2" placeholder="BR"></label>
      </div>
      ${editing ? `<label class="vlcity-check"><input name="active" type="checkbox" ${editing.active ? 'checked' : ''}> Cidade ativa para os moradores</label>` : '<label class="vlcity-check"><input name="active" type="checkbox" checked> Criar cidade ativa imediatamente</label>'}
      <div class="vlcity-status" id="vlcity-status"></div>
      <div class="vlcity-actions"><button type="button" id="vlcity-cancel">${editing ? 'Cancelar edição' : 'Limpar'}</button><button class="primary" type="submit">${editing ? 'Salvar alterações' : 'Criar cidade'}</button></div>
    </form>
    <div class="vlcity-list-head"><strong>Cidades cadastradas</strong><span>${state.rows.length} no total · ${state.rows.filter((x) => x.active).length} ativas</span></div>
    <div>${state.rows.length ? state.rows.map((row) => `<div class="vlcity-row"><div class="vlcity-icon">📍</div><div class="vlcity-info"><strong>${esc(row.name)} - ${esc(row.state)}</strong><small>/${esc(row.slug)} · ${row.active ? 'ativa' : 'desativada'} · ${esc(row.country || 'BR')}</small></div><div class="vlcity-actions-row"><button data-edit="${row.id}">Editar</button><button class="${row.active ? 'toggle-off' : 'toggle-on'}" data-toggle="${row.id}">${row.active ? 'Desativar' : 'Ativar'}</button></div></div>`).join('') : '<div class="vlcity-empty">Nenhuma cidade cadastrada.</div>'}</div>
  </div></div>`

  root.querySelector('#vlcity-close').onclick = closeModal
  root.querySelector('#vlcity-cancel').onclick = () => { state.editingId = null; render() }

  const form = root.querySelector('#vlcity-form')
  const nameInput = form.querySelector('[name="name"]')
  const slugInput = form.querySelector('[name="slug"]')
  nameInput.addEventListener('input', () => { if (!state.editingId || !slugInput.value) slugInput.value = slugify(nameInput.value) })
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const status = form.querySelector('#vlcity-status')
    status.classList.remove('error')
    const data = new FormData(form)
    const name = String(data.get('name') || '').trim()
    const stateCode = String(data.get('state') || '').trim().toUpperCase()
    const slug = slugify(String(data.get('slug') || name))
    const country = String(data.get('country') || 'BR').trim().toUpperCase()
    if (!name || stateCode.length !== 2 || !slug) { status.textContent = 'Preencha nome, UF e slug corretamente.'; status.classList.add('error'); return }
    const payload = { name, state: stateCode, slug, country, active: data.get('active') === 'on', updated_at: new Date().toISOString() }
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; status.textContent = editing ? 'Salvando…' : 'Criando…'
    try {
      const result = editing ? await supabase.from('cities').update(payload).eq('id', editing.id) : await supabase.from('cities').insert(payload)
      if (result.error) throw result.error
      await loadCities(); state.editingId = null; render()
    } catch (error) {
      status.textContent = error?.message || 'Não foi possível salvar a cidade.'; status.classList.add('error'); button.disabled = false
    }
  })

  root.querySelectorAll('[data-edit]').forEach((button) => { button.onclick = () => { state.editingId = button.dataset.edit; render(); root.querySelector('[name="name"]')?.focus() } })
  root.querySelectorAll('[data-toggle]').forEach((button) => { button.onclick = async () => { const row = state.rows.find((item) => item.id === button.dataset.toggle); if (!row) return; button.disabled = true; const { error } = await supabase.from('cities').update({ active: !row.active, updated_at: new Date().toISOString() }).eq('id', row.id); if (error) window.alert(`Erro: ${error.message}`); else await loadCities(); render() } })
}

async function openModal() {
  if (state.open || !supabase) return
  if (!(await isAdmin())) return window.alert('Acesso restrito ao administrador.')
  state.open = true; styles()
  const root = document.createElement('div'); root.id = 'vlcity-admin-root'; document.body.appendChild(root)
  try { await loadCities(); render() } catch (error) { root.innerHTML = `<div class="vlcity-backdrop"><div class="vlcity-modal"><button class="vlcity-close" id="vlcity-close">×</button><h2>Erro ao carregar cidades</h2><p>${esc(error?.message || 'Erro desconhecido.')}</p></div></div>`; root.querySelector('#vlcity-close').onclick = closeModal }
}

function wireExistingOrCreateButton() {
  const nav = document.querySelector('.admin-nav')
  if (!nav || nav.querySelector('[data-vl-cities-admin]')) return
  let button = [...nav.querySelectorAll('button')].find((item) => (item.textContent || '').trim() === 'Cidades')
  if (!button) {
    button = document.createElement('button')
    button.type = 'button'; button.className = 'admin-nav-item'; button.innerHTML = '<span>📍</span>Cidades'
    const anchor = [...nav.querySelectorAll('button')].find((item) => (item.textContent || '').includes('Categorias'))
    if (anchor) anchor.insertAdjacentElement('afterend', button); else nav.appendChild(button)
  }
  button.dataset.vlCitiesAdmin = 'true'
  button.onclick = openModal
}

function boot() {
  const observer = new MutationObserver(wireExistingOrCreateButton)
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  wireExistingOrCreateButton()
}

boot()
