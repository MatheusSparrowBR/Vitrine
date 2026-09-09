import { createClient } from '@supabase/supabase-js'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase=URL&&KEY?createClient(URL,KEY):null
const SESSION_KEY='vitrinelocal:analytics-session'
const sentViews=new Set()
const sessionId=(()=>{let id=sessionStorage.getItem(SESSION_KEY);if(!id){id=crypto.randomUUID();sessionStorage.setItem(SESSION_KEY,id)}return id})()

async function logEvent(businessId,eventType,metadata={}){
  if(!supabase||!businessId)return
  const {data:auth}=await supabase.auth.getUser().catch(()=>({data:{user:null}}))
  await supabase.from('analytics_events').insert({business_id:businessId,event_type:eventType,session_id:sessionId,user_id:auth?.user?.id||null,metadata}).catch(()=>{})
}
async function getBusinessFromPage(){
  const h1=document.querySelector('.profile-hero h1'); if(!h1)return null
  const name=h1.textContent.trim()
  const citySlug=window.location.pathname.split('/').filter(Boolean)[0]||localStorage.getItem('vitrinelocal:selected-city')||'laguna'
  if(!supabase||!name)return null
  const city=await supabase.from('cities').select('id').eq('slug',citySlug).maybeSingle();if(!city.data)return null
  const b=await supabase.from('businesses').select('id,slug').eq('city_id',city.data.id).eq('name',name).eq('status','active').maybeSingle();return b.data||null
}
async function bootProfile(){
  const b=await getBusinessFromPage();if(!b||sentViews.has(b.id))return
  sentViews.add(b.id);await logEvent(b.id,'profile_view')
  document.addEventListener('click',event=>{
    const target=event.target.closest('a,button');if(!target)return
    const label=(target.textContent||'').trim().toLowerCase();const href=(target.getAttribute('href')||'').toLowerCase()
    let type=null
    if(label.includes('whatsapp')||href.includes('wa.me'))type='whatsapp_click'
    else if(label.includes('instagram')||href.includes('instagram.com'))type='instagram_click'
    else if(label==='site'||href.startsWith('http')&&!href.includes(window.location.hostname))type='website_click'
    else if(href.includes('google.com/maps')||label.includes('mapa')||label.includes('endereço'))type='map_click'
    if(type)logEvent(b.id,type,{label,href})
  },true)
}
function boot(){const observer=new MutationObserver(()=>bootProfile());observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});bootProfile()}
boot()
