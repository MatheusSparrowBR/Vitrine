import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {pickActiveHighlight,highlightView,countdownShort} from '../../src/home-highlight.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const NOW=Date.parse('2026-10-17T12:00:00-03:00')

test('um destaque por vez: dentro do período e o que começou por último',()=>{
 const rows=[
  {event_id:'a',starts_at:'2026-10-10T00:00:00-03:00',ends_at:'2026-10-30T00:00:00-03:00'},
  {event_id:'b',starts_at:'2026-10-15T00:00:00-03:00',ends_at:'2026-10-30T00:00:00-03:00'},
  {event_id:'c',starts_at:'2026-10-20T00:00:00-03:00',ends_at:'2026-10-30T00:00:00-03:00'},
  {event_id:'d',starts_at:'2026-10-01T00:00:00-03:00',ends_at:'2026-10-05T00:00:00-03:00'},
 ]
 assert.equal(pickActiveHighlight(rows,NOW).event_id,'b')
 assert.equal(pickActiveHighlight([],NOW),null)
})

test('evento normal: capa larga do tema, cor de destaque e botão de ingresso quando há link',()=>{
 const view=highlightView({mode:'strip',kind:'event',event:{id:'1',page_slug:'carnaval-2027',title:'Carnaval',image_url:'https://cdn.x/foto.jpg',event_date:'2027-02-10',start_time:'20:00:00',location:'Centro',external_url:'https://ingressos.com/x',page_theme:{enabled:true,bannerUrl:'https://cdn.x/banner.jpg',accent:'#ff0066'}}},'laguna')
 assert.equal(view.imageUrl,'https://cdn.x/banner.jpg')
 assert.equal(view.accent,'#ff0066')
 assert.equal(view.href,'/laguna/evento/carnaval-2027')
 assert.deepEqual(view.cta,{label:'Comprar ingresso',href:'https://ingressos.com/x',external:true})
 assert.equal(view.when,'10/02 às 20:00')
 const noLink=highlightView({mode:'strip',kind:'event',event:{id:'2',title:'Feira',event_date:'2027-02-10'}},'laguna')
 assert.deepEqual(noLink.cta,{label:'Ver evento',href:'/laguna/evento/2',external:false})
})

test('evento em modo Em breve: selo, data de revelação e nada de local',()=>{
 const view=highlightView({mode:'hero',kind:'teaser',event:{id:'3',title:'Surpresa',teaser:{headline:'EM BREVE',accent:'#ffcc00',ticketUrl:''},teaser_reveal_at:'2026-11-20T23:00:00.000Z'}},'laguna')
 assert.equal(view.badge,'EM BREVE')
 assert.equal(view.when,'Revelação em 20/11 às 20:00')
 assert.equal(view.place,'')
 assert.equal(view.cta.label,'Saiba mais')
})

test('evento em Em breve: a capa do evento aparece, não o fundo rosa da página',()=>{
 const cover='https://x.supabase.co/storage/v1/object/public/events-media/abc/cover'
 const background='https://x.supabase.co/storage/v1/object/public/events-media/abc/theme/bg.jpg'
 const withCover=highlightView({mode:'strip',kind:'teaser',event:{id:'4',title:'Bloko',image_url:cover,teaser:{headline:'EM BREVE',background:{imageUrl:background}}}},'laguna')
 assert.equal(withCover.imageUrl,cover)
 const noCover=highlightView({mode:'strip',kind:'teaser',event:{id:'5',title:'Surpresa',teaser:{headline:'EM BREVE',background:{imageUrl:background}}}},'laguna')
 assert.equal(noCover.imageUrl,background)
})

test('contador curto',()=>{
 assert.equal(countdownShort({days:3,hours:4,minutes:10}),'Faltam 3d 4h')
 assert.equal(countdownShort({days:0,hours:5,minutes:30}),'Faltam 5h 30min')
 assert.equal(countdownShort(null),'')
})

test('banco: público só lê destaques no período; só admin cria',()=>{
 const sql=read('supabase/migrations/20261017120000_home_highlights.sql')
 assert.match(sql,/using \(starts_at <= now\(\) and ends_at > now\(\)\)/)
 assert.match(sql,/create policy "admins manage home highlights"[\s\S]*?using \(public\.is_admin\(\)\)[\s\S]*?with check \(public\.is_admin\(\)\)/)
 assert.match(sql,/check \(mode in \('strip', 'hero'\)\)/)
})

test('home e editor ligados',()=>{
 const home=read('src/CityHomePage.jsx')
 assert.match(home,/const highlight=useHomeHighlight\(city\?\.id,city\?\.slug\|\|citySlug\)/)
 assert.match(home,/<HomeHeroTakeoverBg view=\{highlight\}\/>/)
 assert.match(home,/<HomeHeroEventPill view=\{highlight\}\/><span className='lvp-kicker'>/)
 assert.match(home,/<HomeEventStrip view=\{highlight\}\/><section id='categorias'/)
 const editor=read('src/AdminEventPageEditor.jsx')
 assert.match(editor,/<h3>Destaque na home<\/h3>/)
 assert.match(editor,/from\('home_highlights'\)\.upsert\(/)
 assert.match(editor,/from\('home_highlights'\)\.delete\(\)\.eq\('event_id', event\.id\)/)
 assert.match(read('src/home-event-highlight.css'),/\.home-hl-strip-section\{order:1/)
})

test('destaque da home mostra a arte inteira (sem cortar o cartaz) com cópia desfocada atrás',()=>{
 const jsx=read('src/HomeEventHighlight.jsx')
 assert.match(jsx,/className="home-hl-strip-blur"/)
 const css=read('src/home-event-highlight.css')
 assert.match(css,/\.home-hl-strip-image img\{position:relative;width:100%;height:100%;object-fit:contain\}/)
 assert.doesNotMatch(css,/\.home-hl-strip-image img\{width:100%;height:100%;object-fit:cover\}/)
})
