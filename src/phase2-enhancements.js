import { createClient } from '@supabase/supabase-js'
import { hasPlanFeature } from './phase2-rules.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = URL && KEY ? createClient(URL, KEY) : null
const seenBanners = new Set()
let enhancementTimer = null
let observer = null
let cityIdCache = new Map()

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
  const slug=parts[0]&&!['admin','planos','conta','privacidade','termos','atualizar-senha'].includes(parts[0].toLowerCase())?parts[0].toLowerCase():(localStorage.getItem('vitrinelocal:selected-city')||'laguna')
  if(cityIdCache.has(slug))return cityIdCache.get(slug)
  const {data}=await db.from('cities').select('id').eq('slug',slug).maybeSingle()
  cityIdCache.set(slug,data?.id||null)
  return data?.id||null
}

async function audit(action,entityId,metadata={}){
  if(!db||!entityId)return
  const session=await getSession()
  if(!session)return
  await db.from('admin_audit_logs').insert({actor_id:session.user.id,action,entity_type:'business',entity_id:entityId,metadata})
}

function ensureAdminQueue(){
  if(!location.pathname.startsWith('/admin/empresas'))return
  const table=document.querySelector('.admin-v2-table')
  if(!table||table.dataset.phase2Ready==='1')return
  table.dataset.phase2Ready='1'
  const rows=[...table.querySelectorAll('tbody tr')]
  const pending=rows.filter(row=>row.querySelector('td:nth-child(4)')?.textContent?.trim().toLowerCase()==='pendente')
  if(pending.length){
    const section=table.closest('.admin-v2-section')
    const queue=document.createElement('div')
    queue.className='vl-phase2-admin-queue'
    queue.innerHTML=`<div><strong>${pending.length} empresa(s) aguardando análise</strong><span>Revise o cadastro antes de publicar no catálogo.</span></div><button type="button">Ver pendentes</button>`
    const toolbar=section?.querySelector('.admin-v2-toolbar')
    if(toolbar)toolbar.before(queue)
    queue.querySelector('button')?.addEventListener('click',()=>{
      const select=section?.querySelector('.admin-v2-toolbar select')
      if(select){select.value='pending';select.dispatchEvent(new Event('change',{bubbles:true}))}
    })
  }
  rows.forEach(row=>addReviewActions(row))
}

function addReviewActions(row){
  const cells=row.querySelectorAll('td')
  if(cells.length<6)return
  const status=(cells[3].textContent||'').trim().toLowerCase()
  const actions=cells[5].querySelector('.admin-v2-table-actions')
  if(!actions||actions.querySelector('[data-phase2-review]')||status!=='pendente')return
  const id=row.querySelector('button.primary')?.getAttribute('data-business-id') || row.querySelector('button.primary')?.dataset.businessId
  const fallbackName=cells[0].querySelector('strong')?.textContent?.trim()||'empresa'
  if(!id){
    const editButton=[...actions.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar')
    if(editButton)editButton.dataset.phase2Edit='1'
  }
  const reviewWrap=document.createElement('div')
  reviewWrap.className='vl-phase2-admin-review-wrap'
  reviewWrap.dataset.phase2Review='1'
  reviewWrap.innerHTML='<button type="button" class="approve">Aprovar</button><button type="button" class="reject">Rejeitar</button>'
  actions.parentElement.appendChild(reviewWrap)

  const resolveId=async()=>{
    if(id)return id
    const name=fallbackName
    const {data}=await db.from('businesses').select('id').eq('name',name).limit(2)
    return data?.[0]?.id||null
  }
  reviewWrap.querySelector('.approve')?.addEventListener('click',async()=>{
    const button=reviewWrap.querySelector('.approve');button.disabled=true
    try{
      const businessId=await resolveId();if(!businessId)throw new Error('Não foi possível identificar a empresa.')
      const {error}=await db.from('businesses').update({status:'active'}).eq('id',businessId)
      if(error)throw error
      await audit('business_approved',businessId,{source:'admin_businesses'})
      window.location.reload()
    }catch(error){button.disabled=false;window.alert(error?.message||'Não foi possível aprovar a empresa.')}
  })
  reviewWrap.querySelector('.reject')?.addEventListener('click',async()=>{
    const reason=window.prompt('Informe o motivo da rejeição:','Dados incompletos ou informações que precisam ser corrigidas.')
    if(!reason?.trim())return
    const button=reviewWrap.querySelector('.reject');button.disabled=true
    try{
      const businessId=await resolveId();if(!businessId)throw new Error('Não foi possível identificar a empresa.')
      const {error}=await db.from('businesses').update({status:'rejected',rejection_reason:reason.trim()}).eq('id',businessId)
      if(error)throw error
      await audit('business_rejected',businessId,{reason:reason.trim(),source:'admin_businesses'})
      window.location.reload()
    }catch(error){button.disabled=false;window.alert(error?.message||'Não foi possível rejeitar a empresa.')}
  })
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
  banner.innerHTML=`<div><strong>${copy[0]}</strong><p>${copy[1]}</p><div class="vl-phase2-review-tools"><a href="/conta">Continuar no painel</a>${status==='pending'?'<a href="/conta?new=business">Cadastrar outra empresa</a>':''}</div></div><span class="vl-phase2-review-badge">${copy[2]}</span>`
  host.prepend(banner)
}

async function enhanceAnalytics(){
  if(location.pathname!=='/conta/analytics'||!db)return
  const host=document.querySelector('.analytics-page .analytics-shell')
  if(!host||host.dataset.phase2Analytics==='1')return
  host.dataset.phase2Analytics='1'
  const session=await getSession()
  if(!session)return
  const businessId=host.querySelector('.analytics-head-actions select')?.value
  if(!businessId)return
  const {data:planId}=await db.rpc('get_effective_plan_id',{p_business_id:businessId})
  if(!planId)return
  const {data:plan}=await db.from('plans').select('code,name,features').eq('id',planId).maybeSingle()
  if(!plan)return
  if(!hasPlanFeature(plan.features,'analytics',false)){
    host.innerHTML=`<section class="vl-phase2-analytics-lock"><div class="icon">⌁</div><span class="plan-name">Plano ${plan.name||'Grátis'}</span><h2>Analytics é um recurso Pro</h2><p>Veja visualizações, cliques no WhatsApp, Instagram, promoções e conversões com um plano que inclui métricas comerciais.</p><a href="/planos">Conhecer planos →</a></section>`
  }else{
    const headActions=host.querySelector('.analytics-head-actions')
    if(headActions&&!headActions.querySelector('[data-phase2-plan]')){
      const badge=document.createElement('span');badge.dataset.phase2Plan='1';badge.className='analytics-plan-badge';badge.textContent=`Plano ${plan.name||plan.code}`;headActions.prepend(badge)
    }
  }
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
  if(observer)return
  observer=new MutationObserver(()=>document.querySelectorAll('.vl-premium-banner').forEach(recordBannerImpression))
  observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
}

function runEnhancements(){
  window.clearTimeout(enhancementTimer)
  enhancementTimer=window.setTimeout(()=>{
    ensureAdminQueue()
    enhanceAccount()
    enhanceAnalytics()
    wireBannerAnalytics()
  },80)
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',runEnhancements,{once:true});else runEnhancements()
window.addEventListener('popstate',runEnhancements)
