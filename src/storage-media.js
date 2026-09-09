import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = url && key ? createClient(url, key) : null

const BUSINESS_BUCKET = 'business-media'
const COMMUNITY_BUCKET = 'community-submissions'
const MAX_BUSINESS_BYTES = 50 * 1024 * 1024
const MAX_COMMUNITY_BYTES = 100 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const ALLOWED_TYPES = new Set([...IMAGE_TYPES, ...VIDEO_TYPES])

const state = { ownerBooted: false, communityForms: new WeakSet(), profileBooted: false }

function extension(file) {
  const map = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  }
  return map[file.type] || (file.name.split('.').pop() || 'bin').toLowerCase()
}

function validate(file, maxBytes) {
  if (!file) throw new Error('Selecione um arquivo.')
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Formato não suportado. Use JPG, PNG, WebP, GIF, MP4, WebM ou MOV.')
  if (file.size > maxBytes) throw new Error(`O arquivo excede o limite de ${Math.round(maxBytes / 1024 / 1024)} MB.`)
}

async function upload(bucket, folder, file, maxBytes) {
  if (!supabase) throw new Error('Supabase não está configurado.')
  validate(file, maxBytes)
  const path = `${folder}/${crypto.randomUUID()}.${extension(file)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return path
}

async function getPublicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

async function getLagunaId() {
  const { data, error } = await supabase.from('cities').select('id').eq('slug', 'laguna').maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error('Cidade Laguna não encontrada.')
  return data.id
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

async function loadOwnedBusinesses() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Faça login para gerenciar a mídia da empresa.')
  const { data, error } = await supabase.from('businesses').select('id,name,status').eq('owner_id', userData.user.id).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

function ensureOwnerManager() {
  if (!supabase) return
  const ownerList = document.querySelector('.owner-business-list')
  if (!ownerList || document.querySelector('[data-vl-business-media-manager]')) return

  const manager = document.createElement('section')
  manager.dataset.vlBusinessMediaManager = 'true'
  manager.className = 'vl-media-manager'
  manager.innerHTML = `
    <div class="vl-media-manager-head">
      <div><span class="section-kicker">Mídia da empresa</span><h2>Fotos e vídeos</h2><p>Adicione mídia à galeria pública da sua empresa. O arquivo é enviado diretamente ao Supabase Storage.</p></div>
    </div>
    <div class="vl-media-manager-form">
      <label>Empresa<select data-business-select required><option value="">Carregando…</option></select></label>
      <label>Arquivos<input data-business-files type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple></label>
      <div class="vl-media-files" data-business-file-list><span>Nenhum arquivo selecionado.</span></div>
      <button class="primary-btn" data-business-upload type="button">Enviar para a galeria</button>
      <div class="vl-media-status" data-business-status role="status"></div>
    </div>`
  ownerList.parentElement.insertBefore(manager, ownerList.nextSibling)

  const select = manager.querySelector('[data-business-select]')
  const input = manager.querySelector('[data-business-files]')
  const list = manager.querySelector('[data-business-file-list]')
  const button = manager.querySelector('[data-business-upload]')
  const status = manager.querySelector('[data-business-status]')

  loadOwnedBusinesses().then((businesses) => {
    select.innerHTML = '<option value="">Selecione a empresa</option>' + businesses.map((b) => `<option value="${b.id}">${escapeHtml(b.name)} · ${escapeHtml(b.status)}</option>`).join('')
  }).catch((error) => {
    select.innerHTML = '<option value="">Não foi possível carregar</option>'
    status.textContent = error.message || 'Erro ao carregar empresas.'
  })

  input.addEventListener('change', () => {
    const files = Array.from(input.files || [])
    list.innerHTML = files.length ? files.map((file) => `<span>${escapeHtml(file.name)} · ${formatFileSize(file.size)}</span>`).join('') : '<span>Nenhum arquivo selecionado.</span>'
  })

  button.addEventListener('click', async () => {
    const businessId = select.value
    const files = Array.from(input.files || [])
    status.textContent = ''
    if (!businessId) { status.textContent = 'Selecione uma empresa.'; return }
    if (!files.length) { status.textContent = 'Selecione pelo menos um arquivo.'; return }
    button.disabled = true
    button.textContent = 'Enviando…'
    const uploaded = []
    try {
      for (const file of files) {
        const path = await upload(BUSINESS_BUCKET, `business/${businessId}`, file, MAX_BUSINESS_BYTES)
        const publicUrl = await getPublicUrl(BUSINESS_BUCKET, path)
        uploaded.push({ path, publicUrl, mediaType: IMAGE_TYPES.has(file.type) ? 'image' : 'video', name: file.name })
      }
      const { data: existing, error: existingError } = await supabase.from('business_photos').select('sort_order').eq('business_id', businessId).order('sort_order', { ascending: false }).limit(1)
      if (existingError) throw existingError
      const startOrder = (existing?.[0]?.sort_order ?? -1) + 1
      const rows = uploaded.map((item, index) => ({ business_id: businessId, url: item.publicUrl, storage_path: item.path, media_type: item.mediaType, alt_text: item.name, sort_order: startOrder + index }))
      const { error } = await supabase.from('business_photos').insert(rows)
      if (error) throw error
      status.textContent = `${uploaded.length} arquivo(s) adicionado(s) à galeria.`
      input.value = ''
      list.innerHTML = '<span>Nenhum arquivo selecionado.</span>'
    } catch (error) {
      for (const item of uploaded) await supabase.storage.from(BUSINESS_BUCKET).remove([item.path]).catch(() => {})
      status.textContent = error?.message || 'Não foi possível enviar a mídia.'
    } finally {
      button.disabled = false
      button.textContent = 'Enviar para a galeria'
    }
  })
}

function ensureCommunityUpload() {
  if (!supabase) return
  const kicker = Array.from(document.querySelectorAll('.modal-kicker')).find((node) => node.textContent.includes('Comunidade'))
  if (!kicker) return
  const modal = kicker.closest('.modal')
  const form = modal?.querySelector('form')
  if (!form || state.communityForms.has(form)) return
  state.communityForms.add(form)

  const media = document.createElement('label')
  media.className = 'vl-community-upload'
  media.innerHTML = `
    <span>Foto ou vídeo da ocorrência</span>
    <input type="file" data-community-file accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime">
    <small>Até 100 MB · JPG, PNG, WebP, GIF, MP4, WebM ou MOV</small>
    <div class="vl-community-preview" data-community-preview><span>Nenhum arquivo selecionado.</span></div>`
  form.insertBefore(media, form.querySelector('.form-error') || form.querySelector('button[type="submit"]'))

  const fileInput = media.querySelector('[data-community-file]')
  const preview = media.querySelector('[data-community-preview]')
  fileInput.addEventListener('change', () => renderPreview(preview, fileInput.files?.[0]))

  form.addEventListener('submit', async (event) => {
    const file = fileInput.files?.[0]
    if (!file) return
    event.preventDefault()
    event.stopPropagation()
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) throw new Error('Entre na sua conta para enviar arquivos pelo Storage.')
      validate(file, MAX_COMMUNITY_BYTES)
      const cityId = await getLagunaId()
      const title = form.querySelector('input[placeholder="Título ou assunto"]')?.value?.trim() || 'Conteúdo da comunidade'
      const description = form.querySelector('textarea[placeholder="Conte o que aconteceu…"]')?.value?.trim() || ''
      const isImage = IMAGE_TYPES.has(file.type)
      const path = await upload(COMMUNITY_BUCKET, `${userData.user.id}`, file, MAX_COMMUNITY_BYTES)
      const payload = {
        user_id: userData.user.id,
        city_id: cityId,
        title,
        description,
        image_url: null,
        video_url: null,
        image_path: isImage ? path : null,
        video_path: isImage ? null : path,
        status: 'pending',
      }
      const { error } = await supabase.from('community_submissions').insert(payload)
      if (error) throw error
      window.alert('Arquivo enviado com sucesso. Ele ficará privado até a moderação.')
      modal.querySelector('.modal-close')?.click()
    } catch (error) {
      window.alert(`Erro no envio: ${error?.message || 'não foi possível enviar o arquivo.'}`)
    }
  }, true)
}

function renderPreview(target, file) {
  if (!file) { target.innerHTML = '<span>Nenhum arquivo selecionado.</span>'; return }
  const objectUrl = URL.createObjectURL(file)
  if (IMAGE_TYPES.has(file.type)) target.innerHTML = `<img src="${objectUrl}" alt="Prévia"><span>${escapeHtml(file.name)} · ${formatFileSize(file.size)}</span>`
  else target.innerHTML = `<video src="${objectUrl}" controls></video><span>${escapeHtml(file.name)} · ${formatFileSize(file.size)}</span>`
}

function ensureProfileMedia() {
  if (!supabase || state.profileBooted) return
  const gallery = document.querySelector('.profile-gallery')
  if (!gallery || !gallery.querySelector('img')) return
  state.profileBooted = true
  const urls = Array.from(gallery.querySelectorAll('img')).map((img) => img.currentSrc || img.src).filter(Boolean)
  if (!urls.length) return
  supabase.from('business_photos').select('url,media_type').in('url', urls).then(({ data }) => {
    const mediaByUrl = new Map((data || []).map((row) => [row.url, row.media_type]))
    gallery.querySelectorAll('img').forEach((img) => {
      const type = mediaByUrl.get(img.currentSrc || img.src)
      if (type !== 'video') return
      const video = document.createElement('video')
      video.src = img.currentSrc || img.src
      video.controls = true
      video.playsInline = true
      video.preload = 'metadata'
      video.className = img.className
      video.setAttribute('aria-label', img.alt || 'Vídeo da empresa')
      img.replaceWith(video)
    })
  }).catch(() => {})
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]))
}

function resetProfileBoot() {
  if (!document.querySelector('.profile-gallery')) state.profileBooted = false
}

function boot() {
  const observer = new MutationObserver(() => {
    ensureOwnerManager()
    ensureCommunityUpload()
    ensureProfileMedia()
    resetProfileBoot()
  })
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  ensureOwnerManager()
  ensureCommunityUpload()
  ensureProfileMedia()
}

boot()
