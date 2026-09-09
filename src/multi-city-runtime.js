import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null
const STORAGE_KEY = 'vitrinelocal:selected-city'
const DEFAULT_CITY = 'laguna'
const state = { initialized:false, cities:[], selectedSlug: localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY, citiesPromise:null }

function esc(v='') { return String(v).replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])) }

async function loadCities() {
  if (!supabase) return []
  const { data, error } = await supabase.from('cities').select('id,name,state,slug').eq('active', true).order('name')
  if (error) { console.warn('VitrineLocal: não foi possível carregar cidades.', error.message); return [] }
  return data || []
}

function rewriteSelectedCity(input, cityId = null) {
  const url = new URL(input, window.location.origin)
  if (url.pathname.includes('/rest/v1/cities')) {
    const current = url.searchParams.get('slug')
    if (current === 'eq.laguna' || current === 'eq%2Elaguna') url.searchParams.set('slug', `eq.${state.selectedSlug || DEFAULT_CITY}`)
    return url.toString()
  }
  if (url.pathname.includes('/rest/v1/promotions') && cityId) {
    const select = url.searchParams.get('select') || ''
    if (select.includes('businesses(name,slug)')) url.searchParams.set('select', select.replace('businesses(name,slug)', 'businesses!inner(name,slug)'))
    if (select.includes('businesses!inner(name,slug)') && !url.searchParams.has('businesses.city_id')) url.searchParams.set('businesses.city_id', `eq.${cityId}`)
  }
  return url.toString()
}

function installFetchInterceptor() {
  const original = window.fetch
  if (original.__vitrinelocalMultiCity) return
  async function wrapped(input, init) {
    try {
      const raw = input instanceof Request ? input.url : String(input)
      let cityId = null
      if (!raw.includes('/rest/v1/cities') && state.citiesPromise) {
        await state.citiesPromise
        cityId = state.cities.find((city) => city.slug === state.selectedSlug)?.id || null
      }
      const next = rewriteSelectedCity(raw, cityId)
      if (input instanceof Request) return original.call(this, new Request(next, input), init)
      return original.call(this, next, init)
    } catch (error) {
      return original.call(this, input, init)
    }
  }
  wrapped.__vitrinelocalMultiCity = true
  window.fetch = wrapped
}

function installStyle() {
  if (document.getElementById('vl-multicity-style')) return
  const style = document.createElement('style')
  style.id = 'vl-multicity-style'
  style.textContent = `
    .vl-city-selector-wrap{position:relative;display:flex;align-items:center}.vl-city-selector{appearance:none;border:1px solid #dce4ed;background:#f7f9fc;color:#2a3b52;border-radius:10px;padding:9px 34px 9px 11px;font:700 11px 'DM Sans';cursor:pointer;outline:none;background-image:linear-gradient(45deg,transparent 50%,#718096 50%),linear-gradient(135deg,#718096 50%,transparent 50%);background-position:calc(100% - 14px) 12px,calc(100% - 10px) 12px;background-size:4px 4px,4px 4px;background-repeat:no-repeat}.vl-city-selector:focus{border-color:#2474ff;box-shadow:0 0 0 3px rgba(36,116,255,.1)}
    @media(max-width:1050px){.vl-city-selector{max-width:145px}}@media(max-width:800px){.location-chip{display:none}.vl-city-selector{max-width:150px}}@media(max-width:620px){.vl-city-selector{max-width:120px;padding-left:9px;padding-right:28px}}
  `
  document.head.appendChild(style)
}

function ensureSelector() {
  const chip = document.querySelector('.location-chip')
  const navRow = document.querySelector('.nav-row')
  if (!navRow || !chip || !state.cities.length || document.querySelector('[data-vl-city-selector]')) return
  installStyle()
  const wrap = document.createElement('div')
  wrap.className = 'vl-city-selector-wrap'
  wrap.innerHTML = `<select class="vl-city-selector" data-vl-city-selector aria-label="Selecionar cidade">${state.cities.map((city) => `<option value="${esc(city.slug)}">📍 ${esc(city.name)} - ${esc(city.state)}</option>`).join('')}</select>`
  chip.replaceWith(wrap)
  const select = wrap.querySelector('select')
  select.value = state.cities.some((city) => city.slug === state.selectedSlug) ? state.selectedSlug : (state.cities[0]?.slug || DEFAULT_CITY)
  if (select.value !== state.selectedSlug) state.selectedSlug = select.value
  select.addEventListener('change', () => {
    state.selectedSlug = select.value
    localStorage.setItem(STORAGE_KEY, state.selectedSlug)
    document.body.dataset.city = state.selectedSlug
    window.location.reload()
  })
}

function syncTitle() {
  const city = state.cities.find((item) => item.slug === state.selectedSlug)
  if (city) document.title = `VitrineLocal — ${city.name}`
}

async function boot() {
  if (state.initialized) return
  state.initialized = true
  installFetchInterceptor()
  state.citiesPromise = loadCities()
  state.cities = await state.citiesPromise
  if (!state.cities.length) return
  if (!state.cities.some((city) => city.slug === state.selectedSlug)) {
    state.selectedSlug = state.cities.find((city) => city.slug === DEFAULT_CITY)?.slug || state.cities[0].slug
    localStorage.setItem(STORAGE_KEY, state.selectedSlug)
  }
  syncTitle()
  const observer = new MutationObserver(ensureSelector)
  observer.observe(document.getElementById('root') || document.body, { childList:true, subtree:true })
  ensureSelector()
}

boot()
