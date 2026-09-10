import{createClient}from '@supabase/supabase-js'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null
const seenBanners=new Set()
let enhancementTimer=null
let enhancementObserver=null
let bannerObserver=null
let mediaFitInstalled=false
const cityIdCache=new Map()

function sessionId(){
 try{
  let id=localStorage.getItem('vl_analytics_session')
  if(!id){id=crypto.randomUUID();localStorage.setItem('vl_analytics_session',id)}
  return id
 }catch{return null}
}

async function getSession(){
 if(!db)return null
 const{data}=await db.auth.getSession()
 return data?.session||null
}

async function getCityId(){
 if(!db)return null
 const parts=location.pathname.split('/').filter(Boolean)
 const slug=parts[0]&&!['admin','planos','conta','privacidade','termos','atualizar-senha'].includes(parts[0].toLowerCase())?parts[0].toLowerCase():'laguna'
 if(cityIdCache.has(slug))return cityIdCache.get(slug)
 const{data}=await db.from('cities').select('id').eq('slug',slug).maybeSingle()
 const id=data?.id||null
 cityIdCache.set(slug,id)
 return id
}

function installUniversalMediaFit(){
 if(mediaFitInstalled||typeof document==='undefined')return
 mediaFitInstalled=true
 if(document.getElementById('vl-universal-media-fit'))return
 const style=document.createElement('style')
 style.id='vl-universal-media-fit'
 style.textContent=`
  .vl-public-app img,.app img,.account-workspace-app img,.admin-promotions-page img,.admin-v2-management img,.business-card img,.business-cover-image,.business-logo,.business-image img,.profile-cover img,.profile-logo img,.profile-gallery img,.item-card img,.content-card-v2 img,.promotion-card img,.mbp-gallery img,.mbp-promo-card img,.mbp-items img,.ad-media img{object-fit:contain!important;object-position:center!important;background:#f4f7fb!important;}
  .business-cover-image,.business-image img,.profile-gallery img,.item-card img,.mbp-gallery img,.mbp-promo-card img,.mbp-items img,.ad-media img{width:100%!important;height:100%!important;}
  .business-logo,.profile-logo img{max-width:100%!important;max-height:100%!important;}
 `
 document.head.appendChild(style)
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
  if(session){const{data}=await db.from('businesses').select('rejection_reason').eq('owner_id',session.user.id).eq('status','rejected').order('updated_at',{ascending:false}).limit(1).maybeSingle();reason=data?.rejection_reason||''}
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
  installUniversalMediaFit()
  enhanceAccount()
  wireBannerAnalytics()
 },60)
}

function start(){
 runEnhancements()
 if(enhancementObserver)return
 enhancementObserver=new MutationObserver(()=>{
  window.clearTimeout(enhancementTimer)
  enhancementTimer=window.setTimeout(()=>{
   installUniversalMediaFit()
   enhanceAccount()
   wireBannerAnalytics()
  },60)
 })
 enhancementObserver.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
 window.addEventListener('popstate',runEnhancements)
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
