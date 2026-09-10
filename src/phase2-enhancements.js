import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = URL && KEY ? createClient(URL, KEY) : null
const DEFAULT_PROMOTION_IMAGE = '/promotion-default.svg'
const seenBanners = new Set()
let enhancementTimer = null
let enhancementObserver = null
let bannerObserver = null
let promotionRefreshTimer = null
let promotionLoadToken = 0
let promotionRouteKey = ''
const cityIdCache = new Map()
let currentPromotions = []

function sessionId(){
  try{
    let id=localStorage.getItem('vl_analytics_session')
    if(!id){id=crypto.randomUUID();localStorage.setItem('vl_analytics_session',id)}
    return id
  }catch{return null}
}

async function getSession(){
  if(!db)return null
  const {data}=await db.auth.getSession()
  return data?.session||null
}

async function getCityId(){
  if(!db)return null
  const parts=location.pathname.split('/').filter(Boolean)
  const slug=parts[0]&&!['admin','planos','conta','privacidade','termos','atualizar-senha'].includes(parts[0].toLowerCase())?parts[0].toLowerCase():'laguna'
  if(cityIdCache.has(slug))return cityIdCache.get(slug)
  const {data}=await db.from('cities').select('id').eq('slug',slug).maybeSingle()
  const id=data?.id||null
  cityIdCache.set(slug,id)
  return id
}

function isPromotionCurrent(promotion, now=Date.now()){
  if(!promotion || promotion.status!=='published')return false
  const start=promotion.starts_at?new Date(promotion.starts_at).getTime():null
  const end=promotion.ends_at?new Date(promotion.ends_at).getTime():null
  if(start!==null&&!Number.isFinite(start))return false
  if(end!==null&&!Number.isFinite(end))return false
  if(start!==null&&start>now)return false
  if(end!==null&&end<=now)return false
  return true
}

function promotionKey(promotion){
  const title=String(promotion?.title||'').trim().toLowerCase()
  const businessSlug=String(promotion?.businesses?.slug||'').trim().toLowerCase()
  return `${title}|${businessSlug}`
}

function promotionNameKey(promotion){
  const title=String(promotion?.title||'').trim().toLowerCase()
  const businessName=String(promotion?.businesses?.name||'').trim().toLowerCase()
  return `${title}|${businessName}`
}

function publicPromotionRoute(){
  const parts=location.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if(parts.length===2&&parts[1]==='promocoes')return{type:'listing',citySlug:parts[0]}
  if(parts.length===3&&parts[1]==='empresa')return{type:'business',citySlug:parts[0],businessSlug:parts[2]}
  if(parts.length===1&&!['admin','planos','conta','login','privacidade','termos','atualizar-senha'].includes(parts[0].toLowerCase()))return{type:'home',citySlug:parts[0]}
  if(parts.length===0)return{type:'home',citySlug:'laguna'}
  return null
}

async function loadCurrentPromotions(){
  if(!db)return
  const route=publicPromotionRoute()
  if(!route)return
  const token=++promotionLoadToken
  const cityId=await getCityId()
  if(!cityId)return
  try{
    const {data,error}=await db.from('promotions')
      .select('id,title,image_url,starts_at,ends_at,status,businesses!inner(id,name,slug,city_id)')
      .eq('status','published')
      .eq('businesses.city_id',cityId)
      .order('created_at',{ascending:false})
      .limit(500)
    if(token!==promotionLoadToken)return
    if(error){currentPromotions=[];return}
    currentPromotions=(data||[]).filter(p=>isPromotionCurrent(p))
    applyPromotionVisibility()
  }catch{
    // Falhas de validação não podem quebrar o catálogo público.
  }
}

function ensureDefaultPromotionImage(card,src=DEFAULT_PROMOTION_IMAGE){
  if(!card)return
  if(card.querySelector('img'))return
  const old=card.querySelector('.promotion-cover')
  const img=document.createElement('img')
  img.src=src
  img.alt='Imagem padrão de promoção VitrineLocal'
  img.loading='lazy'
  img.decoding='async'
  img.className='promotion-default-image'
  if(old)old.replaceWith(img);else card.insertAdjacentElement('afterbegin',img)
}

function removeExpiredPromotionCard(card){
  if(card&&!card.dataset.vlPromotionRemoved){
    card.dataset.vlPromotionRemoved='1'
    card.remove()
  }
}

function activeByBusinessSlug(slug){
  return currentPromotions.filter(p=>String(p.businesses?.slug||'').toLowerCase()===String(slug||'').toLowerCase())
}

function applyPromotionVisibility(){
  const route=publicPromotionRoute()
  if(!route)return
  const activeKeySet=new Set(currentPromotions.map(promotionKey))
  const activeNameSet=new Set(currentPromotions.map(promotionNameKey))

  if(route.type==='listing'){
    const grid=document.querySelector('.promotion-grid')
    const cards=[...document.querySelectorAll('.promotion-card')]
    cards.forEach(card=>{
      const title=card.querySelector('.promotion-body h3')?.textContent?.trim().toLowerCase()||''
      const href=card.querySelector('.link-btn')?.getAttribute('href')||''
      const parts=href.split('/').filter(Boolean)
      const businessSlug=parts.length>=3&&parts[1]==='empresa'?decodeURIComponent(parts[2]||'').toLowerCase():''
      const key=`${title}|${businessSlug}`
      if(!activeKeySet.has(key))removeExpiredPromotionCard(card)
      else{
        const promotion=currentPromotions.find(p=>promotionKey(p)===key)
        ensureDefaultPromotionImage(card,promotion?.image_url||DEFAULT_PROMOTION_IMAGE)
      }
    })
    if(grid&&!grid.querySelector('.promotion-card')){
      grid.style.display='none'
      if(!document.querySelector('[data-vl-promotion-empty]')){
        const empty=document.createElement('div')
        empty.className='empty'
        empty.dataset.vlPromotionEmpty='1'
        empty.style.marginTop='22px'
        empty.innerHTML='<h3>Nenhuma promoção disponível.</h3><p>Novas ofertas aparecerão aqui quando forem publicadas.</p>'
        grid.parentElement?.appendChild(empty)
      }
    }else if(grid){
      grid.style.display=''
      document.querySelector('[data-vl-promotion-empty]')?.remove()
    }
  }

  if(route.type==='home'){
    document.querySelectorAll('.promo-section .content-card-v2').forEach(card=>{
      const title=card.querySelector('h3')?.textContent?.trim().toLowerCase()||''
      const businessName=card.querySelector('.content-card-body p strong')?.textContent?.trim().toLowerCase()||''
      const key=`${title}|${businessName}`
      if(!activeNameSet.has(key))removeExpiredPromotionCard(card)
      else{
        const promotion=currentPromotions.find(p=>promotionNameKey(p)===key)
        const existing=card.querySelector('img')
        if(existing)existing.src=promotion?.image_url||DEFAULT_PROMOTION_IMAGE
        else ensureDefaultPromotionImage(card,promotion?.image_url||DEFAULT_PROMOTION_IMAGE)
      }
    })
    const promoSection=document.querySelector('.promo-section')
    if(promoSection&&!promoSection.querySelector('.content-card-v2'))promoSection.remove()
    const promoCount=document.querySelector('.hero-panel .hero-stat:first-of-type strong')
    if(promoCount)promoCount.textContent=`${currentPromotions.length} promoções`
  }

  if(route.type==='business'){
    const activeTitles=new Set(activeByBusinessSlug(route.businessSlug).map(p=>String(p.title||'').trim().toLowerCase()))
    document.querySelectorAll('.profile-card .mini-row').forEach(row=>{
      const title=row.querySelector('strong')?.textContent?.trim().toLowerCase()||''
      if(title&&!activeTitles.has(title))row.remove()
    })
    document.querySelectorAll('.mbp-promo-card').forEach(card=>{
      const title=card.querySelector('strong')?.textContent?.trim().toLowerCase()||''
      if(title&&!activeTitles.has(title))removeExpiredPromotionCard(card)
      else{
        const promotion=currentPromotions.find(p=>String(p.businesses?.slug||'').toLowerCase()===String(route.businessSlug||'').toLowerCase()&&String(p.title||'').trim().toLowerCase()===title)
        if(!card.querySelector('img'))ensureDefaultPromotionImage(card,promotion?.image_url||DEFAULT_PROMOTION_IMAGE)
      }
    })
    document.querySelectorAll('.mbp-promo-card').forEach(card=>{ if(card.dataset.vlPromotionRemoved==='1') return })
    document.querySelectorAll('.mbp-section').forEach(section=>{
      if(section.querySelector('.mbp-promo-grid')&&!section.querySelector('.mbp-promo-card'))section.remove()
    })
  }
}

function wirePromotionLifecycle(){
  if(!document.body)return
  const route=publicPromotionRoute()
  const nextKey=route?`${route.type}|${route.citySlug||''}|${route.businessSlug||''}`:''
  if(!nextKey)return
  if(nextKey!==promotionRouteKey){
    promotionRouteKey=nextKey
    currentPromotions=[]
    window.clearInterval(promotionRefreshTimer)
    loadCurrentPromotions()
    promotionRefreshTimer=window.setInterval(loadCurrentPromotions,30000)
  }else{
    applyPromotionVisibility()
  }
}

async function enhanceAccount(){
  if(!location.pathname.startsWith('/conta')||location.pathname==='/conta/analytics')return
  const host=document.querySelector('.account-content')
  const statusBadge=host?.querySelector('.account-status-badge')
  if(!host||!statusBadge||host.querySelector('.vl-phase2-review-banner'))return
  const label=statusBadge.textContent.trim().toLowerCase()
  const status=label.includes('em análise')?'pending':label.includes('rejeitada')?'rejected':label.includes('suspensa')?'suspended':null
  if(!status)return
  let reason=''
  if(status==='rejected'&&db){
    const session=await getSession()
    if(session){const {data}=await db.from('businesses').select('rejection_reason').eq('owner_id',session.user.id).eq('status','rejected').order('updated_at',{ascending:false}).limit(1).maybeSingle();reason=data?.rejection_reason||''}
  }
  const banner=document.createElement('div')
  banner.className=`vl-phase2-review-banner ${status}`
  const copy=status==='pending'?['Cadastro em análise','Sua empresa foi enviada para revisão. Enquanto isso, você pode completar seus dados e mídias.','Em análise']:status==='rejected'?['Cadastro precisa de ajustes',reason||'O administrador solicitou correções antes da publicação.','Rejeitada']:['Empresa suspensa','O perfil está temporariamente fora do catálogo público. Consulte o administrador para entender os próximos passos.','Suspensa']
  banner.innerHTML=`<div><strong>${copy[0]}</strong><p>${copy[1]}</p><div class="vl-phase2-review-tools"><a href="/conta">Continuar no painel</a></div></div><span class="vl-phase2-review-badge">${copy[2]}</span>`
  host.prepend(banner)
}

async function recordBannerImpression(element){
  if(!db||!element)return
  const title=element.querySelector('.vl-premium-copy strong')?.textContent?.trim()||element.getAttribute('aria-label')||'Banner Premium'
  const href=element.getAttribute('href')||''
  const key=`${title}|${href}`
  if(seenBanners.has(key))return
  seenBanners.add(key)
  const city_id=await getCityId()
  await db.from('analytics_events').insert({event_type:'banner_impression',session_id:sessionId(),user_id:null,city_id,business_id:null,metadata:{title,href}})
}

function wireBannerAnalytics(){
  if(!document.body)return
  document.querySelectorAll('.vl-premium-banner').forEach(recordBannerImpression)
  if(bannerObserver)return
  bannerObserver=new MutationObserver(()=>document.querySelectorAll('.vl-premium-banner').forEach(recordBannerImpression))
  bannerObserver.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
}

function runEnhancements(){
  window.clearTimeout(enhancementTimer)
  enhancementTimer=window.setTimeout(()=>{
    enhanceAccount()
    wireBannerAnalytics()
    wirePromotionLifecycle()
    applyPromotionVisibility()
  },60)
}

function start(){
  runEnhancements()
  if(enhancementObserver)return
  enhancementObserver=new MutationObserver(()=>{
    window.clearTimeout(enhancementTimer)
    enhancementTimer=window.setTimeout(()=>{
      enhanceAccount()
      wireBannerAnalytics()
      wirePromotionLifecycle()
      applyPromotionVisibility()
    },60)
  })
  enhancementObserver.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
  window.addEventListener('popstate',runEnhancements)
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
