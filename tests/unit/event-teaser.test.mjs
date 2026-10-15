import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {normalizeTeaser,isTeaserActive,countdownToReveal,revealInputToISO,revealISOToInput,revealLabel,teaserStyle,teaserShareCardImageUrl} from '../../src/event-teaser.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const NOW=Date.parse('2026-10-16T12:00:00-03:00')

test('cartão Em breve prioriza a capa do evento e usa o fundo como alternativa',()=>{
 const cover='https://cdn.example.test/bloko-rosa-capa.png'
 const background='https://cdn.example.test/fundo-evento.png'
 assert.equal(teaserShareCardImageUrl({image_url:cover,teaser:{background:{type:'image',imageUrl:background}}}),cover)
 assert.equal(teaserShareCardImageUrl({image_url:'',teaser:{background:{type:'image',imageUrl:background}}}),background)
 assert.equal(teaserShareCardImageUrl({image_url:null,teaser:{background:{type:'gradient',imageUrl:background}}}),background)
})

test('modo ativo: ligado e antes da revelação automática; manual fica ativo até desligar',()=>{
 assert.equal(isTeaserActive({teaser_enabled:false},NOW),false)
 assert.equal(isTeaserActive({teaser_enabled:true,teaser_auto_reveal:true,teaser_reveal_at:'2026-10-20T20:00:00-03:00'},NOW),true)
 assert.equal(isTeaserActive({teaser_enabled:true,teaser_auto_reveal:true,teaser_reveal_at:'2026-10-10T20:00:00-03:00'},NOW),false)
 assert.equal(isTeaserActive({teaser_enabled:true,teaser_auto_reveal:false,teaser_reveal_at:'2026-10-10T20:00:00-03:00'},NOW),true)
 assert.equal(isTeaserActive({teaser_enabled:true,teaser_auto_reveal:true,teaser_reveal_at:null},NOW),true)
})

test('contador até a revelação e data no horário de Brasília',()=>{
 assert.deepEqual(countdownToReveal('2026-10-18T14:30:00-03:00',NOW),{days:2,hours:2,minutes:30})
 assert.equal(countdownToReveal('2026-10-15T10:00:00-03:00',NOW),null)
 assert.equal(countdownToReveal(null,NOW),null)
 assert.equal(revealLabel('2026-11-20T23:00:00.000Z'),'20/11 às 20:00')
})

test('campo de data e hora converte para ISO e volta igual',()=>{
 const iso=revealInputToISO('2026-11-20T20:00')
 assert.equal(iso,'2026-11-20T23:00:00.000Z')
 assert.equal(revealISOToInput(iso),'2026-11-20T20:00')
 assert.equal(revealInputToISO('ontem'),null)
})

test('configuração da página Em breve é validada e tem padrões',()=>{
 const teaser=normalizeTeaser({headline:'',background:{type:'video',imageUrl:'javascript:x',overlay:3},accent:'amarelo',message:'x'.repeat(500)})
 assert.equal(teaser.headline,'EM BREVE')
 assert.equal(teaser.background.type,'gradient')
 assert.equal(teaser.background.imageUrl,'')
 assert.equal(teaser.background.overlay,0.85)
 assert.equal(teaser.accent,'#f5b841')
 assert.equal(teaser.message.length,220)
 assert.equal(teaserStyle(teaser)['--event-accent'],'#f5b841')
})

test('banco: detalhes escondidos enquanto o modo está ativo; visão pública só com dados seguros',()=>{
 const sql=read('supabase/migrations/20261016120000_event_teaser_mode.sql')
 assert.match(sql,/function public\.event_teaser_active\(p_enabled boolean, p_auto boolean, p_reveal_at timestamptz\)/)
 assert.equal((sql.match(/and not public\.event_teaser_active\(teaser_enabled, teaser_auto_reveal, teaser_reveal_at\)/g)||[]).length,2)
 const view=sql.slice(sql.indexOf('create or replace view public.public_event_teasers'),sql.indexOf('grant select on table public.public_event_teasers'))
 for(const hidden of ['description','location','address','price','event_date','start_time','external_url','page_theme'])assert.doesNotMatch(view,new RegExp(`e\\.${hidden}\\b`),hidden)
 assert.match(sql,/create policy event_favorites_insert_own[\s\S]*?public\.event_is_savable\(event_id\)/)
 assert.match(sql,/new\.teaser_enabled := old\.teaser_enabled/)
 assert.match(sql,/new\.teaser_started_at := now\(\)/)
})

test('página do evento cai na tela Em breve; agenda mostra o card com selo',()=>{
 const page=read('src/EventProfilePage.jsx')
 assert.match(page,/from\('public_event_teasers'\)/)
 assert.match(page,/if\(teaserRow\)return <EventTeaserPage row=\{teaserRow\} city=\{city\}\/>/)
 const list=read('src/EventsPage.jsx')
 assert.match(list,/from\('public_event_teasers'\)/)
 assert.match(list,/⏳ Em breve/)
 assert.match(list,/!events\.length&&!teasers\.length/)
})

test('editor do admin controla o modo; avisos de revelação e lembrete respeitam o sigilo',()=>{
 const editor=read('src/AdminEventPageEditor.jsx')
 assert.match(editor,/<h3>Página Em breve<\/h3>/)
 assert.match(editor,/teaser_enabled: teaserOn, teaser_auto_reveal: teaserAuto, teaser_reveal_at: revealInputToISO\(revealInput\)/)
 assert.match(editor,/<EventTeaserPage preview/)
 const reveal=read('supabase/functions/send-event-reveal-notices/index.ts')
 assert.match(reveal,/\.not\('teaser_started_at', 'is', null\)/)
 assert.match(reveal,/\.is\('teaser_reveal_notified_at', null\)/)
 assert.ok(reveal.indexOf("update({ teaser_reveal_notified_at")<reveal.indexOf('webpush.sendNotification'),'marca antes de enviar')
 assert.match(read('supabase/functions/send-event-reminders/index.ts'),/if \(teaserOn\) continue/)
 assert.match(read('.github/workflows/event-reveal-notices.yml'),/cron: '5 \* \* \* \*'/)
})

test('cartão Em breve: selo, nome e data de revelação; sem local nem preço',async()=>{
 const {teaserShareCardModel}=await import('../../src/event-teaser.js')
 const model=teaserShareCardModel({title:'Carnaval 2027',teaser:{headline:'EM BREVE'},teaser_reveal_at:'2026-11-20T23:00:00.000Z'},'Laguna')
 assert.equal(model.kicker,'EM BREVE')
 assert.equal(model.title,'Carnaval 2027')
 assert.equal(model.validText,'Revelação em 20/11 às 20:00')
 assert.equal(model.location,'Laguna · vitrinelocal.net')
 assert.equal(model.business,'')
 assert.equal(model.priceText,'')
 assert.equal(teaserShareCardModel({title:'X'}).validText,'Novidades em breve')
 const page=read('src/EventTeaserPage.jsx')
 assert.match(page,/<ShareCardButton\s+buildBlob=\{\(\) => renderTeaserShareCard\(row, city\.name\)\}/)
 assert.doesNotMatch(page,/async function share\(\)/)
})
