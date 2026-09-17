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
    .vlcat-auto-order-note{margin:7px 0 0;color:#7b8899;font-size:9px;line-height:1.4}
    .vlcat-order-trigger{border:1px solid #cfe0f8!important;background:#f4f8ff!important;color:#246bff!important}
    .vlcat-order-backdrop{position:fixed;inset:0;z-index:31000;background:rgba(4,10,20,.64);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}
    .vlcat-order-modal{width:min(720px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:22px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.28)}
    .vlcat-order-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .vlcat-order-head span{font-size:9px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#2474ff}
    .vlcat-order-head h3{margin:6px 0 5px;font:800 22px/1.1 Manrope;color:#122033}
    .vlcat-order-head p{margin:0;color:#738196;font-size:11px;line-height:1.5}
    .vlcat-order-close{border:0;background:#eef3f8;border-radius:50%;width:34px;height:34px;font-size:21px;color:#607089;cursor:pointer}
    .vlcat-order-list{display:grid;gap:7px;margin-top:20px}
    .vlcat-order-item{display:grid;grid-template-columns:38px 1fr auto;gap:10px;align-items:center;padding:10px;border:1px solid #e0e7ef;border-radius:12px;background:#fff;cursor:grab;transition:.15s ease}
    .vlcat-order-item.dragging{opacity:.55;border-color:#2474ff;background:#f5f9ff}
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
    @media(max-width:520px){.vlcat-order-modal{padding:18px}.vlcat-order-item{grid-template-columns:34px 1fr}.vlcat-order-controls{grid-column:2;justify-content:flex-start}.vlcat-order-footer{flex-direction:column}.vlcat-order-footer button{width:100%}}
  `
  document.head.appendChild(style)
}

async function getCategories() {
  if (!supabase) return []
  const { data, error } = await supabase.from('categories').select('id,name,slug,sort_order,active,created_at').order('sort_order').order('created_at')
  if (error) throw error
  return data || []
}

async function setCreateOrder() {
  const modal = document.querySelector('#vlcat-admin-root .vlcat-modal')
  const input = modal?.querySelector('[name="sort_order"]')
  if (!input) return
  const editing = Boolean(modal.querySelector('#vlcat-cancel')?.textContent?.includes('Cancelar edição'))
  input.readOnly = true
  input.title = editing ? 'A ordem é controlada pelo recurso Reordenar categorias.' : 'Definida automaticamente com base na última categoria cadastrada.'
  if (editing) return
  try {
    const rows = await getCategories()
    input.value = String(rows.reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), 0) + 1)
  } catch {}
  if (!input.parentElement.querySelector('.vlcat-auto-order-note')) {
    const note = document.createElement('small')
    note.className = 'vlcat-auto-order-note'
    note.textContent = 'Automática: nova categoria entra após a última posição.'
    input.parentElement.appendChild(note)
  }
}

function closeOrderModal() {
  document.getElementById('vlcat-order-root')?.remove()
  state.busy = false
}

function rerenderCategoriesModal() {
  const close = document.querySelector('#vlcat-admin-root #vlcat-close')
  close?.click()
  setTimeout(() => document.querySelector('[data-vl-categories-admin]')?.click(), 80)
}

async function openOrdering() {
  if (state.busy || !supabase) return
  state.busy = true
  injectStyles()
  let rows
  try { rows = await getCategories() } catch (error) { state.busy = false; return window.alert(error?.message || 'Não foi possível carregar as categorias.') }

  const root = document.createElement('div')
  root.id = 'vlcat-order-root'
  root.innerHTML = `<div class="vlcat-order-backdrop"><div class="vlcat-order-modal" role="dialog" aria-modal="true" aria-labelledby="vlcat-order-title">
    <div class="vlcat-order-head"><div><span>Organização do catálogo</span><h3 id="vlcat-order-title">Ordenar categorias</h3><p>Arraste uma categoria para a posição desejada ou use as setas. Ao salvar, o sistema renumera tudo automaticamente de 1 em diante.</p></div><button class="vlcat-order-close" id="vlcat-order-close" type="button">×</button></div>
    <div class="vlcat-order-list" id="vlcat-order-list"></div>
    <div class="vlcat-order-hint">💡 A ordem exibida aqui é a mesma usada no catálogo público. Categorias novas não exigem mais digitação manual de posição: elas entram automaticamente depois da última.</div>
    <div class="vlcat-order-error" id="vlcat-order-error"></div>
    <div class="vlcat-order-footer"><button id="vlcat-order-cancel" type="button">Cancelar</button><button class="primary" id="vlcat-order-save" type="button">Salvar nova ordem</button></div>
  </div></div>`
  document.body.appendChild(root)

  let draft = [...rows]
  const list = root.querySelector('#vlcat-order-list')
  const renderList = () => {
    list.innerHTML = draft.map((row, index) => `<div class="vlcat-order-item" draggable="true" data-id="${row.id}"><div class="vlcat-order-number">${index + 1}</div><div class="vlcat-order-info"><strong>${String(row.name).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}</strong><small>${row.active ? 'Ativa' : 'Desativada'} · posição ${index + 1}</small></div><div class="vlcat-order-controls"><button type="button" data-up="${row.id}" ${index===0?'disabled':''} aria-label="Mover para cima">↑</button><button type="button" data-down="${row.id}" ${index===draft.length-1?'disabled':''} aria-label="Mover para baixo">↓</button></div></div>`).join('')
    list.querySelectorAll('[data-up]').forEach(btn => btn.onclick = () => { const i=draft.findIndex(x=>x.id===btn.dataset.up); if(i>0){[draft[i-1],draft[i]]=[draft[i],draft[i-1]];renderList()} })
    list.querySelectorAll('[data-down]').forEach(btn => btn.onclick = () => { const i=draft.findIndex(x=>x.id===btn.dataset.down); if(i<draft.length-1){[draft[i+1],draft[i]]=[draft[i],draft[i+1]];renderList()} })
    list.querySelectorAll('.vlcat-order-item').forEach(item => {
      item.ondragstart = e => { e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',item.dataset.id); item.classList.add('dragging') }
      item.ondragend = () => item.classList.remove('dragging')
      item.ondragover = e => e.preventDefault()
      item.ondrop = e => { e.preventDefault(); const from=draft.findIndex(x=>x.id===e.dataTransfer.getData('text/plain')); const to=draft.findIndex(x=>x.id===item.dataset.id); if(from<0||to<0||from===to)return; const [moved]=draft.splice(from,1);draft.splice(to,0,moved);renderList() }
    })
  }
  renderList()
  root.querySelector('#vlcat-order-close').onclick = closeOrderModal
  root.querySelector('#vlcat-order-cancel').onclick = closeOrderModal
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
      rerenderCategoriesModal()
    } catch (error) {
      errorBox.textContent = error?.message || 'Não foi possível salvar a nova ordem.'
      save.disabled = false
    }
  }
}

function enhanceModal() {
  const modal = document.querySelector('#vlcat-admin-root .vlcat-modal')
  if (!modal || modal.dataset.orderEnhanced === '1') return
  modal.dataset.orderEnhanced = '1'
  const head = modal.querySelector('.vlcat-list-head')
  if (head && !head.querySelector('.vlcat-order-trigger')) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'vlcat-order-trigger'
    button.textContent = '↕ Reordenar categorias'
    button.onclick = openOrdering
    head.appendChild(button)
  }
  setCreateOrder()
}

function boot() {
  if (state.initialized) return
  state.initialized = true
  const observer = new MutationObserver(() => enhanceModal())
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
}

boot()
