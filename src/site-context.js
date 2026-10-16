// Dados do site usados pelo cabeçalho, rodapé e menu inferior, carregados uma vez por visita.
import { supabase as db } from './supabase-client.js'

export const FALLBACK_CITY = { id: 'fallback', name: 'Laguna', state: 'SC', slug: 'laguna', active: true }
// primeiros trechos de endereço que não são cidade
export const RESERVED_PATHS = new Set(['login', 'planos', 'conta', 'admin', 'privacidade', 'termos', 'atualizar-senha', 'usuario', 'em-breve', 'preview-lancamento'])

export function currentCitySlug() {
  const first = location.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
  if (first && !RESERVED_PATHS.has(first)) return first
  try { return localStorage.getItem('vl_city_slug') || 'laguna' } catch { return 'laguna' }
}

let citiesPromise = null
export function loadActiveCities() {
  if (!db) return Promise.resolve([FALLBACK_CITY])
  if (!citiesPromise) {
    citiesPromise = db.from('cities').select('id,name,state,slug,active').eq('active', true).order('name')
      .then(({ data }) => (data?.length ? data : [FALLBACK_CITY]))
      .catch(() => [FALLBACK_CITY])
  }
  return citiesPromise
}

// Total de vagas publicadas na cidade (o item "Vagas" só aparece quando há vaga).
const jobsCache = new Map()
export function loadJobsCount(citySlug) {
  if (!db) return Promise.resolve(0)
  if (!jobsCache.has(citySlug)) {
    jobsCache.set(citySlug, loadActiveCities().then((cities) => {
      const city = cities.find((c) => c.slug === citySlug)
      if (!city || city.id === 'fallback') return 0
      return db.from('job_postings').select('id,businesses!inner(city_id)', { count: 'exact', head: true })
        .eq('businesses.city_id', city.id).eq('status', 'published')
        .then(({ count }) => count || 0)
    }).catch(() => 0))
  }
  return jobsCache.get(citySlug)
}

// Contato oficial do VitrineLocal
export const CONTATO = {
  email: 'contato@vitrinelocal.net',
  instagram: '@vitrinelocaal',
  instagramUrl: 'https://www.instagram.com/vitrinelocaal/',
}

// Descrição curta "🍕| A vida é melhor…" → "🍕 A vida é melhor…" (a barra usada como separador não aparece)
export function limparTexto(texto) {
  return String(texto || '').replace(/^\s*((?:\p{Extended_Pictographic}|️|‍)+)?\s*[|•·:–—-]+\s*/u, (m, emoji) => (emoji ? emoji + ' ' : '')).trim()
}
