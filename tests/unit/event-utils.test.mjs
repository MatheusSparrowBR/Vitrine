import {test} from 'node:test'
import assert from 'node:assert/strict'
import {toPlainText,excerptLines,isFreeEvent,eventSchedule,buildEventIcs,googleCalendarUrl} from '../../src/event-utils.js'

const base={id:'evt-1',title:'Show, especial; noite',event_date:'2026-12-26',event_end_date:'2026-12-26',start_time:'16:00:00',end_time:'03:00:00',location:'Porto de Laguna',address:'',price:null}

test('texto do admin vira texto simples, sem markdown', ()=>{
 const text='## ARMANDINHO + VEIGH ? UMA NOITE\n\nLaguna vai viver uma **noite** histórica!\n* Open food\n* Backstage'
 const plain=toPlainText(text)
 assert.equal(plain.includes('#'),false)
 assert.equal(plain.includes('**'),false)
 assert.match(plain,/ARMANDINHO \+ VEIGH – UMA NOITE/)
 assert.match(plain,/• Open food/)
})

test('"?" usado como separador vira travessa, mas pontuação real fica', ()=>{
 assert.equal(toPlainText('Porto de Laguna ? SC'),'Porto de Laguna – SC')
 assert.equal(toPlainText('Você vai?'),'Você vai?')
})

test('resumo do card usa poucas linhas e sem marcadores', ()=>{
 const excerpt=excerptLines('## TITULO\n\nPrimeira linha\nSegunda linha\nTerceira',2)
 assert.equal(excerpt,'TITULO\nPrimeira linha')
})

test('evento gratuito é quem não tem preço', ()=>{
 assert.equal(isFreeEvent({price:null}),true)
 assert.equal(isFreeEvent({price:0}),true)
 assert.equal(isFreeEvent({price:30}),false)
})

test('horário de término menor que o de início cruza a meia-noite', ()=>{
 const s=eventSchedule(base)
 assert.equal(s.start,'20261226T160000')
 assert.equal(s.end,'20261227T030000')
})

test('evento sem horário vira dia inteiro, com fim exclusivo no dia seguinte', ()=>{
 const s=eventSchedule({...base,start_time:null,end_time:null,event_end_date:'2026-12-27'})
 assert.equal(s.allDay,true)
 assert.equal(s.start,'20261226')
 assert.equal(s.end,'20261228')
})

test('sem horário de término usa 3 horas de duração', ()=>{
 const s=eventSchedule({...base,end_time:null})
 assert.equal(s.end,'20261226T190000')
})

test('arquivo .ics escapa vírgulas e ponto e vírgula do título', ()=>{
 const ics=buildEventIcs(base,{cityName:'Laguna',url:'https://vitrinelocal.net/laguna/evento/evt-1'})
 assert.match(ics,/BEGIN:VCALENDAR/)
 assert.match(ics,/SUMMARY:Show\\, especial\\; noite/)
 assert.match(ics,/DTSTART:20261226T160000/)
 assert.match(ics,/DTEND:20261227T030000/)
 assert.match(ics,/LOCATION:Porto de Laguna\\, Laguna/)
 assert.match(ics,/UID:evt-1@vitrinelocal\.net/)
})

test('link do Google Agenda carrega título, datas e local', ()=>{
 const url=new URL(googleCalendarUrl(base,{cityName:'Laguna'}))
 assert.equal(url.hostname,'calendar.google.com')
 assert.equal(url.searchParams.get('dates'),'20261226T160000/20261227T030000')
 assert.equal(url.searchParams.get('text'),'Show, especial; noite')
 assert.equal(url.searchParams.get('location'),'Porto de Laguna, Laguna')
})
