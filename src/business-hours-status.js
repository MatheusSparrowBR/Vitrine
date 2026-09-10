const DAY_NAMES=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']

function toMinutes(value){
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/)
  if(!match)return null
  const hours=Number(match[1]),minutes=Number(match[2])
  if(hours>23||minutes>59)return null
  return hours*60+minutes
}

function parseSchedule(text){
  const normalized=String(text||'').trim()
  if(!normalized||/^fechado$/i.test(normalized)||/^não informado$/i.test(normalized))return null
  const match=normalized.match(/(\d{1,2}:\d{2})\s*às\s*(\d{1,2}:\d{2})/)
  if(!match)return null
  const open=toMinutes(match[1]),closeRaw=toMinutes(match[2])
  if(open==null||closeRaw==null||open===closeRaw)return null
  const close=closeRaw===0?1440:closeRaw
  return{open,close,closeLabel:match[2]}
}

function currentDayIndex(date){
  return(date.getDay()+6)%7
}

function readSchedules(root){
  return Array.from(root.querySelectorAll('.mbp-hours-list>div')).slice(0,7).map(row=>({
    label:row.querySelector('span')?.textContent?.trim()||'',
    text:row.querySelector('strong')?.textContent?.trim()||''
  }))
}

function getStatus(schedules,date=new Date()){
  if(schedules.length<7)return{state:'unknown',label:'Horário',detail:'Consulte os horários'}
  const day=currentDayIndex(date)
  const minutes=date.getHours()*60+date.getMinutes()
  const today=parseSchedule(schedules[day]?.text)

  if(today&&today.open<today.close&&minutes>=today.open&&minutes<today.close){
    return{state:'open',label:'Aberto agora',detail:`Fecha às ${schedules[day].text.split('às')[1].trim()}`}
  }

  const previous=(day+6)%7
  const previousSchedule=parseSchedule(schedules[previous]?.text)
  if(previousSchedule&&previousSchedule.close>1440&&minutes<previousSchedule.close-1440){
    return{state:'open',label:'Aberto agora',detail:`Fecha às ${schedules[previous].text.split('às')[1].trim()}`}
  }

  for(let offset=0;offset<7;offset+=1){
    const index=(day+offset)%7
    const schedule=parseSchedule(schedules[index]?.text)
    if(!schedule)continue
    if(offset===0&&minutes>=schedule.open)continue
    return{state:'closed',label:'Fechado agora',detail:`Abre às ${schedules[index].text.split('às')[0].trim()}`,nextDay:DAY_NAMES[index]}
  }
  return{state:'closed',label:'Fechado agora',detail:'Consulte os horários'}
}

function styleClosedPill(pill,isOpen){
  if(!pill)return
  if(isOpen){
    pill.className='mbp-open-pill'
    pill.style.removeProperty('background')
    pill.style.removeProperty('color')
    pill.style.removeProperty('border')
  }else{
    pill.className='mbp-closed-pill'
    pill.style.background='#fff0f0'
    pill.style.color='#b33d3d'
  }
}

function sync(){
  const root=document.querySelector('.mbp-shell')
  const hoursList=root?.querySelector('.mbp-hours-list')
  if(!root||!hoursList)return
  const schedules=readSchedules(root)
  const status=getStatus(schedules)
  if(status.state==='unknown')return

  const sidebarPill=root.querySelector('.mbp-hours-card p span[class*="mbp-"][class*="pill"]')
  if(sidebarPill){
    const next=`● ${status.label}`
    if(sidebarPill.textContent!==next)sidebarPill.textContent=next
    styleClosedPill(sidebarPill,status.state==='open')
    sidebarPill.setAttribute('aria-live','polite')
  }

  const contactCards=root.querySelectorAll('.mbp-contact-grid .mbp-contact-card')
  contactCards.forEach(card=>{
    const icon=card.querySelector('.mbp-contact-icon')?.textContent?.trim()
    if(icon!=='◷')return
    const title=card.querySelector('strong')
    const detail=card.querySelector('small')
    if(title&&title.textContent!==status.label)title.textContent=status.label
    if(detail&&detail.textContent!==status.detail)detail.textContent=status.detail
    card.dataset.hoursState=status.state
  })
}

let observer
let interval
function start(){
  if(observer||interval)return
  const boot=()=>{
    sync()
    observer=new MutationObserver(()=>sync())
    observer.observe(document.body,{childList:true,subtree:true})
    interval=window.setInterval(sync,30000)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true})
  else boot()
}
start()
