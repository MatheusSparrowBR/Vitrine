import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null
const STORAGE_KEY = 'vitrinelocal:selected-city'
const DEFAULT_CITY = 'laguna'
const state = { initialized:false, cities:[], selectedSlug: localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY, citiesPromise:null }

const esc = (v='') => String(v).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))

function cityFromPath(){
  const parts=window.location.pathname.split('/').filter(Boolean)
  if(!parts.length || parts[0]==='planos' || parts[0]==='admin') return null
  return decodeURIComponent(parts[0]).toLowerCase()
}

const pathCity=cityFromPath()
if(pathCity) state.selectedSlug=pathCity

async function loadCities(){
  if(!supabase) return []
  if(state.citiesPromise) return state.citiesPromise
  state.citiesPromise=supabase.from('cities').select('id,name,state,slug').eq('active',true).order('name').then(({data,error})=>{
    if(error){console.warn('VitrineLocal: não foi possível carregar cidades.',error.message);return[]}
    return data||[]
  })
  return state.citiesPromise
}

function currentCity(){ return state.cities.find(c=>c.slug===state.selectedSlug)||null }

function rewriteSelectedCity(input){
  const url=new URL(input,window.location.origin)
  const params=url.searchParams
  if(url.pathname.includes('/rest/v1/cities')){
    const current=params.get('slug')
    if(current==='eq.laguna' || current==='eq.laguna%2E' || current==='eq%2Elaguna') params.set('slug',`eq.${state.selectedSlug||DEFAULT_CITY}`)
  }
  if(url.pathname.includes('/rest/v1/promotions')){
    const select=params.get('select')||''
    const city=currentCity()
    if(city && select.includes('businesses(name,slug)')) params.set('select',select.replace('businesses(name,slug)','businesses!inner(name,slug)'))
    if(city && select.includes('businesses!inner(name,slug)') && !params.has('businesses.city_id')) params.set('businesses.city_id',`eq.${city.id}`)
  }
  return url.toString()
}

function installFetchInterceptor(){
  const original=window.fetch
  if(original.__vitrinelocalMultiCity) return
  async function wrapped(input,init){
    try{
      await state.citiesPromise
      const raw=input instanceof Request?input.url:String(input)
      const next=rewriteSelectedCity(raw)
      if(input instanceof Request) return original.call(this,new Request(next,input),init)
      return original.call(this,next,init)
    }catch(error){ return original.call(this,input,init) }
  }
  wrapped.__vitrinelocalMultiCity=true
  window.fetch=wrapped
}

function installStyle(){
  if(document.getElementById('vl-multicity-style')) return
  const style=document.createElement('style');style.id='vl-multicity-style';style.textContent=`
    .vl-city-selector-wrap{position:relative;display:flex;align-items:center}.vl-city-selector{appearance:none;border:1px solid #dce4ed;background:#f7f9fc;color:#2a3b52;border-radius:10px;padding:9px 34px 9px 11px;font:700 11px 'DM Sans';cursor:pointer;outline:none;background-image:linear-gradient(45deg,transparent 50%,#718096 50%),linear-gradient(135deg,#718096 50%,transparent 50%);background-position:calc(100% - 14px) 12px,calc(100% - 10px) 12px;background-size:4px 4px,4px 4px;background-repeat:no-repeat}.vl-city-selector:focus{border-color:#2474ff;box-shadow:0 0 0 3px rgba(36,116,255,.1)}
    @media(max-width:1050px){.vl-city-selector{max-width:145px}}@media(max-width:800px){.location-chip{display:none}.vl-city-selector{max-width:150px}}@media(max-width:620px){.vl-city-selector{max-width:120px;padding-left:9px;padding-right:28px}}
  `;document.head.appendChild(style)
}

function ensureSelector(){
  const chip=document.querySelector('.location-chip'),navRow=document.querySelector('.nav-row')
  if(!navRow||!chip||!state.cities.length||document.querySelector('[data-vl-city-selector]')) return
  installStyle()
  const wrap=document.createElement('div');wrap.className='vl-city-selector-wrap'
  wrap.innerHTML=`<select class="vl-city-selector" data-vl-city-selector aria-label="Selecionar cidade">${state.cities.map(c=>`<option value="${esc(c.slug)}">📍 ${esc(c.name)} - ${esc(c.state)}</option>`).join('')}</select>`
  chip.replaceWith(wrap)
  const select=wrap.querySelector('select')
  select.value=currentCity()?.slug||state.cities[0].slug
  state.selectedSlug=select.value
  localStorage.setItem(STORAGE_KEY,state.selectedSlug)
  select.addEventListener('change',()=>{
    state.selectedSlug=select.value;localStorage.setItem(STORAGE_KEY,state.selectedSlug)
    const target=`/${encodeURIComponent(select.value)}`
    if(window.location.pathname!==target) window.location.assign(target); else window.location.reload()
  })
}

function syncRootRoute(){
  const pathname=window.location.pathname
  if((pathname==='/'||pathname==='') && state.selectedSlug){
    window.history.replaceState({},'',`/${encodeURIComponent(state.selectedSlug)}`)
  }
}

function syncTitle(){
  const city=currentCity()
  if(city) document.title=`VitrineLocal — ${city.name} | Empresas, promoções e novidades`
}

async function boot(){
  if(state.initialized)return
  state.initialized=true
  installFetchInterceptor()
  state.cities=await loadCities()
  if(!state.cities.length)return
  if(!state.cities.some(c=>c.slug===state.selectedSlug)){
    state.selectedSlug=state.cities.find(c=>c.slug===DEFAULT_CITY)?.slug||state.cities[0].slug
    localStorage.setItem(STORAGE_KEY,state.selectedSlug)
  }
  syncRootRoute();syncTitle()
  const observer=new MutationObserver(()=>{ensureSelector();syncTitle()})
  observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
  ensureSelector()
}
boot()
