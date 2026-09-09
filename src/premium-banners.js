import { createClient } from '@supabase/supabase-js'
import './storage-media.css'
import './storage-media.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = url && key ? createClient(url, key) : null
const BUCKET = 'premium-banners'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const state = { ads: [], index: 0, modalOpen: false, initialized: false, publicBooted: false, rotationStarted: false }

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]))
const isoOrNull = (value) => value ? new Date(value).toISOString() : null
const getFileExtension = (file) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type] || 'bin')

async function getCurrentCityId() {
  if (!supabase) return null
  const parts = window.location.pathname.split('/').filter(Boolean)
  const slug = parts[0] && !['admin', 'planos'].includes(parts[0]) ? decodeURIComponent(parts[0]).toLowerCase() : (localStorage.getItem('vitrinelocal:selected-city') || 'laguna')
  const { data } = await supabase.from('cities').select('id').eq('slug', slug).eq('active', true).maybeSingle()
  return data?.id || null
}

async function uploadBannerImage(file) {
  if (!supabase) throw new Error('Supabase não está configurado.')
  if (!file) throw new Error('Selecione uma imagem.')
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Formato inválido. Use JPG, PNG ou WebP.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('A imagem deve ter no máximo 10 MB.')
  const path = `home/${crypto.randomUUID()}.${getFileExtension(file)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { path, url: data.publicUrl }
}

async function removeBannerImage(path) {
  if (!supabase || !path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('Não foi possível remover a arte do Storage:', error.message)
}

async function loadPublicBanners() {
  if (!supabase) return []
  const cityId = await getCurrentCityId()
  if (!cityId) return []
  const now = new Date().toISOString()
  const { data } = await supabase.from('advertisements').select('id,title,description,image_url,target_url,priority').eq('city_id', cityId).eq('placement', 'home_banner').eq('active', true).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(5)
  return data || []
}

function removeSlotWhenOffHome() {
  const slot = document.getElementById('vl-premium-banner-slot')
  const hero = document.querySelector('.hero')
  if (!hero && slot) slot.remove()
  document.body.classList.toggle('vl-has-premium-banner', Boolean(hero && state.ads.length))
}

function ensureSlot(hero) {
  let slot = document.getElementById('vl-premium-banner-slot')
  if (!hero) { slot?.remove(); return null }
  if (!slot) { slot = document.createElement('div'); slot.id = 'vl-premium-banner-slot' }
  if (slot.previousElementSibling !== hero) hero.insertAdjacentElement('afterend', slot)
  return slot
}

function renderPublicBanner() {
  const hero = document.querySelector('.hero')
  const slot = ensureSlot(hero)
  if (!hero || !slot) { removeSlotWhenOffHome(); return }
  slot.style.display = 'block'
  document.body.classList.toggle('vl-has-premium-banner', state.ads.length > 0)
  if (!state.ads.length) {
    slot.innerHTML = '<div class="vl-premium-placeholder"><span class="vl-premium-label">PUBLICIDADE PREMIUM</span><strong>Espaço reservado para uma oferta em destaque.</strong><span>Empresas com destaque Premium aparecem aqui.</span></div>'
    return
  }
  const ad = state.ads[state.index % state.ads.length]
  slot.innerHTML = `<a class="vl-premium-banner" href="${escapeHtml(ad.target_url || '#')}" ${ad.target_url ? 'target="_blank" rel="noreferrer"' : ''}><div class="vl-premium-media">${ad.image_url ? `<img src="${escapeHtml(ad.image_url)}" alt="${escapeHtml(ad.title)}">` : '<div class="vl-premium-fallback">V</div>'}</div><div class="vl-premium-copy"><span class="vl-premium-label">★ DESTAQUE PREMIUM · PATROCINADO</span><strong>${escapeHtml(ad.title)}</strong><span>${escapeHtml(ad.description || 'Conheça esta oferta em destaque.')}</span><b>Conhecer oferta →</b></div></a>${state.ads.length > 1 ? `<div class="vl-premium-dots">${state.ads.map((_, i) => `<button type="button" aria-label="Banner ${i + 1}" data-index="${i}" class="${i === state.index ? 'active' : ''}"></button>`).join('')}</div>` : ''}`
  slot.querySelectorAll('.vl-premium-dots button').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); state.index = Number(button.dataset.index); renderPublicBanner() }))
}

async function refreshPublicBanners() {
  state.ads = await loadPublicBanners()
  state.index = Math.min(state.index, Math.max(state.ads.length - 1, 0))
  renderPublicBanner()
}

function closeAdminModal(modal) { modal?.remove(); state.modalOpen = false }

async function openAdminModal() {
  if (!supabase || state.modalOpen) return
  state.modalOpen = true
  try {
    const [{ data: userData }, { data: cities }, { data: businesses }, { data: ads }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('cities').select('id,name,state').eq('active', true).order('name'),
      supabase.from('businesses').select('id,name').eq('status', 'active').order('name').limit(200),
      supabase.from('advertisements').select('id,title,image_url,image_path,active,priority,starts_at,ends_at,cities(name,state),businesses(name)').eq('placement', 'home_banner').order('created_at', { ascending: false }).limit(100),
    ])
    if (!userData.user) { state.modalOpen = false; return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') { state.modalOpen = false; return }
    const modal = document.createElement('div')
    modal.id = 'vl-premium-admin-modal'
    modal.innerHTML = `<div class="vl-admin-backdrop"><div class="vl-admin-modal"><button class="vl-admin-close" type="button" aria-label="Fechar">×</button><div class="vl-admin-kicker">Monetização</div><h2>Banners Premium da Home</h2><p class="vl-admin-intro">Somente o administrador cadastra e publica. O espaço é reservado para empresas que contrataram o destaque Premium.</p><form id="vl-banner-form" class="vl-admin-form"><div class="vl-admin-grid"><label>Empresa<select name="business_id" required><option value="">Selecione</option>${(businesses || []).map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}</select></label><label>Cidade<select name="city_id" required>${(cities || []).map((c) => `<option value="${c.id}">${escapeHtml(c.name)} - ${escapeHtml(c.state)}</option>`).join('')}</select></label><label>Título do banner<input name="title" maxlength="90" required placeholder="Ex.: 20% OFF nesta semana"></label><label>Prioridade<input name="priority" type="number" min="0" max="999" value="0"></label><label class="full">Descrição curta<input name="description" maxlength="160" placeholder="Texto que aparece no banner"></label><label class="full">Arte do banner<div class="vl-upload-row"><input id="vl-banner-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required><span class="vl-upload-hint">JPG, PNG ou WebP · até 10 MB</span></div><div id="vl-banner-preview" class="vl-image-preview" aria-live="polite"><span>Nenhuma imagem selecionada</span></div></label><label class="full">Link ao clicar<input name="target_url" type="url" placeholder="https://..."></label><label>Início<input name="starts_at" type="datetime-local"></label><label>Fim<input name="ends_at" type="datetime-local"></label></div><div class="vl-admin-note">Ao enviar, a imagem sobe para o Storage. O banner fica em revisão; publicar fica a cargo do administrador.</div><div id="vl-banner-form-status" class="vl-form-status" role="status"></div><button id="vl-banner-submit" class="primary-btn full" type="submit">Enviar banner para revisão</button></form><div class="vl-admin-list"><div class="vl-admin-list-head"><strong>Banners cadastrados</strong><span>${(ads || []).length}</span></div>${(ads || []).length ? ads.map((ad) => `<div class="vl-admin-banner-row" data-id="${ad.id}"><div class="vl-admin-thumb">${ad.image_url ? `<img src="${escapeHtml(ad.image_url)}" alt="">` : 'V'}</div><div class="vl-admin-banner-info"><strong>${escapeHtml(ad.title)}</strong><small>${escapeHtml(ad.businesses?.name || 'Empresa')} · ${escapeHtml(ad.cities?.name || 'Cidade')}</small></div><div class="vl-admin-banner-actions"><span class="admin-badge ${ad.active ? 'good' : 'pending'}">${ad.active ? 'Publicado' : 'Em revisão'}</span><button type="button" class="table-actions-btn" data-action="toggle">${ad.active ? 'Pausar' : 'Publicar'}</button><button type="button" class="table-actions-btn danger" data-action="delete">Excluir</button></div></div>`).join('') : '<div class="vl-admin-empty">Nenhum banner cadastrado.</div>'}</div></div></div>`
    document.body.appendChild(modal)
    modal.querySelector('.vl-admin-close').addEventListener('click', () => closeAdminModal(modal))
    modal.querySelector('.vl-admin-backdrop').addEventListener('click', (event) => { if (event.target.classList.contains('vl-admin-backdrop')) closeAdminModal(modal) })
    const imageInput = modal.querySelector('#vl-banner-image'), preview = modal.querySelector('#vl-banner-preview'), status = modal.querySelector('#vl-banner-form-status'), submit = modal.querySelector('#vl-banner-submit')
    imageInput.addEventListener('change', () => {
      const file = imageInput.files?.[0]
      if (!file) { preview.innerHTML = '<span>Nenhuma imagem selecionada</span>'; return }
      if (!ALLOWED_TYPES.has(file.type)) { preview.innerHTML = '<span>Formato inválido</span>'; status.textContent = 'Use JPG, PNG ou WebP.'; return }
      if (file.size > MAX_IMAGE_BYTES) { preview.innerHTML = '<span>Arquivo acima de 10 MB</span>'; status.textContent = 'A imagem precisa ter no máximo 10 MB.'; return }
      status.textContent = ''
      preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Prévia da arte selecionada"><div class="vl-image-preview-meta"><strong>${escapeHtml(file.name)}</strong><span>${(file.size / 1024 / 1024).toFixed(2)} MB</span></div>`
    })
    modal.querySelector('#vl-banner-form').addEventListener('submit', async (event) => {
      event.preventDefault(); submit.disabled = true; submit.textContent = 'Enviando…'; status.textContent = ''
      let uploadedPath = null
      try {
        const form = new FormData(event.currentTarget), uploaded = await uploadBannerImage(form.get('image'))
        uploadedPath = uploaded.path
        const payload = { business_id: form.get('business_id'), city_id: form.get('city_id'), title: form.get('title'), description: form.get('description') || null, image_url: uploaded.url, image_path: uploaded.path, target_url: form.get('target_url') || null, starts_at: isoOrNull(form.get('starts_at')), ends_at: isoOrNull(form.get('ends_at')), placement: 'home_banner', priority: Number(form.get('priority') || 0), active: false }
        const { error } = await supabase.from('advertisements').insert(payload)
        if (error) throw error
        window.alert('Banner cadastrado. A arte foi enviada ao Storage e o banner ficou em revisão.')
        closeAdminModal(modal); setTimeout(openAdminModal, 0)
      } catch (error) {
        if (uploadedPath) await removeBannerImage(uploadedPath)
        const message = error?.message || 'Não foi possível cadastrar o banner.'
        status.textContent = message; window.alert(`Erro ao cadastrar banner: ${message}`)
      } finally { if (document.body.contains(modal)) { submit.disabled = false; submit.textContent = 'Enviar banner para revisão' } }
    })
    modal.querySelectorAll('[data-action="toggle"]').forEach((button) => button.addEventListener('click', async () => {
      const id = button.closest('[data-id]')?.dataset.id, row = (ads || []).find((ad) => String(ad.id) === String(id))
      if (!row) return
      const { error } = await supabase.from('advertisements').update({ active: !row.active }).eq('id', id)
      if (error) return window.alert(`Erro: ${error.message}`)
      await refreshPublicBanners(); closeAdminModal(modal); setTimeout(openAdminModal, 0)
    }))
    modal.querySelectorAll('[data-action="delete"]').forEach((button) => button.addEventListener('click', async () => {
      const id = button.closest('[data-id]')?.dataset.id
      if (!id || !window.confirm('Excluir este banner?')) return
      const row = (ads || []).find((ad) => String(ad.id) === String(id))
      const { error } = await supabase.from('advertisements').delete().eq('id', id)
      if (error) return window.alert(`Erro: ${error.message}`)
      if (row?.image_path) await removeBannerImage(row.image_path)
      await refreshPublicBanners(); closeAdminModal(modal); setTimeout(openAdminModal, 0)
    }))
  } catch (error) {
    state.modalOpen = false
    console.warn('VitrineLocal: não foi possível abrir banners premium.', error)
  }
}

function ensureAdminButton() {
  const nav = document.querySelector('.admin-nav')
  if (!nav || nav.querySelector('[data-vl-premium-admin]')) return
  const button = document.createElement('button'); button.type = 'button'; button.className = 'admin-nav-item'; button.dataset.vlPremiumAdmin = 'true'; button.innerHTML = '<span>▰</span>Banners Premium'; button.addEventListener('click', openAdminModal); nav.appendChild(button)
}

async function boot() {
  if (state.initialized) return
  state.initialized = true
  const observer = new MutationObserver(async () => {
    ensureAdminButton()
    const hero = document.querySelector('.hero')
    if (hero && !state.publicBooted) {
      state.publicBooted = true; await refreshPublicBanners()
      if (state.ads.length > 1 && !state.rotationStarted) { state.rotationStarted = true; window.setInterval(() => { if (!document.querySelector('.hero')) { removeSlotWhenOffHome(); return } state.index = (state.index + 1) % state.ads.length; renderPublicBanner() }, 6000) }
    }
    if (!hero) state.publicBooted = false
    removeSlotWhenOffHome()
  })
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  ensureAdminButton()
}

boot()
