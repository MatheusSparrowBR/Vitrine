import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null
const STORAGE_KEY = 'vitrinelocal:selected-city'
const DEFAULT_CITY = 'laguna'
const state = {
  initialized: false,
  cities: [],
  selectedSlug: (() => {
    const first = window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
    return first && !['admin', 'planos'].includes(first) ? decodeURIComponent(first) : (localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY)
  })(),
  citiesPromise: null,
}

const esc = (value = '') => String(value).replace(/[&<>\"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]))

async function loadCities() {
  if (!supabase) return []
  if (!state.citiesPromise) {
    state.citiesPromise = supabase
      .from('cities')
      .select('id,name,state,slug')
      .eq('active', true)
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.warn('VitrineLocal: erro ao carregar cidades.', error.message)
          return []
        }
        return data || []
      })
  }
  return state.citiesPromise
}

function selectedCity() {
  return state.cities.find((city) => city.slug === state.selectedSlug) || null
}

function routeCity() {
  const first = window.location.pathname.split('/').filter(Boolean)[0]
  if (!first || first === 'admin' || first === 'planos') return null
  return decodeURIComponent(first).toLowerCase()
}

function rewriteRequest(input) {
  const url = new URL(input, window.location.origin)
  const city = selectedCity()

  if (url.pathname.includes('/rest/v1/cities')) {
    const slug = url.searchParams.get('slug')
    if (slug && (slug === 'eq.laguna' || slug === 'eq.laguna%2E')) {
      url.searchParams.set('slug', `eq.${state.selectedSlug || DEFAULT_CITY}`)
    }
    return url.toString()
  }

  if (!city) return url.toString()

  if (url.pathname.includes('/rest/v1/promotions')) {
    const select = url.searchParams.get('select') || ''
    if (select.includes('businesses(name,slug)')) {
      url.searchParams.set('select', select.replace('businesses(name,slug)', 'businesses!inner(name,slug)'))
    }
    const nextSelect = url.searchParams.get('select') || ''
    if (nextSelect.includes('businesses!inner(name,slug)') && !url.searchParams.has('businesses.city_id')) {
      url.searchParams.set('businesses.city_id', `eq.${city.id}`)
    }
    return url.toString()
  }

  if (url.pathname.endsWith('/rest/v1/businesses')) {
    const hasSlug = url.searchParams.has('slug')
    const hasCityId = url.searchParams.has('city_id')
    const hasOwnerId = url.searchParams.has('owner_id')
    const select = url.searchParams.get('select') || ''
    const adminJoin = select.includes('profiles:owner_id')
    if (hasSlug && !hasCityId && !hasOwnerId && !adminJoin) {
      url.searchParams.set('city_id', `eq.${city.id}`)
    }
  }

  return url.toString()
}

function installFetchInterceptor() {
  const originalFetch = window.fetch
  if (originalFetch.__vitrinelocalMultiCity) return

  const wrapped = async (input, init) => {
    try {
      if (state.citiesPromise) await state.citiesPromise
      const raw = input instanceof Request ? input.url : String(input)
      const next = rewriteRequest(raw)
      if (input instanceof Request) return originalFetch.call(window, new Request(next, input), init)
      return originalFetch.call(window, next, init)
    } catch {
      return originalFetch.call(window, input, init)
    }
  }

  wrapped.__vitrinelocalMultiCity = true
  window.fetch = wrapped
}

function installStyles() {
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

  installStyles()
  const wrap = document.createElement('div')
  wrap.className = 'vl-city-selector-wrap'
  wrap.innerHTML = `<select class="vl-city-selector" data-vl-city-selector aria-label="Selecionar cidade">${state.cities.map((city) => `<option value="${esc(city.slug)}">📍 ${esc(city.name)} - ${esc(city.state)}</option>`).join('')}</select>`
  chip.replaceWith(wrap)

  const select = wrap.querySelector('select')
  const validSlug = state.cities.some((city) => city.slug === state.selectedSlug)
  if (!validSlug) state.selectedSlug = state.cities.find((city) => city.slug === DEFAULT_CITY)?.slug || state.cities[0].slug
  select.value = state.selectedSlug
  localStorage.setItem(STORAGE_KEY, state.selectedSlug)

  select.addEventListener('change', () => {
    state.selectedSlug = select.value
    localStorage.setItem(STORAGE_KEY, state.selectedSlug)
    const target = `/${encodeURIComponent(select.value)}`
    window.location.assign(target)
  })
}

function syncRouteAndTitle() {
  const city = selectedCity()
  if (!city) return
  const current = window.location.pathname
  const first = current.split('/').filter(Boolean)[0]
  if (!first || ['admin', 'planos'].includes(first)) return
  if (first.toLowerCase() !== city.slug) {
    const parts = current.split('/').filter(Boolean)
    parts[0] = city.slug
    window.history.replaceState({}, '', `/${parts.map(encodeURIComponent).join('/')}`)
  }
  document.title = `VitrineLocal — ${city.name} | Empresas, promoções e novidades`
}

async function boot() {
  if (state.initialized) return
  state.initialized = true
  installFetchInterceptor()
  state.cities = await loadCities()
  if (!state.cities.length) return

  const pathCity = routeCity()
  if (pathCity && state.cities.some((city) => city.slug === pathCity)) {
    state.selectedSlug = pathCity
  } else if (!state.cities.some((city) => city.slug === state.selectedSlug)) {
    state.selectedSlug = state.cities.find((city) => city.slug === DEFAULT_CITY)?.slug || state.cities[0].slug
  }

  localStorage.setItem(STORAGE_KEY, state.selectedSlug)
  syncRouteAndTitle()

  const observer = new MutationObserver(ensureSelector)
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  ensureSelector()
}

boot()
