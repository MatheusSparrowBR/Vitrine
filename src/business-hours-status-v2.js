const DAY_NAMES=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']

function minutesOf(value){
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/)
  if(!match)return null
  const h=Number(match[1]),m=Number(match[2])
  return h<=23&&m<=59?h*60+m:null
}

function parseSchedule(text){
  const value=String(text||'').trim()
  if(!value||/^fechado$/i.test(value)||/^não informado$/i.test(value))return null
  const match=value.match(/(\d{1,2}:\d{2})\s*às\s*(\d{1,2}:\d{2})/)
  if(!match)return null
  const open=minutesOf(match[1]),closeRaw=minutesOf(match[2])
  if(open==null||closeRaw==null||open===closeRaw)return null
  return {open,close:closeRaw<=open?closeRaw+1440:closeRaw,openLabel:match[1],closeLabel:match[2]}
}

function dayIndex(date){return(date.getDay()+6)%7}

function schedulesFrom(root){
  return Array.from(root.querySelectorAll('.mbp-hours-list>div')).slice(0,7).map(row=>({
    label:row.querySelector('span')?.textContent?.trim()||'',
    text:row.querySelector('strong')?.textContent?.trim()||''
  }))
}

function statusFor(schedules,date=new Date()){
  if(schedules.length<7)return{state:'unknown',label:'Horário',detail:'Consulte os horários'}
  const today=dayIndex(date)
  const now=date.getHours()*60+date.getMinutes()
  const todaySchedule=parseSchedule(schedules[today]?.text)

  if(todaySchedule){
    if(now>=todaySchedule.open&&now<todaySchedule.close&&todaySchedule.open<1440){
      return{state:'open',label:'Aberto agora',detail:`Fecha às ${todaySchedule.closeLabel}`}
    }
  }

  const previous=(today+6)%7
  const previousSchedule=parseSchedule(schedules[previous]?.text)
  if(previousSchedule&&previousSchedule.close>1440&&now<previousSchedule.close-1440){
    return{state:'open',label:'Aberto agora',detail:`Fecha às ${previousSchedule.closeLabel}`}
  }

  for(let offset=0;offset<7;offset+=1){
    const index=(today+offset)%7
    const schedule=parseSchedule(schedules[index]?.text)
    if(!schedule)continue
    if(offset===0&&now>=Math.min(schedule.open,1439))continue
    return{state:'closed',label:'Fechado agora',detail:`Abre às ${schedule.openLabel}`,nextDay:offset?DAY_NAMES[index]:null}
  }
  return{state:'closed',label:'Fechado agora',detail:'Consulte os horários'}
}

function apply(){
  const root=document.querySelector('.mbp-shell')
  const list=root?.querySelector('.mbp-hours-list')
  if(!root||!list)return false
  const status=statusFor(schedulesFrom(root))
  if(status.state==='unknown')return false

  const pill=root.querySelector('.mbp-hours-card p span[class*="mbp-open-pill"],.mbp-hours-card p span[class*="mbp-closed-pill"]')
  if(pill){
    pill.className=status.state==='open'?'mbp-open-pill':'mbp-closed-pill'
    const text=`● ${status.label}`
    if(pill.textContent!==text)pill.textContent=text
    pill.setAttribute('aria-live','polite')
  }

  root.querySelectorAll('.mbp-contact-grid .mbp-contact-card').forEach(card=>{
    if(card.querySelector('.mbp-contact-icon')?.textContent?.trim()!=='◷')return
    const title=card.querySelector('strong'),detail=card.querySelector('small')
    if(title&&title.textContent!==status.label)title.textContent=status.label
    if(detail&&detail.textContent!==status.detail)detail.textContent=status.detail
    card.dataset.hoursState=status.state
  })
  return true
}

function start(){
  const boot=()=>{
    apply()
    const observer=new MutationObserver(()=>apply())
    observer.observe(document.body,{childList:true,subtree:true})
    window.setInterval(apply,30000)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()
}
start()
