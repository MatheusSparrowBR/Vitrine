export const DAYS = [
  ['monday','Segunda'],
  ['tuesday','Terça'],
  ['wednesday','Quarta'],
  ['thursday','Quinta'],
  ['friday','Sexta'],
  ['saturday','Sábado'],
  ['sunday','Domingo']
]

export const DAY_KEYS = DAYS.map(([key])=>key)
const EMPTY_PERIOD=()=>({open:'',close:''})

function normalizePeriod(period){
  const source=period&&typeof period==='object'?period:{}
  return {open:String(source.open||''),close:String(source.close||'')}
}

export function normalizeDay(value){
  const source=value&&typeof value==='object'?value:{}
  const periods=Array.isArray(source.periods)
    ? source.periods.slice(0,2).map(normalizePeriod)
    : [
        normalizePeriod({open:source.open,close:source.close}),
        normalizePeriod({open:source.breakOpen??source.open2??'',close:source.breakClose??source.close2??''})
      ]
  while(periods.length<2)periods.push(EMPTY_PERIOD())
  return {closed:Boolean(source.closed),periods}
}

export function normalizeHours(value){
  const source=value&&typeof value==='object'?value:{}
  return Object.fromEntries(DAYS.map(([key])=>[key,normalizeDay(source[key])]))
}

function toMinutes(value){
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/)
  if(!match)return null
  const hours=Number(match[1]),minutes=Number(match[2])
  return hours<=23&&minutes<=59?hours*60+minutes:null
}

function parsePeriods(day){
  if(!day||day.closed)return[]
  return normalizeDay(day).periods.map(period=>{
    const open=toMinutes(period.open),closeRaw=toMinutes(period.close)
    if(open==null||closeRaw==null||open===closeRaw)return null
    return {open,close:closeRaw<=open?closeRaw+1440:closeRaw,openLabel:period.open,closeLabel:period.close}
  }).filter(Boolean)
}

export function formatHours(value){
  const hours=normalizeHours(value)
  return DAYS.map(([key,label])=>{
    const day=hours[key]
    if(day.closed)return{key,label,text:'Fechado',closed:true}
    const periods=day.periods.filter(period=>period.open&&period.close)
    if(!periods.length)return{key,label,text:'Não informado',closed:false}
    return{key,label,text:periods.map(period=>period.open+' - '+period.close).join(' - '),closed:false}
  })
}

export function getOpenStatus(value,date=new Date()){
  const hours=normalizeHours(value)
  const index=(date.getDay()+6)%7
  const now=date.getHours()*60+date.getMinutes()
  const todayPeriods=parsePeriods(hours[DAY_KEYS[index]])
  for(const period of todayPeriods){
    if(period.open<1440&&now>=period.open&&now<period.close)
      return{open:true,label:'Aberto agora',detail:'Fecha às '+period.closeLabel}
  }
  const previousIndex=(index+6)%7
  const previousPeriods=parsePeriods(hours[DAY_KEYS[previousIndex]])
  for(const period of previousPeriods){
    if(period.close>1440&&now<period.close-1440)
      return{open:true,label:'Aberto agora',detail:'Fecha às '+period.closeLabel}
  }
  for(let offset=0;offset<7;offset+=1){
    const target=(index+offset)%7
    const periods=parsePeriods(hours[DAY_KEYS[target]])
    for(const period of periods){
      if(offset===0&&now>=period.open)continue
      return{open:false,label:'Fechado agora',detail:offset===0?'Reabre às '+period.openLabel:'Abre às '+period.openLabel}
    }
  }
  return{open:false,label:'Fechado agora',detail:'Consulte os horários'}
}