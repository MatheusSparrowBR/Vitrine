import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {eventWhenLabel,eventShareCardModel} from '../../src/event-share-card.js'
import {ownerEventStatus,validateEventDraft} from '../../src/owner-event-rules.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const TODAY='2026-10-14'

test('data do evento em uma linha, com intervalo e horário',()=>{
 assert.equal(eventWhenLabel({event_date:'2026-10-18',start_time:'20:00:00'}),'18/10 às 20:00')
 assert.equal(eventWhenLabel({event_date:'2026-10-18',event_end_date:'2026-10-20'}),'18/10 a 20/10')
 assert.equal(eventWhenLabel({event_date:'2026-10-18',event_end_date:'2026-10-18'}),'18/10')
})

test('cartão do evento usa o rótulo EVENTO, o local e o preço',()=>{
 const free=eventShareCardModel({title:'Samba na praça',location:'Praça Central',event_date:'2026-10-18',price:null},{cityName:'Laguna'})
 assert.equal(free.kicker,'EVENTO')
 assert.equal(free.business,'Praça Central')
 assert.equal(free.priceText,'Entrada gratuita')
 assert.equal(free.location,'Laguna · vitrinelocal.net')
 const paid=eventShareCardModel({title:'Show',event_date:'2026-10-18',price:40})
 assert.match(paid.priceText,/40,00/)
})

test('situação do evento para a empresa',()=>{
 assert.deepEqual(ownerEventStatus({review_status:'pending'},TODAY),['Em análise','paused'])
 assert.equal(ownerEventStatus({review_status:'rejected'},TODAY)[0],'Recusado: edite e reenvie')
 assert.equal(ownerEventStatus({review_status:'approved',active:true,event_end_date:'2026-10-20'},TODAY)[0],'Publicado')
 assert.equal(ownerEventStatus({review_status:'approved',active:true,event_end_date:'2026-10-01'},TODAY)[0],'Encerrado')
})

test('validação do evento enviado pela empresa',()=>{
 const ok={title:'Noite do samba',event_date:'2026-10-20',event_end_date:'',price:'',external_url:''}
 assert.equal(validateEventDraft(ok,TODAY),'')
 assert.match(validateEventDraft({...ok,title:'Oi'},TODAY),/mínimo de 3/)
 assert.match(validateEventDraft({...ok,event_date:'2026-10-01'},TODAY),/já passou/)
 assert.match(validateEventDraft({...ok,event_end_date:'2026-10-19'},TODAY),/antes do início/)
 assert.match(validateEventDraft({...ok,external_url:'ingressos.com'},TODAY),/http/)
})

test('migração: aprovação, leitura pela data final, contador e lembretes',()=>{
 const sql=read('supabase/migrations/20261014120000_events_business_link_review_and_reminders.sql')
 assert.match(sql,/add column if not exists business_id uuid references public\.businesses/)
 assert.match(sql,/check \(review_status in \('pending', 'approved', 'rejected'\)\)/)
 assert.match(sql,/using \(active = true and review_status = 'approved' and event_end_date >= current_date\)/)
 assert.match(sql,/create policy "owners submit events"[\s\S]*?public\.business_plan_allows_events\(events\.business_id\)[\s\S]*?events\.review_status = 'pending'/)
 assert.match(sql,/function public\.event_interest_count\(p_event_id uuid\)/)
 assert.match(sql,/create table if not exists public\.event_reminders_sent/)
 assert.match(sql,/'\{"event_publishing": true\}'/)
})

test('lembrete na véspera: agendado, autenticado e sem repetir aviso',()=>{
 const fn=read('supabase/functions/send-event-reminders/index.ts')
 const workflow=read('.github/workflows/event-reminders.yml')
 assert.match(fn,/req\.headers\.get\('Authorization'\) !== `Bearer \$\{cronSecret\}`/)
 assert.match(fn,/timeZone: 'America\/Sao_Paulo'/)
 assert.match(fn,/\.eq\('review_status', 'approved'\)/)
 assert.match(fn,/from\('event_reminders_sent'\)\.insert/)
 assert.ok(fn.indexOf("from('event_reminders_sent').insert")<fn.indexOf('webpush.sendNotification'),'marca antes de enviar')
 assert.match(workflow,/cron: '0 15 \* \* \*'/)
 assert.match(workflow,/send-event-reminders/)
})

test('página do evento: empresa, contador, como chegar e cartão',()=>{
 const page=read('src/EventProfilePage.jsx')
 assert.match(page,/db\.rpc\('event_interest_count',\{p_event_id:event\.id\}\)/)
 assert.match(page,/google\.com\/maps\/dir\/\?api=1&destination=/)
 assert.match(page,/Como chegar/)
 assert.match(page,/<ShareCardButton buildBlob=\{\(\)=>renderEventShareCard\(event/)
 assert.match(page,/Empresa do evento/)
})

test('empresa vê seus eventos, admin aprova e perfil mostra a agenda',()=>{
 assert.match(read('src/AccountWorkspacePage.jsx'),/section==='events'&&<OwnerEventsSection/)
 const admin=read('src/AdminEventsMain.jsx')
 assert.match(admin,/async function review\(row,status\)/)
 assert.match(admin,/Empresa do evento \(opcional\)/)
 assert.match(read('src/ModernBusinessProfilePage.jsx'),/<BusinessEvents businessId=\{business\.id\}/)
 assert.match(read('src/AdminPlansPage.jsx'),/\['event_publishing','Publicação de eventos na agenda'\]/)
})

test('texto do cartão nunca encosta no rodapé, mesmo com título longo',async()=>{
 const {textBlockStart,SHARE_CARD_HEIGHT}=await import('../../src/promotion-share-card.js')
 const full={business:'Porto de Laguna',priceText:'R$ 60,00',validText:'26/12 às 16:00'}
 for(const lines of [1,2,3]){
  const start=textBlockStart(lines,full)
  // Rótulo, título, local, preço e data: a data é a última linha do bloco.
  const dateBaseline=start+70+lines*92+70+70+8
  assert.ok(start<=820,'começa acima da área reservada para a logo')
  assert.ok(dateBaseline<=SHARE_CARD_HEIGHT-245,`linhas=${lines}: data acima do rodapé da logo`)
 }
 assert.equal(textBlockStart(1,{}),820)
})

test('cartão do evento só aparece para admin ou para a empresa dona do evento',()=>{
 const page=read('src/EventProfilePage.jsx')
 assert.match(page,/setCanShareCard\(profile\?\.role==='admin'\|\|Boolean\(owner\?\.owner_id&&owner\.owner_id===user\.id\)\)/)
 assert.match(page,/\{canShareCard&&<ShareCardButton/)
 const css=read('src/event-profile.css')
 assert.match(css,/\.vl-event-profile-page \.vl-event-profile-actions\{display:flex;flex-direction:column/)
})
