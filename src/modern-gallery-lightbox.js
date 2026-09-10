import { createClient } from '@supabase/supabase-js'

const U = import.meta.env.VITE_SUPABASE_URL
const K = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = U && K ? createClient(U, K) : null
let state = { open: false, items: [], index: 0 }

function close() {
  const root = document.getElementById('vl-photo-lightbox')
  if (root) root.remove()
  document.body.style.overflow = ''
  state.open = false
}

function render() {
  let root = document.getElementById('vl-photo-lightbox')
  if (!root) {
    root = document.createElement('div')
    root.id = 'vl-photo-lightbox'
    root.className = 'vl-photo-lightbox'
    document.body.appendChild(root)
  }
  const item = state.items[state.index]
  if (!item) return
  const isVideo = item.media_type === 'video'
  root.innerHTML = `
    <div class="vl-photo-lightbox-backdrop" data-close="1">
      <div class="vl-photo-lightbox-panel" role="dialog" aria-modal="true" aria-label="Galeria de fotos">
        <div class="vl-photo-lightbox-head">
          <div><strong>${state.index + 1} de ${state.items.length}</strong><span>Galeria da empresa</span></div>
          <button class="vl-photo-close" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="vl-photo-lightbox-view">
          <button class="vl-photo-arrow vl-photo-prev" type="button" aria-label="Imagem anterior">‹</button>
          ${isVideo ? `<video src="${item.url}" controls playsinline></video>` : `<img src="${item.url}" alt="${item.alt_text || ''}"/>`}
          <button class="vl-photo-arrow vl-photo-next" type="button" aria-label="Próxima imagem">›</button>
        </div>
        <div class="vl-photo-lightbox-thumbs">
          ${state.items.map((x, i) => `<button type="button" class="vl-photo-thumb ${i === state.index ? 'active' : ''}" data-index="${i}" aria-label="Abrir mídia ${i + 1}">${x.media_type === 'video' ? '▶' : `<img src="${x.url}" alt=""/>`}</button>`).join('')}
        </div>
      </div>
    </div>`
  root.querySelector('.vl-photo-close')?.addEventListener('click', close)
  root.querySelector('.vl-photo-lightbox-backdrop')?.addEventListener('click', e => { if (e.target.dataset.close) close() })
  root.querySelector('.vl-photo-prev')?.addEventListener('click', () => { state.index = (state.index - 1 + state.items.length) % state.items.length; render() })
  root.querySelector('.vl-photo-next')?.addEventListener('click', () => { state.index = (state.index + 1) % state.items.length; render() })
  root.querySelectorAll('.vl-photo-thumb').forEach(btn => btn.addEventListener('click', () => { state.index = Number(btn.dataset.index); render() }))
}

async function loadItems() {
  const parts = location.pathname.split('/').filter(Boolean)
  const citySlug = parts[0]
  const businessSlug = parts[2]
  if (!db || !citySlug || !businessSlug) return []
  const { data: city } = await db.from('cities').select('id').eq('slug', citySlug).maybeSingle()
  if (!city) return []
  const { data: business } = await db.from('businesses').select('id,cover_url').eq('city_id', city.id).eq('slug', businessSlug).eq('status', 'active').maybeSingle()
  if (!business) return []
  const { data: photos } = await db.from('business_photos').select('id,url,media_type,alt_text,sort_order').eq('business_id', business.id).order('sort_order')
  const items = []
  if (business.cover_url) items.push({ id: 'cover', url: business.cover_url, media_type: 'image', alt_text: 'Capa da empresa' })
  ;(photos || []).forEach(p => items.push(p))
  return items.filter(x => x.url)
}

async function open(index = 0) {
  if (state.open) return
  state.items = await loadItems()
  if (!state.items.length) {
    state.items = [...document.querySelectorAll('.mbp-gallery img')].map((img, i) => ({ id: `fallback-${i}`, url: img.currentSrc || img.src, media_type: 'image', alt_text: img.alt || '' })).filter(x => x.url)
  }
  if (!state.items.length) return
  state.index = Math.min(Math.max(index, 0), state.items.length - 1)
  state.open = true
  document.body.style.overflow = 'hidden'
  render()
}

document.addEventListener('click', e => {
  const more = e.target.closest('.mbp-gallery-more')
  if (more) { e.preventDefault(); open(0); return }
  const thumb = e.target.closest('.mbp-gallery-thumb')
  if (thumb) {
    open(0).then(() => {
      const src = thumb.querySelector('img')?.currentSrc || thumb.querySelector('img')?.src
      const found = state.items.findIndex(x => x.url === src)
      if (found >= 0) { state.index = found; render() }
    })
    return
  }
  if (e.target.closest('.mbp-gallery-main img')) open(0)
})

document.addEventListener('keydown', e => {
  if (!state.open) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowLeft') { state.index = (state.index - 1 + state.items.length) % state.items.length; render() }
  if (e.key === 'ArrowRight') { state.index = (state.index + 1) % state.items.length; render() }
})
