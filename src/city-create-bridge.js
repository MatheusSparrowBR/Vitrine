import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null
const state = { initialized: false, modalOpen: false }

const esc = (value = '') => String(value).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]))
const slugify = (value = '') => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function isAdmin() {
  if (!supabase) return false
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  return profile?.role === 'admin'
}

function addStyles() {
  if (document.getElementById('vl-city-create-bridge-css')) return
  const style = document.createElement('style')
  style.id = 'vl-city-create-bridge-css'
  style.textContent = `
    .vlcity-inline-action{display:flex;align-items:center;gap:12px;margin-left:auto}.vlcity-inline-action button{border:0;background:#2474ff;color:#fff;border-radius:10px;padding:10px 14px;font:800 11px 'DM Sans';cursor:pointer;box-shadow:0 8px 20px rgba(36,116,255,.2)}.vlcity-inline-action button:hover{filter:brightness(.97);transform:translateY(-1px)}
    .vlcc-backdrop{position:fixed;inset:0;z-index:35000;background:rgba(4,10,20,.66);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.vlcc-modal{width:min(650px,100%);background:#fff;border-radius:22px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.3)}.vlcc-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.vlcc-kicker{font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#2474ff}.vlcc-head h2{margin:7px 0 8px;font:800 27px/1.05 Manrope;color:#122033}.vlcc-head p{margin:0;color:#738196;font-size:12px;line-height:1.55}.vlcc-close{border:0;background:#eef3f8;border-radius:50%;width:36px;height:36px;font-size:22px;color:#607089;cursor:pointer}.vlcc-grid{display:grid;grid-template-columns:1.2fr .55fr 1fr 1fr;gap:11px;margin-top:20px}.vlcc-field{display:grid;gap:6px}.vlcc-field span{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#6c7b90}.vlcc-field input{width:100%;box-sizing:border-box;border:1px solid #d9e1ea;border-radius:10px;background:#fff;padding:11px 12px;font:500 12px 'DM Sans';outline:none;color:#26384f}.vlcc-check{display:flex;align-items:center;gap:7px;margin-top:12px;font-size:11px;color:#506077}.vlcc-status{min-height:18px;margin-top:10px;font-size:11px;color:#65748a}.vlcc-status.error{color:#a42f2f}.vlcc-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.vlcc-actions button{border:1px solid #d6dfe9;background:#fff;border-radius:9px;padding:10px 13px;font:700 11px 'DM Sans';color:#34465c;cursor:pointer}.vlcc-actions .primary{background:#2474ff;border-color:#2474ff;color:#fff}.vlcc-actions button:disabled{opacity:.6;cursor:not-allowed}
    @media(max-width:700px){.vlcity-inline-action{margin-left:0;margin-top:12px}.vlcc-grid{grid-template-columns:1fr 1fr}.vlcc-grid .wide{grid-column:1/-1}}@media(max-width:520px){.vlcc-modal{padding:18px}.vlcc-grid{grid-template-columns:1fr}.vlcc-grid .wide{grid-column:auto}.vlcc-actions{flex-direction:column}.vlcc-actions button{width:100%}}
  `
  document.head.appendChild(style)
}

function closeModal() {
  document.getElementById('vlcc-root')?.remove()
  state.modalOpen = false
}

async function openCreateModal() {
  if (state.modalOpen || !(await isAdmin())) return
  state.modalOpen = true
  addStyles()
  const root = document.createElement('div')
  root.id = 'vlcc-root'
  root.innerHTML = `<div class="vlcc-backdrop"><div class="vlcc-modal">
    <div class="vlcc-head"><div><span class="vlcc-kicker">Expansão</span><h2>Adicionar nova cidade</h2><p>Cadastre uma cidade para que ela possa receber empresas, promoções e conteúdo próprios.</p></div><button class="vlcc-close" type="button">×</button></div>
    <form id="vlcc-form">
      <div class="vlcc-grid">
        <label class="vlcc-field wide"><span>Nome da cidade</span><input name="name" maxlength="90" required placeholder="Ex.: Imbituba"></label>
        <label class="vlcc-field"><span>UF</span><input name="state" maxlength="2" required placeholder="SC"></label>
        <label class="vlcc-field"><span>Slug</span><input name="slug" maxlength="90" placeholder="imbituba"></label>
        <label class="vlcc-field"><span>País</span><input name="country" maxlength="2" value="BR" placeholder="BR"></label>
      </div>
      <label class="vlcc-check"><input name="active" type="checkbox" checked> Ativar imediatamente no seletor de cidades</label>
      <div class="vlcc-status" id="vlcc-status"></div>
      <div class="vlcc-actions"><button type="button" class="vlcc-cancel">Cancelar</button><button type="submit" class="primary">Criar cidade</button></div>
    </form>
  </div></div>`
  document.body.appendChild(root)

  root.querySelector('.vlcc-close').onclick = closeModal
  root.querySelector('.vlcc-cancel').onclick = closeModal
  root.querySelector('.vlcc-backdrop').onclick = (event) => { if (event.target.classList.contains('vlcc-backdrop')) closeModal() }

  const form = root.querySelector('#vlcc-form')
  const nameInput = form.querySelector('[name="name"]')
  const slugInput = form.querySelector('[name="slug"]')
  nameInput.addEventListener('input', () => { if (!slugInput.value) slugInput.value = slugify(nameInput.value) })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const status = root.querySelector('#vlcc-status')
    const submit = form.querySelector('button[type="submit"]')
    status.classList.remove('error')
    const data = new FormData(form)
    const name = String(data.get('name') || '').trim()
    const stateCode = String(data.get('state') || '').trim().toUpperCase()
    const slug = slugify(String(data.get('slug') || name))
    const country = String(data.get('country') || 'BR').trim().toUpperCase()
    const active = data.get('active') === 'on'
    if (!name || stateCode.length !== 2 || !slug) { status.textContent = 'Preencha nome, UF e slug corretamente.'; status.classList.add('error'); return }
    submit.disabled = true
    status.textContent = 'Criando cidade…'
    try {
      const { error } = await supabase.from('cities').insert({ name, state: stateCode, slug, country, active })
      if (error) throw error
      closeModal()
      const activeText = active ? ' ativa' : ' criada como inativa'
      const toast = document.createElement('div')
      Object.assign(toast.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:36000,background:'#10253f',color:'#fff',padding:'12px 15px',borderRadius:'11px',font:'700 12px DM Sans',boxShadow:'0 15px 35px rgba(0,0,0,.22)'})
      toast.textContent = `${name} - ${stateCode}${activeText}.`
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3500)
      setTimeout(() => window.location.reload(), 1200)
    } catch (error) {
      status.textContent = error?.message || 'Não foi possível criar a cidade.'
      status.classList.add('error')
      submit.disabled = false
    }
  })
  nameInput.focus()
}

function ensureCreateButton() {
  const mainHead = document.querySelector('.admin-head')
  const title = mainHead?.querySelector('h1')
  if (!mainHead || !title || title.textContent.trim() !== 'Cidades') {
    document.querySelector('[data-vl-city-create-inline]')?.remove()
    return
  }
  if (mainHead.querySelector('[data-vl-city-create-inline]')) return
  const actionWrap = document.createElement('div')
  actionWrap.className = 'vlcity-inline-action'
  actionWrap.dataset.vlCityCreateInline = 'true'
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '＋ Nova cidade'
  button.addEventListener('click', openCreateModal)
  actionWrap.appendChild(button)
  const user = mainHead.querySelector('.admin-user')
  if (user) mainHead.insertBefore(actionWrap, user)
  else mainHead.appendChild(actionWrap)
}

function boot() {
  if (state.initialized) return
  state.initialized = true
  const observer = new MutationObserver(ensureCreateButton)
  observer.observe(document.getElementById('root') || document.body, { childList:true, subtree:true })
  ensureCreateButton()
}

boot()
