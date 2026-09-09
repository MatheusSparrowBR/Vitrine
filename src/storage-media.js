import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = url && key ? createClient(url, key) : null

const COMMUNITY_BUCKET = 'community-submissions'
const MAX_COMMUNITY_BYTES = 100 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const state = { communityForms: new WeakSet(), profileBooted: false }

function extension(file) {
  return ({
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  }[file.type] || (file.name.split('.').pop() || 'bin').toLowerCase())
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char]))
}

function validate(file) {
  if (!file) throw new Error('Selecione um arquivo.')
  if (!IMAGE_TYPES.has(file.type) && !VIDEO_TYPES.has(file.type)) throw new Error('Formato não suportado. Use JPG, PNG, WebP, GIF, MP4, WebM ou MOV.')
  if (file.size > MAX_COMMUNITY_BYTES) throw new Error('O arquivo excede o limite de 100 MB.')
}

async function selectedCityId() {
  if (!supabase) return null
  const parts = window.location.pathname.split('/').filter(Boolean)
  const slug = parts[0] && !['admin', 'planos'].includes(parts[0]) ? decodeURIComponent(parts[0]).toLowerCase() : (localStorage.getItem('vitrinelocal:selected-city') || 'laguna')
  const { data, error } = await supabase.from('cities').select('id').eq('slug', slug).eq('active', true).maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error('A cidade selecionada não foi encontrada.')
  return data.id
}

async function uploadCommunity(file, userId) {
  validate(file)
  const path = `${userId}/${crypto.randomUUID()}.${extension(file)}`
  const { error } = await supabase.storage.from(COMMUNITY_BUCKET).upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

function renderPreview(target, file) {
  if (!file) { target.innerHTML = '<span>Nenhum arquivo selecionado.</span>'; return }
  const url = URL.createObjectURL(file)
  target.innerHTML = IMAGE_TYPES.has(file.type)
    ? `<img src="${url}" alt="Prévia"><span>${escapeHtml(file.name)}</span>`
    : `<video src="${url}" controls playsinline></video><span>${escapeHtml(file.name)}</span>`
}

function enhanceCommunityForm() {
  if (!supabase) return
  const kicker = [...document.querySelectorAll('.modal-kicker')].find((node) => (node.textContent || '').includes('Comunidade'))
  const modal = kicker?.closest('.modal')
  const form = modal?.querySelector('form')
  if (!form || state.communityForms.has(form)) return
  state.communityForms.add(form)

  const titleInput = form.querySelector('input[placeholder="Título ou assunto"]')
  const descriptionInput = form.querySelector('textarea[placeholder="Conte o que aconteceu…"]')
  const submit = form.querySelector('button[type="submit"]')
  if (!submit) return

  const wrapper = document.createElement('label')
  wrapper.className = 'vl-community-upload'
  wrapper.innerHTML = `<span>Foto ou vídeo da ocorrência</span><input type="file" data-community-file accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"><small>Até 100 MB · JPG, PNG, WebP, GIF, MP4, WebM ou MOV</small><div class="vl-community-preview" data-community-preview><span>Nenhum arquivo selecionado.</span></div>`
  form.insertBefore(wrapper, submit)

  const input = wrapper.querySelector('[data-community-file]')
  const preview = wrapper.querySelector('[data-community-preview]')
  input.addEventListener('change', () => renderPreview(preview, input.files?.[0]))

  form.addEventListener('submit', async (event) => {
    const file = input.files?.[0]
    if (!file) return
    event.preventDefault(); event.stopImmediatePropagation()
    submit.disabled = true
    const originalText = submit.textContent
    submit.textContent = 'Enviando…'
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error('Entre na sua conta para enviar uma foto ou vídeo.')
      const cityId = await selectedCityId()
      const path = await uploadCommunity(file, auth.user.id)
      const isImage = IMAGE_TYPES.has(file.type)
      const payload = {
        user_id: auth.user.id,
        city_id: cityId,
        title: titleInput?.value?.trim() || 'Conteúdo da comunidade',
        description: descriptionInput?.value?.trim() || null,
        image_url: null,
        video_url: null,
        image_path: isImage ? path : null,
        video_path: isImage ? null : path,
        status: 'pending',
      }
      const { error } = await supabase.from('community_submissions').insert(payload)
      if (error) { await supabase.storage.from(COMMUNITY_BUCKET).remove([path]).catch(() => {}); throw error }
      window.alert('Conteúdo enviado com sucesso. Ele ficará privado até a moderação.')
      modal.querySelector('.modal-close')?.click()
    } catch (error) {
      window.alert(`Erro no envio: ${error?.message || 'não foi possível enviar o arquivo.'}`)
    } finally {
      submit.disabled = false
      submit.textContent = originalText
    }
  }, true)
}

function enhanceProfileVideo() {
  if (!supabase || state.profileBooted) return
  const gallery = document.querySelector('.profile-gallery')
  if (!gallery) return
  const images = [...gallery.querySelectorAll('img')]
  if (!images.length) return
  state.profileBooted = true
  const urls = images.map((img) => img.currentSrc || img.src).filter(Boolean)
  supabase.from('business_photos').select('url,media_type').in('url', urls).then(({ data }) => {
    const mediaByUrl = new Map((data || []).map((row) => [row.url, row.media_type]))
    gallery.querySelectorAll('img').forEach((img) => {
      const url = img.currentSrc || img.src
      if (mediaByUrl.get(url) !== 'video') return
      const video = document.createElement('video')
      video.src = url
      video.controls = true
      video.playsInline = true
      video.preload = 'metadata'
      video.className = img.className
      video.setAttribute('aria-label', img.alt || 'Vídeo da empresa')
      img.replaceWith(video)
    })
  }).catch(() => {})
}

function boot() {
  const observer = new MutationObserver(() => {
    enhanceCommunityForm()
    if (!document.querySelector('.profile-gallery')) state.profileBooted = false
    enhanceProfileVideo()
  })
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  enhanceCommunityForm()
  enhanceProfileVideo()
}

boot()
