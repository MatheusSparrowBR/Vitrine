import { createClient } from '@supabase/supabase-js'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null
const DAY_NAMES=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const DAY_KEYS=['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

let currentStatus=null
let observer=null
let refreshTimer=null

function toMinutes(value){
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/)
  if(!match)return null
  const h=Number(match[1]),m=Number(match[2])
  return h<=23&&m<=59?h*60+m:null
}

function parseDay(day){
  if(!day||day.closed)return null
  const open=toMinutes(day.open),closeRaw=toMinutes(day.close)
  if(open==null||closeRaw==null||open===closeRaw)return null
  return {open,close:closeRaw<=open?closeRaw+1440:closeRaw,openLabel:day.open,closeLabel:day.close}
}

function dayIndex(date){return(date.getDay()+6)%7}

function calculateStatus(hours,date=new Date()){
  if(!hours||typeof hours!=='object')return{state:'unknown',label:'Horário',detail:'Consulte os horários'}
  const index=dayIndex(date)
  const now=date.getHours()*60+date.getMinutes()
  const schedule= parseDay(hours[DAY_KEYS[index]])

  if(schedule&&schedule.open<1440&&now>=schedule.open&&now<schedule.close){
    return{state:'open',label:'Aberto agora',detail:`Fecha às ${schedule.closeLabel}`}
  }

  const previous=(index+6)%7
  const previousSchedule=parseDay(hours[DAY_KEYS[previous]])
  if(previousSchedule&&previousSchedule.close>1440&&now<previousSchedule.close-1440){
    return{state:'open',label:'Aberto agora',detail:`Fecha às ${previousSchedule.closeLabel}`}
  }

  for(let offset=0;offset<7;offset+=1){
    const target=(index+offset)%7
    const candidate=parseDay(hours[DAY_KEYS[target]])
    if(!candidate)continue
    if(offset===0&&now>=candidate.open)continue
    const prefix=offset===0?'Abre':'Abre'
    return{state:'closed',label:'Fechado agora',detail:`${prefix} às ${candidate.openLabel}`,nextDay:offset?DAY_NAMES[target]:null}
  }
  return{state:'closed',label:'Fechado agora',detail:'Consulte os horários'}
}

function applyToDom(){
  if(!currentStatus)return false
  const root=document.querySelector('.mbp-shell')
  if(!root)return false

  const pill=root.querySelector('.mbp-hours-card p span[class*="mbp-open-pill"],.mbp-hours-card p span[class*="mbp-closed-pill"]')
  if(pill){
    const text=`● ${currentStatus.label}`
    if(pill.textContent!==text)pill.textContent=text
    pill.className=currentStatus.state==='open'?'mbp-open-pill':'mbp-closed-pill'
    pill.setAttribute('aria-live','polite')
  }

  root.querySelectorAll('.mbp-contact-grid .mbp-contact-card').forEach(card=>{
    if(card.querySelector('.mbp-contact-icon')?.textContent?.trim()!=='◷')return
    const title=card.querySelector('strong'),detail=card.querySelector('small')
    if(title&&title.textContent!==currentStatus.label)title.textContent=currentStatus.label
    if(detail&&detail.textContent!==currentStatus.detail)detail.textContent=currentStatus.detail
    card.dataset.hoursState=currentStatus.state
  })
  return true
}

function profileRoute(){
  const parts=location.pathname.split('/').filter(Boolean)
  if(parts.length!==3||parts[1]!=='empresa'||!parts[0]||!parts[2])return null
  return{citySlug:parts[0],businessSlug:decodeURIComponent(parts[2])}
}

async function loadStatus(){
  const route=profileRoute()
  if(!db||!route)return
  try{
    const{data:city,error:cityError}=await db.from('cities').select('id').eq('slug',route.citySlug).eq('active',true).maybeSingle()
    if(cityError||!city)return
    const{data:business,error:businessError}=await db.from('businesses').select('opening_hours').eq('city_id',city.id).eq('slug',route.businessSlug).eq('status','active').maybeSingle()
    if(businessError||!business)return
    currentStatus=calculateStatus(business.opening_hours)
    applyToDom()
  }catch{
    // O perfil continua funcional mesmo se o status não puder ser atualizado.
  }
}

function start(){
  if(!profileRoute())return
  const boot=()=>{
    loadStatus()
    observer=new MutationObserver(()=>applyToDom())
    observer.observe(document.body,{childList:true,subtree:true})
    refreshTimer=window.setInterval(loadStatus,30000)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()
}

start()
