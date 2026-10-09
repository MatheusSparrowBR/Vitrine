// Utilitários dos eventos: texto legível (sem markdown) e exportação para agenda.

// Converte o texto digitado no admin em texto simples, linha a linha.
// - remove marcadores de título (#, ##, ###) e negrito (**)
// - transforma "* item" em "• item"
// - troca " ? " (caractere perdido no cadastro) por " – "
export function toPlainText(text){
  return String(text||'')
    .split(/\r?\n/)
    .map(line=>line
      .replace(/^\s*#{1,6}\s+/,'')
      .replace(/^\s*\*\s+/,'• ')
      .replace(/\*\*(.+?)\*\*/g,'$1')
      .replace(/\s\?\s/g,' – ')
      .trim())
    .join('\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim()
}

// Primeiras linhas com conteúdo, para o resumo do card.
export function excerptLines(text,max=2){
  return toPlainText(text).split('\n').filter(Boolean).slice(0,max).join('\n')
}

// Valores de preço: vazio ou zero significa gratuito.
export function isFreeEvent(event){
  return event?.price==null||Number(event.price)===0
}

// Próximo dia no formato YYYY-MM-DD.
function nextDay(dateISO){
  const d=new Date(`${dateISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate()+1)
  return d.toISOString().slice(0,10)
}

// Data e hora sem fuso ("YYYYMMDDTHHMMSS"): a agenda usa o fuso do aparelho.
function floatingDateTime(dateISO,time){
  const day=dateISO.replace(/-/g,'')
  if(!time)return day
  const [h='00',m='00']=String(time).split(':')
  return `${day}T${h.padStart(2,'0')}${m.padStart(2,'0')}00`
}

// Início e fim do evento. Horário de término menor que o de início (ex.: 16:00–03:00)
// significa que o evento termina no dia seguinte.
export function eventSchedule(event){
  const startDate=event.event_date
  const endDate=event.event_end_date||event.event_date
  if(!event.start_time){
    // Evento de dia inteiro: DTEND é exclusivo, então o fim é o dia seguinte ao último dia.
    return {allDay:true,start:startDate.replace(/-/g,''),end:nextDay(endDate).replace(/-/g,'')}
  }
  const start=floatingDateTime(startDate,event.start_time)
  let endISO=endDate
  if(event.end_time){
    const crossesMidnight=endDate===startDate&&String(event.end_time)<=String(event.start_time)
    if(crossesMidnight)endISO=nextDay(endDate)
    return {allDay:false,start,end:floatingDateTime(endISO,event.end_time)}
  }
  // Sem horário de término: considera 3 horas de duração.
  const [h,m]=String(event.start_time).split(':').map(Number)
  const endHour=(h+3)%24
  const crossed=h+3>=24
  return {allDay:false,start,end:floatingDateTime(crossed?nextDay(endDate):endISO,`${String(endHour).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`)}
}

const icsEscape=value=>String(value||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')

// Conteúdo de um arquivo .ics (abre no Google Agenda, Apple Calendar e Outlook).
export function buildEventIcs(event,{cityName='',url=''}={}){
  const schedule=eventSchedule(event)
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')
  const where=[event.location,event.address,cityName].filter(Boolean).join(', ')
  const dateLine=schedule.allDay?`DTSTART;VALUE=DATE:${schedule.start}\r\nDTEND;VALUE=DATE:${schedule.end}`:`DTSTART:${schedule.start}\r\nDTEND:${schedule.end}`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VitrineLocal//Agenda//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@vitrinelocal.net`,
    `DTSTAMP:${stamp}`,
    dateLine,
    `SUMMARY:${icsEscape(event.title)}`,
    where?`LOCATION:${icsEscape(where)}`:'',
    `DESCRIPTION:${icsEscape(excerptLines(event.description,6)||event.title)}`,
    url?`URL:${url}`:'',
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].filter(Boolean).join('\r\n')
}

// Link "Adicionar ao Google Agenda".
export function googleCalendarUrl(event,{cityName='',url=''}={}){
  const schedule=eventSchedule(event)
  const where=[event.location,event.address,cityName].filter(Boolean).join(', ')
  const params=new URLSearchParams({
    action:'TEMPLATE',
    text:event.title||'Evento',
    dates:`${schedule.start}/${schedule.end}`,
    details:[excerptLines(event.description,6),url].filter(Boolean).join('\n\n'),
    location:where
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
