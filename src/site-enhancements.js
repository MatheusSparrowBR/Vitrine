import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

const BUSINESS_BUCKET = 'business-media'
const COMMUNITY_BUCKET = 'community-submissions'
const BUSINESS_MAX = 50 * 1024 * 1024
const COMMUNITY_MAX = 100 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const state = {
  initialized: false,
  pricingBooted: false,
  ownerPanelBooted: false,
  communityBooted: false,
  profileBooted: false,
}

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))

const extensionFor = (file) => {
  const map = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  }
  return map[file.type] || 'bin'
}

const bytesLabel = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`
}

function notify(message, error = false) {
  const text = error ? `Erro: ${message}` : message
  let toast = document.getElementById('vl-enhancement-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'vl-enhancement-toast'
    toast.className = 'vl-enhancement-toast'
    document.body.appendChild(toast)
  }
  toast.textContent = text
  toast.classList.toggle('error', error)
  toast.classList.add('show')
  window.clearTimeout(toast._timer)
  toast._timer = window.setTimeout(() => toast.classList.remove('show'), 3800)
}

async function currentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

function companySignupClick() {
  const button = [...document.querySelectorAll('button')].find((item) => (item.textContent || '').trim() === 'Cadastrar empresa')
  if (button) button.click()
  else notify('Faça login para cadastrar sua empresa.')
}

async function getLaguna() {
  if (!supabase) return null
  const { data } = await supabase.from('cities').select('id,name,state,slug').eq('slug', 'laguna').maybeSingle()
  return data || null
}

async function uploadFile(bucket, path, file, maxBytes, allowedTypes) {
  if (!supabase) throw new Error('Supabase não está configurado.')
  if (!file) throw new Error('Selecione um arquivo.')
  if (!allowedTypes.has(file.type)) throw new Error('Formato de arquivo não permitido.')
  if (file.size > maxBytes) throw new Error(`Arquivo acima do limite de ${bytesLabel(maxBytes)}.`)
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function removeFile(bucket, path) {
  if (!supabase || !path) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.warn(`Não foi possível remover ${path}:`, error.message)
}

function injectStyles() {
  if (document.getElementById('vl-enhancement-styles')) return
  const style = document.createElement('style')
  style.id = 'vl-enhancement-styles'
  style.textContent = `
    .vl-pricing-section{padding:74px 0;background:linear-gradient(180deg,#f7f9fc 0%,#eef5ff 100%);border-top:1px solid #e7edf4;border-bottom:1px solid #e7edf4}.vl-pricing-head{max-width:720px;margin:0 auto 30px;text-align:center}.vl-pricing-head h2{font:800 36px/1.05 Manrope;margin:8px 0 12px;letter-spacing:-1.4px;color:#122033}.vl-pricing-head p{margin:0;color:#6e7b8d;font-size:14px;line-height:1.65}.vl-pricing-grid{width:min(1180px,calc(100% - 40px));margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}.vl-plan-card{position:relative;background:#fff;border:1px solid #e1e8f0;border-radius:20px;padding:25px;box-shadow:0 10px 30px rgba(18,32,51,.05);display:flex;flex-direction:column}.vl-plan-card.highlight{border-color:#2474ff;box-shadow:0 20px 50px rgba(36,116,255,.13);transform:translateY(-5px)}.vl-plan-badge{position:absolute;right:18px;top:17px;background:#2474ff;color:#fff;padding:5px 9px;border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.9px}.vl-plan-kicker{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#2474ff}.vl-plan-card h3{font:800 24px Manrope;margin:8px 0;color:#122033}.vl-plan-price{display:flex;align-items:flex-end;gap:5px;margin:4px 0 7px}.vl-plan-price strong{font:800 36px Manrope;letter-spacing:-1.3px}.vl-plan-price span{font-size:12px;color:#7b8797;padding-bottom:6px}.vl-plan-description{font-size:12px;line-height:1.55;color:#6e7b8d;min-height:40px}.vl-plan-features{list-style:none;padding:0;margin:20px 0;display:grid;gap:9px}.vl-plan-features li{font-size:12px;line-height:1.45;color:#42536a;padding-left:18px;position:relative}.vl-plan-features li:before{content:'✓';position:absolute;left:0;top:0;color:#24895a;font-weight:800}.vl-plan-cta{margin-top:auto;width:100%;border:1px solid #d2dbe7;background:#fff;color:#24354c;border-radius:11px;padding:11px 14px;font:700 13px 'DM Sans';cursor:pointer}.vl-plan-card.highlight .vl-plan-cta{background:linear-gradient(135deg,#2474ff,#1d62ef);border-color:transparent;color:#fff}.vl-pricing-note{width:min(1180px,calc(100% - 40px));margin:20px auto 0;text-align:center;font-size:11px;color:#7b8797}.vl-pricing-note strong{color:#42536a}
    .vl-media-panel{margin-top:20px;background:#fff;border:1px solid #e0e7ef;border-radius:18px;padding:22px;box-shadow:0 6px 20px rgba(18,32,51,.04)}.vl-media-head{display:flex;align-items:flex-end;justify-content:space-between;gap:15px;margin-bottom:15px}.vl-media-head h2{font:800 22px Manrope;letter-spacing:-.7px;margin:5px 0}.vl-media-head p{margin:0;color:#728097;font-size:12px}.vl-media-select{border:1px solid #d7e0eb;background:#fff;border-radius:10px;padding:10px 12px;font:600 12px 'DM Sans';min-width:230px;color:#263750}.vl-media-toolbar{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:12px}.vl-media-box{border:1px dashed #cbd7e4;border-radius:13px;padding:13px;background:#fbfcfe}.vl-media-box strong{display:block;font-size:12px;color:#304257;margin-bottom:5px}.vl-media-box small{display:block;color:#7a8798;font-size:10px;line-height:1.45;margin-bottom:10px}.vl-media-file{width:100%;font-size:11px;color:#4e6076}.vl-media-action{width:100%;border:1px solid #d3dce8;background:#fff;color:#304257;border-radius:9px;padding:9px 10px;font:700 11px 'DM Sans';cursor:pointer;margin-top:8px}.vl-media-action.primary{background:#2474ff;border-color:#2474ff;color:#fff}.vl-media-action:disabled{opacity:.55;cursor:not-allowed}.vl-media-preview-row{display:flex;gap:10px;align-items:center;margin-top:9px}.vl-media-current{width:76px;height:50px;border-radius:9px;overflow:hidden;background:#edf3fa;display:grid;place-items:center;font:800 18px Manrope;color:#8ca0b8}.vl-media-current img{width:100%;height:100%;object-fit:cover}.vl-media-gallery-head{display:flex;justify-content:space-between;align-items:center;margin:22px 0 10px}.vl-media-gallery-head strong{font:800 15px Manrope}.vl-media-gallery-head span{font-size:10px;color:#78869a}.vl-media-gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}.vl-media-item{position:relative;border:1px solid #e1e7ef;border-radius:12px;overflow:hidden;background:#fff}.vl-media-item-media{height:130px;background:#eff4f9}.vl-media-item-media img,.vl-media-item-media video{width:100%;height:100%;object-fit:cover;display:block}.vl-media-item-body{padding:8px}.vl-media-item-body small{display:block;color:#7d8998;font-size:9px;margin-bottom:6px}.vl-media-delete{border:1px solid #e0d0d0;background:#fff6f6;color:#ad2e2e;border-radius:7px;padding:6px 8px;font:700 10px 'DM Sans';cursor:pointer}.vl-media-empty{border:1px dashed #cad5e2;border-radius:12px;padding:25px;text-align:center;color:#7a8797;font-size:11px;grid-column:1/-1}.vl-media-status{min-height:18px;margin-top:10px;color:#6f7d90;font-size:11px}.vl-media-status.error{color:#b02d2d}.vl-community-filebox{border:1px dashed #cbd7e4;border-radius:12px;background:#fbfcfe;padding:12px;display:grid;gap:8px;margin-bottom:10px}.vl-community-filebox strong{font-size:11px;color:#42536a}.vl-community-filebox small{font-size:10px;color:#7d8998}.vl-community-filebox input{font-size:11px}.vl-community-selected{font-size:10px;color:#2474ff}.vl-community-upload-status{font-size:10px;color:#728097;min-height:15px}.vl-profile-logo-wrap{display:flex;align-items:center;gap:14px;margin-bottom:12px}.vl-profile-logo{width:64px;height:64px;border-radius:16px;overflow:hidden;border:1px solid #dce5ee;background:#eef4fa;display:grid;place-items:center;font:800 24px Manrope;color:#91a4bb}.vl-profile-logo img{width:100%;height:100%;object-fit:cover}.vl-enhancement-toast{position:fixed;right:22px;bottom:22px;z-index:10050;opacity:0;transform:translateY(10px);transition:.18s ease;background:#0f233d;color:#fff;padding:12px 15px;border-radius:11px;box-shadow:0 15px 35px rgba(0,0,0,.22);font-size:12px;pointer-events:none}.vl-enhancement-toast.show{opacity:1;transform:translateY(0)}.vl-enhancement-toast.error{background:#8f2424}
    @media(max-width:980px){.vl-pricing-grid{grid-template-columns:1fr}.vl-plan-card.highlight{transform:none}.vl-media-toolbar{grid-template-columns:1fr 1fr}.vl-media-gallery{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:620px){.vl-pricing-grid,.vl-pricing-note{width:calc(100% - 24px)}.vl-pricing-section{padding:52px 0}.vl-pricing-head h2{font-size:30px}.vl-media-head{align-items:flex-start;flex-direction:column}.vl-media-select{width:100%;min-width:0}.vl-media-toolbar{grid-template-columns:1fr}.vl-media-gallery{grid-template-columns:1fr 1fr}.vl-media-item-media{height:110px}.vl-enhancement-toast{left:12px;right:12px;bottom:12px}}
  `
  document.head.appendChild(style)
}

async function loadPlans() {
  if (!supabase) return [
    { code: 'free', name: 'Grátis', price_monthly: 0, features: { photos: 5, ai_posts: 3, business_profile: true, featured: false } },
    { code: 'pro', name: 'Pro', price_monthly: 29.9, features: { photos: 30, ai_posts: 30, business_profile: true, featured: true, analytics: true } },
    { code: 'premium', name: 'Premium', price_monthly: 59.9, features: { photos: 100, ai_posts: 100, business_profile: true, featured: true, city_instagram: true, advanced_analytics: true } },
  ]
  const { data, error } = await supabase.from('plans').select('code,name,price_monthly,features').eq('active', true).order('price_monthly')
  if (error || !data?.length) return []
  return data
}

function featureLabels(plan) {
  const f = plan.features || {}
  const labels = []
  if (f.business_profile) labels.push('Página completa da empresa')
  if (Number(f.photos) > 0) labels.push(`${f.photos} fotos na galeria`)
  if (Number(f.ai_posts) > 0) labels.push(`${f.ai_posts} conteúdos com IA por mês`)
  if (f.featured) labels.push('Destaque no catálogo')
  if (f.analytics) labels.push('Analytics da empresa')
  if (f.city_instagram) labels.push('Divulgação no Instagram da cidade')
  if (f.advanced_analytics) labels.push('Analytics avançado')
  return labels
}

async function mountPricing() {
  const categoryGrid = document.querySelector('.category-grid')
  if (!categoryGrid || document.getElementById('vl-pricing-section')) return
  const categorySection = categoryGrid.closest('section')
  if (!categorySection) return
  const plans = await loadPlans()
  if (!plans.length) return
  const section = document.createElement('section')
  section.id = 'vl-pricing-section'
  section.className = 'vl-pricing-section'
  section.innerHTML = `
    <div class="vl-pricing-head">
      <span class="section-kicker">Para empresas</span>
      <h2>Escolha o plano ideal para destacar seu negócio</h2>
      <p>Comece gratuitamente e evolua conforme sua empresa ganha presença, conteúdo e audiência na cidade.</p>
    </div>
    <div class="vl-pricing-grid">
      ${plans.map((plan) => {
        const isPremium = plan.code === 'premium'
        const isPro = plan.code === 'pro'
        const price = Number(plan.price_monthly) || 0
        const features = featureLabels(plan)
        return `<article class="vl-plan-card ${isPremium ? 'highlight' : ''}">
          ${isPremium ? '<span class="vl-plan-badge">Mais completo</span>' : ''}
          <span class="vl-plan-kicker">${isPro ? 'Mais escolhido' : isPremium ? 'Máxima exposição' : 'Comece agora'}</span>
          <h3>${escapeHtml(plan.name)}</h3>
          <div class="vl-plan-price"><strong>R$ ${price.toFixed(2).replace('.', ',')}</strong><span>/mês</span></div>
          <p class="vl-plan-description">${isPremium ? 'Para empresas que querem acelerar presença local e divulgação.' : isPro ? 'Para negócios que já querem aparecer mais e acompanhar resultados.' : 'Para colocar sua empresa na VitrineLocal sem custo mensal.'}</p>
          <ul class="vl-plan-features">${features.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          <button type="button" class="vl-plan-cta" data-plan-code="${escapeHtml(plan.code)}">${isPremium ? 'Quero o Premium' : isPro ? 'Quero o Pro' : 'Começar grátis'}</button>
        </article>`
      }).join('')}
    </div>
    <div class="vl-pricing-note"><strong>Importante:</strong> banners publicitários Premium da Home são um produto de mídia separado e ficam sob aprovação e gestão do administrador.</div>
  `
  categorySection.insertAdjacentElement('afterend', section)
  section.querySelectorAll('.vl-plan-cta').forEach((button) => {
    button.addEventListener('click', () => {
      const code = button.dataset.planCode
      companySignupClick()
      if (code && code !== 'free') window.setTimeout(() => notify(`Cadastro iniciado. O plano ${code === 'pro' ? 'Pro' : 'Premium'} será ativado conforme o fluxo comercial.`), 150)
    })
  })
}

async function ownerBusinesses() {
  const user = await currentUser()
  if (!user) return []
  const { data } = await supabase.from('businesses').select('id,name,slug,logo_url,logo_path,cover_url,cover_path,status').eq('owner_id', user.id).order('created_at', { ascending: false })
  return data || []
}

async function loadBusinessPhotos(businessId) {
  const { data } = await supabase.from('business_photos').select('id,url,alt_text,sort_order,storage_path,media_type,created_at').eq('business_id', businessId).order('sort_order').order('created_at')
  return data || []
}

function mediaElement(item, alt = '') {
  const mediaType = item.media_type || (/(mp4|webm|mov)(\?|$)/i.test(item.url || '') ? 'video' : 'image')
  if (mediaType === 'video') return `<video src="${escapeHtml(item.url)}" controls playsinline preload="metadata"></video>`
  return `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(alt || item.alt_text || '')}">`
}

async function mountOwnerMedia() {
  const ownerList = document.querySelector('.owner-business-list')
  if (!ownerList || document.getElementById('vl-media-panel')) return
  const businesses = await ownerBusinesses()
  if (!businesses.length) return

  const panel = document.createElement('section')
  panel.id = 'vl-media-panel'
  panel.className = 'vl-media-panel'
  panel.innerHTML = `
    <div class="vl-media-head"><div><span class="section-kicker">Mídia da empresa</span><h2>Logo, capa e galeria</h2><p>Envie fotos e vídeos diretamente para a sua página pública.</p></div><select class="vl-media-select" id="vl-media-business-select">${businesses.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}</select></div>
    <div class="vl-media-toolbar">
      <div class="vl-media-box"><strong>Logo</strong><small>Imagem quadrada recomendada. Até 50 MB.</small><input class="vl-media-file" id="vl-logo-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><div class="vl-media-preview-row" id="vl-logo-current"></div><button type="button" class="vl-media-action primary" id="vl-logo-btn">Atualizar logo</button></div>
      <div class="vl-media-box"><strong>Capa</strong><small>Banner da empresa. Imagem ou GIF. Até 50 MB.</small><input class="vl-media-file" id="vl-cover-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><div class="vl-media-preview-row" id="vl-cover-current"></div><button type="button" class="vl-media-action primary" id="vl-cover-btn">Atualizar capa</button></div>
      <div class="vl-media-box"><strong>Galeria</strong><small>Envie várias fotos e vídeos de uma vez. Até 50 MB por arquivo.</small><input class="vl-media-file" id="vl-gallery-files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"><button type="button" class="vl-media-action primary" id="vl-gallery-btn">Enviar mídia para a galeria</button><div class="vl-media-status" id="vl-gallery-status"></div></div>
    </div>
    <div class="vl-media-gallery-head"><strong>Galeria atual</strong><span id="vl-media-count">0 itens</span></div>
    <div class="vl-media-gallery" id="vl-media-gallery"></div>
  `
  ownerList.insertAdjacentElement('afterend', panel)

  const select = panel.querySelector('#vl-media-business-select')
  const logoFile = panel.querySelector('#vl-logo-file')
  const coverFile = panel.querySelector('#vl-cover-file')
  const galleryFiles = panel.querySelector('#vl-gallery-files')
  const galleryStatus = panel.querySelector('#vl-gallery-status')
  let selectedBusiness = businesses[0]

  function showCurrent() {
    const logo = panel.querySelector('#vl-logo-current')
    const cover = panel.querySelector('#vl-cover-current')
    logo.innerHTML = selectedBusiness.logo_url ? `<div class="vl-media-current"><img src="${escapeHtml(selectedBusiness.logo_url)}" alt="Logo atual"></div><span style="font-size:10px;color:#76859a">Logo atual</span>` : '<span style="font-size:10px;color:#8996a7">Sem logo</span>'
    cover.innerHTML = selectedBusiness.cover_url ? `<div class="vl-media-current"><img src="${escapeHtml(selectedBusiness.cover_url)}" alt="Capa atual"></div><span style="font-size:10px;color:#76859a">Capa atual</span>` : '<span style="font-size:10px;color:#8996a7">Sem capa</span>'
  }

  async function refreshGallery() {
    const items = await loadBusinessPhotos(selectedBusiness.id)
    panel.querySelector('#vl-media-count').textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'}`
    const gallery = panel.querySelector('#vl-media-gallery')
    gallery.innerHTML = items.length ? items.map((item) => `<article class="vl-media-item" data-id="${item.id}"><div class="vl-media-item-media">${mediaElement(item, selectedBusiness.name)}</div><div class="vl-media-item-body"><small>${item.media_type === 'video' ? 'Vídeo' : 'Imagem'} · ${escapeHtml(bytesLabel(0))}</small><button type="button" class="vl-media-delete" data-delete-media="${item.id}">Excluir</button></div></article>`).join('') : '<div class="vl-media-empty">Sua galeria ainda está vazia. Envie a primeira foto ou vídeo.</div>'
    gallery.querySelectorAll('[data-delete-media]').forEach((button) => button.addEventListener('click', async () => {
      const id = button.dataset.deleteMedia
      const item = items.find((entry) => entry.id === id)
      if (!item || !window.confirm('Excluir esta mídia da galeria?')) return
      button.disabled = true
      const { error } = await supabase.from('business_photos').delete().eq('id', id)
      if (error) { notify(error.message, true); button.disabled = false; return }
      await removeFile(BUSINESS_BUCKET, item.storage_path)
      notify('Mídia removida.')
      refreshGallery()
    }))
  }

  async function updateIdentity(kind, file) {
    if (!file) return notify('Selecione uma imagem.', true)
    if (!IMAGE_TYPES.has(file.type) || file.size > BUSINESS_MAX) return notify('Use JPG, PNG, WebP ou GIF de até 50 MB.', true)
    const path = `business/${selectedBusiness.id}/${kind}-${crypto.randomUUID()}.${extensionFor(file)}`
    const url = await uploadFile(BUSINESS_BUCKET, path, file, BUSINESS_MAX, IMAGE_TYPES)
    const patch = kind === 'logo' ? { logo_url: url, logo_path: path } : { cover_url: url, cover_path: path }
    const { error } = await supabase.from('businesses').update(patch).eq('id', selectedBusiness.id)
    if (error) { await removeFile(BUSINESS_BUCKET, path); throw error }
    const oldPath = kind === 'logo' ? selectedBusiness.logo_path : selectedBusiness.cover_path
    await removeFile(BUSINESS_BUCKET, oldPath)
    selectedBusiness = { ...selectedBusiness, ...patch }
    showCurrent()
    notify(`${kind === 'logo' ? 'Logo' : 'Capa'} atualizada.`)
  }

  select.addEventListener('change', () => {
    selectedBusiness = businesses.find((b) => b.id === select.value) || businesses[0]
    showCurrent()
    refreshGallery()
  })
  panel.querySelector('#vl-logo-btn').addEventListener('click', async () => {
    const button = panel.querySelector('#vl-logo-btn')
    button.disabled = true
    try { await updateIdentity('logo', logoFile.files?.[0]) } catch (error) { notify(error.message, true) } finally { button.disabled = false; logoFile.value = '' }
  })
  panel.querySelector('#vl-cover-btn').addEventListener('click', async () => {
    const button = panel.querySelector('#vl-cover-btn')
    button.disabled = true
    try { await updateIdentity('cover', coverFile.files?.[0]) } catch (error) { notify(error.message, true) } finally { button.disabled = false; coverFile.value = '' }
  })
  panel.querySelector('#vl-gallery-btn').addEventListener('click', async () => {
    const button = panel.querySelector('#vl-gallery-btn')
    const files = [...(galleryFiles.files || [])]
    if (!files.length) return notify('Selecione uma ou mais fotos/vídeos.', true)
    button.disabled = true
    galleryStatus.classList.remove('error')
    try {
      let completed = 0
      const startOrder = (await loadBusinessPhotos(selectedBusiness.id)).length
      for (const file of files) {
        const isImage = IMAGE_TYPES.has(file.type)
        const isVideo = VIDEO_TYPES.has(file.type)
        if ((!isImage && !isVideo) || file.size > BUSINESS_MAX) throw new Error(`Arquivo inválido: ${file.name}. Use imagem/vídeo de até 50 MB.`)
        const path = `business/${selectedBusiness.id}/${crypto.randomUUID()}.${extensionFor(file)}`
        const url = await uploadFile(BUSINESS_BUCKET, path, file, BUSINESS_MAX, new Set([...IMAGE_TYPES, ...VIDEO_TYPES]))
        const { error } = await supabase.from('business_photos').insert({ business_id: selectedBusiness.id, url, storage_path: path, media_type: isVideo ? 'video' : 'image', sort_order: startOrder + completed, alt_text: selectedBusiness.name })
        if (error) { await removeFile(BUSINESS_BUCKET, path); throw error }
        completed += 1
        galleryStatus.textContent = `${completed}/${files.length} enviados…`
      }
      galleryStatus.textContent = `${completed} arquivo(s) adicionado(s) à galeria.`
      galleryFiles.value = ''
      notify('Galeria atualizada.')
      refreshGallery()
    } catch (error) {
      galleryStatus.classList.add('error')
      galleryStatus.textContent = error.message
      notify(error.message, true)
    } finally { button.disabled = false }
  })

  showCurrent()
  refreshGallery()
}

function augmentCommunityModal() {
  const modal = [...document.querySelectorAll('.modal')].find((item) => (item.querySelector('.modal-kicker')?.textContent || '').includes('Comunidade'))
  if (!modal || modal.dataset.vlCommunityEnhanced) return
  const form = modal.querySelector('form')
  const urlInputs = [...form.querySelectorAll('input')].filter((input) => (input.placeholder || '').toLowerCase().includes('url'))
  if (urlInputs.length < 2) return
  const imageUrl = urlInputs[0]
  const videoUrl = urlInputs[1]
  const box = document.createElement('div')
  box.className = 'vl-community-filebox'
  box.innerHTML = `<strong>📷🎥 Enviar arquivo diretamente</strong><small>Foto: até 100 MB · Vídeo: até 100 MB. O conteúdo fica privado até a moderação.</small><input id="vl-community-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><input id="vl-community-video-file" type="file" accept="video/mp4,video/webm,video/quicktime"><div class="vl-community-selected" id="vl-community-selected"></div><div class="vl-community-upload-status" id="vl-community-upload-status"></div>`
  form.insertBefore(box, imageUrl)
  imageUrl.style.display = 'none'
  videoUrl.style.display = 'none'
  modal.dataset.vlCommunityEnhanced = 'true'

  const imageInput = box.querySelector('#vl-community-image-file')
  const videoInput = box.querySelector('#vl-community-video-file')
  const selected = box.querySelector('#vl-community-selected')
  const status = box.querySelector('#vl-community-upload-status')
  const updateSelected = () => {
    const parts = []
    if (imageInput.files?.[0]) parts.push(`Foto: ${imageInput.files[0].name}`)
    if (videoInput.files?.[0]) parts.push(`Vídeo: ${videoInput.files[0].name}`)
    selected.textContent = parts.join(' · ')
  }
  imageInput.addEventListener('change', updateSelected)
  videoInput.addEventListener('change', updateSelected)

  form.addEventListener('submit', async (event) => {
    const image = imageInput.files?.[0]
    const video = videoInput.files?.[0]
    if (!image && !video) return
    event.preventDefault()
    event.stopPropagation()
    const user = await currentUser()
    if (!user) {
      status.textContent = 'Entre na sua conta para enviar arquivos.'
      notify('O envio de arquivos exige login.', true)
      return
    }
    if (image && (!IMAGE_TYPES.has(image.type) || image.size > COMMUNITY_MAX)) return notify('Foto inválida. Use JPG, PNG, WebP ou GIF de até 100 MB.', true)
    if (video && (!VIDEO_TYPES.has(video.type) || video.size > COMMUNITY_MAX)) return notify('Vídeo inválido. Use MP4, WebM ou MOV de até 100 MB.', true)
    const city = await getLaguna()
    if (!city) return notify('Cidade da publicação não encontrada.', true)
    const submit = [...form.querySelectorAll('button')].find((button) => /Enviar/.test(button.textContent || ''))
    if (submit) { submit.disabled = true; submit.textContent = 'Enviando arquivo…' }
    status.textContent = 'Enviando mídia e criando envio privado…'
    const paths = []
    try {
      let imagePath = null; let videoPath = null
      if (image) { imagePath = `${user.id}/${crypto.randomUUID()}.${extensionFor(image)}`; await uploadFile(COMMUNITY_BUCKET, imagePath, image, COMMUNITY_MAX, IMAGE_TYPES); paths.push(imagePath) }
      if (video) { videoPath = `${user.id}/${crypto.randomUUID()}.${extensionFor(video)}`; await uploadFile(COMMUNITY_BUCKET, videoPath, video, COMMUNITY_MAX, VIDEO_TYPES); paths.push(videoPath) }
      const title = form.querySelector('input[placeholder*="Título"]')?.value || null
      const description = form.querySelector('textarea')?.value || null
      const { error } = await supabase.from('community_submissions').insert({ user_id: user.id, city_id: city.id, title, description, image_path: imagePath, video_path: videoPath, image_url: null, video_url: null, status: 'pending' })
      if (error) throw error
      status.textContent = 'Conteúdo enviado para moderação.'
      notify('Conteúdo enviado. Ele aguardará aprovação do administrador.')
      modal.querySelector('.modal-close')?.click()
    } catch (error) {
      for (const path of paths) await removeFile(COMMUNITY_BUCKET, path)
      status.textContent = error.message
      notify(error.message, true)
    } finally {
      if (submit && document.body.contains(submit)) { submit.disabled = false; submit.textContent = 'Enviar para moderação' }
    }
  }, true)
}

async function augmentPublicProfiles() {
  const head = document.querySelector('.profile-head h1')
  const gallery = document.querySelector('.profile-gallery')
  if (!head || state.profileBooted) return
  state.profileBooted = true
  const name = head.textContent.trim()
  const { data: business } = await supabase.from('businesses').select('id,name,logo_url,logo_path').eq('name', name).eq('status', 'active').maybeSingle()
  if (!business) return
  const profileHead = document.querySelector('.profile-head')
  if (business.logo_url && profileHead && !profileHead.querySelector('.vl-profile-logo-wrap')) {
    const logo = document.createElement('div')
    logo.className = 'vl-profile-logo-wrap'
    logo.innerHTML = `<div class="vl-profile-logo"><img src="${escapeHtml(business.logo_url)}" alt="Logo de ${escapeHtml(business.name)}"></div><span style="font-size:11px;color:#77869a">Identidade da empresa</span>`
    profileHead.insertBefore(logo, profileHead.firstChild)
  }
  if (!gallery) return
  const { data: items } = await supabase.from('business_photos').select('id,url,alt_text,media_type').eq('business_id', business.id).order('sort_order').order('created_at')
  if (!items?.length) return
  gallery.innerHTML = items.map((item) => mediaElement(item, business.name)).join('')
}

async function augmentFeedVideos() {
  const cards = [...document.querySelectorAll('.feed-card')]
  if (!cards.length || !supabase) return
  for (const card of cards) {
    if (card.querySelector('video')) continue
    const title = card.querySelector('h3')?.textContent?.trim()
    if (!title) continue
    const { data } = await supabase.from('posts').select('video_url').eq('title', title).eq('status', 'published').not('video_url','is',null).maybeSingle()
    if (data?.video_url) {
      const video = document.createElement('video')
      video.src = data.video_url
      video.controls = true
      video.playsInline = true
      video.preload = 'metadata'
      video.className = 'feed-image'
      card.insertBefore(video, card.querySelector('.feed-meta'))
    }
  }
}

async function boot() {
  if (state.initialized) return
  state.initialized = true
  injectStyles()
  const observer = new MutationObserver(async () => {
    const hero = document.querySelector('.hero')
    if (hero) {
      if (!state.pricingBooted) { state.pricingBooted = true; await mountPricing() }
      augmentFeedVideos()
      state.ownerPanelBooted = false
      state.profileBooted = false
    } else {
      state.pricingBooted = false
    }
    if (document.querySelector('.owner-business-list') && !state.ownerPanelBooted) {
      state.ownerPanelBooted = true
      await mountOwnerMedia()
    }
    augmentCommunityModal()
    if (document.querySelector('.profile-head h1') && supabase) await augmentPublicProfiles()
    if (!document.querySelector('.profile-head h1')) state.profileBooted = false
  })
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  await mountPricing()
  augmentCommunityModal()
}

boot()
