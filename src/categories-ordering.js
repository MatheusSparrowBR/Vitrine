import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

const state = { initialized: false, busy: false }

function injectStyles() {
  if (document.getElementById('vlcat-ordering-css')) return
  const style = document.createElement('style')
  style.id = 'vlcat-ordering-css'
  style.textContent = `
    .vlcat-auto-order-note{display:block;margin:7px 0 0;color:#7b8899;font-size:9px;line-height:1.4}
    .vlcat-order-trigger{border:1px solid #cfe0f8!important;background:#f4f8ff!important;color:#246bff!important;white-space:nowrap}
    .vlcat-order-backdrop{position:fixed;inset:0;z-index:31000;background:rgba(4,10,20,.64);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}
    .vlcat-order-modal{width:min(720px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:22px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.28)}
    .vlcat-order-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .vlcat-order-head span{font-size:9px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#2474ff}
    .vlcat-order-head h3{margin:6px 0 5px;font:800 22px/1.1 Manrope;color:#122033}
    .vlcat-order-head p{margin:0;color:#738196;font-size:11px;line-height:1.5}
    .vlcat-order-close{border:0;background:#eef3f8;border-radius:50%;width:34px;height:34px;font-size:21px;color:#607089;cursor:pointer}
    .vlcat-order-list{display:grid;gap:7px;margin-top:20px}
    .vlcat-order-item{display:grid;grid-template-columns:38px 1fr auto;gap:10px;align-items:center;padding:10px;border:1px solid #e0e7ef;border-radius:12px;background:#fff;cursor:grab;transition:.15s ease;user-select:none}
    .vlcat-order-item:active{cursor:grabbing}
    .vlcat-order-item.dragging{opacity:.55;border-color:#2474ff;background:#f5f9ff}
    .vlcat-order-item.drop-target{border-color:#2474ff;box-shadow:0 0 0 2px rgba(36,116,255,.10)}
    .vlcat-order-number{width:34px;height:34px;border-radius:10px;background:#eef4ff;color:#246bff;display:grid;place-items:center;font:900 11px Manrope}
    .vlcat-order-info strong{display:block;font:800 12px Manrope;color:#25384e}
    .vlcat-order-info small{display:block;margin-top:2px;color:#8995a5;font-size:9px}
    .vlcat-order-controls{display:flex;gap:5px}
    .vlcat-order-controls button{width:31px;height:31px;border:1px solid #d7e0ea;background:#fff;border-radius:8px;color:#3e5066;font-weight:900;cursor:pointer}
    .vlcat-order-controls button:disabled{opacity:.35;cursor:default}
    .vlcat-order-hint{margin-top:11px;padding:9px 11px;border-radius:10px;background:#f7faff;border:1px solid #dfeaf8;color:#6d7d92;font-size:9px;line-height:1.45}
    .vlcat-order-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #edf1f5}
    .vlcat-order-footer button{border:1px solid #d6dfe9;background:#fff;border-radius:9px;padding:9px 13px;font:700 10px 'DM Sans';color:#34465c;cursor:pointer}
    .vlcat-order-footer .primary{background:#2474ff;border-color:#2474ff;color:#fff}
    .vlcat-order-footer button:disabled{opacity:.6;cursor:wait}
    .vlcat-order-error{margin-top:9px;color:#a42f2f;font-size:10px}
    @media(max-width:700px){.vlcat-order-trigger{width:100%;margin-top:8px}.vlcat-order-modal{padding:18px}.vlcat-order-item{grid-template-columns:34px 1fr}.vlcat-order-controls{grid-column:2;justify-content:flex-start}.vlcat-order-footer{flex-direction:column}.vlcat-order-footer button{width:100%}}
  `
  document.head.appendChild(style)
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char]))
}

function findCategoriesSection() {
  return [...document.querySelectorAll('.admin-v2-management-layout')].find(section => {
    const heading = section.querySelector('h2')
    return heading && heading.textContent.trim().toLowerCase() === 'categorias'
  }) || null
}

async function getCategories() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,slug,sort_order,active,created_at')
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return data || []
}

async function setCreateOrder() {
  const section = findCategoriesSection()
  const input = [...(section?.querySelectorAll('input') || [])].find(el => el.type === 'number')
  if (!input) return

  const editing = Boolean(section.querySelector('h2')?.textContent?.toLowerCase().includes('editar categoria'))
  input.readOnly = true
  input.title = editing
    ? 'A ordem é controlada pelo recurso Reordenar categorias.'
    : 'Definida automaticamente com base na última categoria cadastrada.'

  if (!editing) {
    try {
      const rows = await getCategories()
      input.value = String(rows.reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), 0) + 1)
    } catch {}
  }

  if (!input.parentElement?.querySelector('.vlcat-auto-order-note')) {
    const note = document.createElement('small')
    note.className = 'vlcat-auto-order-note'
    note.textContent = 'Automática: nova categoria entra após a última posição.'
    input.parentElement?.appendChild(note)
  }
}

function closeOrderModal() {
  document.getElementById('vlcat-order-root')?.remove()
  state.busy = false
}

function refreshCategoriesSection() {
  const section = findCategoriesSection()
  const trigger = section?.querySelector('.vlcat-order-trigger')
  trigger?.click()
}

async function openOrdering() {
  if (state.busy || !supabase) return
  state.busy = true
  injectStyles()

  let rows
  try {
    rows = await getCategories()
  } catch (error) {
    state.busy = false
    window.alert(error?.message || 'Não foi possível carregar as categorias.')
    return
  }

  const root = document.createElement('div')
  root.id = 'vlcat-order-root'
  root.innerHTML = `<div class="vlcat-order-backdrop"><div class="vlcat-order-modal" role="dialog" aria-modal="true" aria-labelledby="vlcat-order-title">
    <div class="vlcat-order-head"><div><span>Organização do catálogo</span><h3 id="vlcat-order-title">Ordenar categorias</h3><p>Arraste uma categoria para a posição desejada ou use as setas. Ao salvar, o sistema renumera tudo automaticamente de 1 em diante.</p></div><button class="vlcat-order-close" id="vlcat-order-close" type="button" aria-label="Fechar">×</button></div>
    <div class="vlcat-order-list" id="vlcat-order-list"></div>
    <div class="vlcat-order-hint">💡 A ordem exibida aqui é a mesma usada no catálogo público. Categorias novas entram automaticamente depois da última posição.</div>
    <div class="vlcat-order-error" id="vlcat-order-error"></div>
    <div class="vlcat-order-footer"><button id="vlcat-order-cancel" type="button">Cancelar</button><button class="primary" id="vlcat-order-save" type="button">Salvar nova ordem</button></div>
  </div></div>`
  document.body.appendChild(root)

  let draft = [...rows]
  const list = root.querySelector('#vlcat-order-list')

  const move = (from, to) => {
    if (from < 0 || to < 0 || from === to || to >= draft.length) return
    const [moved] = draft.splice(from, 1)
    draft.splice(to, 0, moved)
    renderList()
  }

  const renderList = () => {
    list.innerHTML = draft.map((row, index) => `<div class="vlcat-order-item" draggable="true" data-id="${escapeHtml(row.id)}"><div class="vlcat-order-number">${index + 1}</div><div class="vlcat-order-info"><strong>${escapeHtml(row.name)}</strong><small>${row.active ? 'Ativa' : 'Desativada'} · posição ${index + 1}</small></div><div class="vlcat-order-controls"><button type="button" data-up="${escapeHtml(row.id)}" ${index===0?'disabled':''} aria-label="Mover para cima">↑</button><button type="button" data-down="${escapeHtml(row.id)}" ${index===draft.length-1?'disabled':''} aria-label="Mover para baixo">↓</button></div></div>`).join('')

    list.querySelectorAll('[data-up]').forEach(button => {
      button.onclick = () => {
        const index = draft.findIndex(row => row.id === button.dataset.up)
        move(index, index - 1)
      }
    })
    list.querySelectorAll('[data-down]').forEach(button => {
      button.onclick = () => {
        const index = draft.findIndex(row => row.id === button.dataset.down)
        move(index, index + 1)
      }
    })

    list.querySelectorAll('.vlcat-order-item').forEach(item => {
      item.ondragstart = event => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', item.dataset.id)
        item.classList.add('dragging')
      }
      item.ondragend = () => {
        item.classList.remove('dragging')
        list.querySelectorAll('.drop-target').forEach(target => target.classList.remove('drop-target'))
      }
      item.ondragover = event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        item.classList.add('drop-target')
      }
      item.ondragleave = () => item.classList.remove('drop-target')
      item.ondrop = event => {
        event.preventDefault()
        item.classList.remove('drop-target')
        const from = draft.findIndex(row => row.id === event.dataTransfer.getData('text/plain'))
        const to = draft.findIndex(row => row.id === item.dataset.id)
        move(from, to)
      }
    })
  }

  renderList()
  root.querySelector('#vlcat-order-close').onclick = closeOrderModal
  root.querySelector('#vlcat-order-cancel').onclick = closeOrderModal
  root.querySelector('.vlcat-order-backdrop').onclick = event => {
    if (event.target === event.currentTarget) closeOrderModal()
  }
  document.addEventListener('keydown', handleEscape, { once: true })

  root.querySelector('#vlcat-order-save').onclick = async () => {
    if (!draft.length) return closeOrderModal()
    const save = root.querySelector('#vlcat-order-save')
    const errorBox = root.querySelector('#vlcat-order-error')
    save.disabled = true
    errorBox.textContent = ''
    try {
      const { error } = await supabase.rpc('reorder_categories', { p_category_ids: draft.map(row => row.id) })
      if (error) throw error
      closeOrderModal()
      window.setTimeout(() => refreshCategoriesSection(), 100)
    } catch (error) {
      errorBox.textContent = error?.message || 'Não foi possível salvar a nova ordem.'
      save.disabled = false
    }
  }
}

function handleEscape(event) {
  if (event.key === 'Escape') closeOrderModal()
}

function enhanceCategories() {
  const section = findCategoriesSection()
  if (!section || section.dataset.orderEnhanced === '1') {
    if (section) setCreateOrder()
    return
  }

  section.dataset.orderEnhanced = '1'
  const head = section.querySelector('.admin-v2-section-head')
  if (head && !head.querySelector('.vlcat-order-trigger')) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'admin-v2-btn vlcat-order-trigger'
    button.textContent = '↕ Reordenar categorias'
    button.onclick = openOrdering
    head.appendChild(button)
  }
  setCreateOrder()
}

function boot() {
  if (state.initialized) return
  state.initialized = true
  injectStyles()
  const observer = new MutationObserver(() => enhanceCategories())
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  enhanceCategories()
}

boot()
