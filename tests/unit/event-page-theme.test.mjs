import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {normalizeEventTheme,youtubeEmbedUrl,safeUrl,hexColor,readableTextOn,contrastRatio,themeStyle,accentWarning,countdownParts,pageSlug,isValidPageSlug,THEME_LIMITS} from '../../src/event-theme.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('YouTube: aceita os formatos comuns e usa o modo de privacidade',()=>{
 const embed='https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
 assert.equal(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'),embed)
 assert.equal(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ'),embed)
 assert.equal(youtubeEmbedUrl('https://youtube.com/shorts/dQw4w9WgXcQ'),embed)
 assert.equal(youtubeEmbedUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ'),embed)
 assert.equal(youtubeEmbedUrl('https://vimeo.com/123'),'')
 assert.equal(youtubeEmbedUrl('https://www.youtube.com/watch?v=<script>'),'')
})

test('links: só http e https; javascript: e outros esquemas são descartados',()=>{
 assert.equal(safeUrl('https://instagram.com/evento'),'https://instagram.com/evento')
 assert.equal(safeUrl('javascript:alert(1)'),'')
 assert.equal(safeUrl('data:text/html,oi'),'')
 assert.equal(safeUrl('não é link'),'')
})

test('cores: só hexadecimal de 6 dígitos, e o texto escolhe o maior contraste',()=>{
 assert.equal(hexColor('#FF0000','#000000'),'#ff0000')
 assert.equal(hexColor('red','#000000'),'#000000')
 assert.equal(hexColor('#fff;background:url(x)','#000000'),'#000000')
 assert.equal(readableTextOn('#0b1424'),'#ffffff')
 assert.equal(readableTextOn('#ffe066'),'#0b1424')
 assert.ok(contrastRatio('#ffffff','#000000')>20)
})

test('normalização: valores ruins viram padrão, listas vazias e itens incompletos somem, limites respeitados',()=>{
 const theme=normalizeEventTheme({enabled:true,background:{type:'video',color:'azul',overlay:9},accent:'x',tickets:[{name:''},{name:'Pista',price:'R$ 60'}],faq:[{q:'Tem estacionamento?',a:''}],gallery:Array.from({length:50},(_,i)=>`https://x.com/${i}.jpg`),links:{instagram:'javascript:x'}})
 assert.equal(theme.enabled,true)
 assert.equal(theme.background.type,'color')
 assert.equal(theme.background.overlay,0.85)
 assert.equal(theme.accent,'#216df3')
 assert.deepEqual(theme.tickets,[{name:'Pista',price:'R$ 60',note:''}])
 assert.deepEqual(theme.faq,[])
 assert.equal(theme.gallery.length,THEME_LIMITS.gallery)
 assert.equal(theme.links.instagram,'')
 assert.equal(normalizeEventTheme(null).enabled,false)
})

test('estilo: foto de fundo com escurecimento e texto branco; cor de destaque com aviso de contraste',()=>{
 const theme=normalizeEventTheme({enabled:true,background:{type:'image',imageUrl:'https://cdn.x/foto.jpg',overlay:0.5},accent:'#ffcc00'})
 const style=themeStyle(theme)
 assert.match(style['--event-bg'],/linear-gradient\(rgba\(5,11,20,0\.5\),rgba\(5,11,20,0\.5\)\), url\("https:\/\/cdn\.x\/foto\.jpg"\)/)
 assert.equal(style['--event-fg'],'#ffffff')
 assert.equal(style['--event-accent-fg'],'#0b1424')
 assert.match(accentWarning(normalizeEventTheme({background:{type:'color',color:'#216df3'},accent:'#2a70f0'})),/muito parecida/)
 assert.equal(accentWarning(normalizeEventTheme({background:{type:'color',color:'#0b1424'},accent:'#ffcc00'})),'')
})

test('contagem regressiva: dias, horas e minutos até o início no fuso de São Paulo',()=>{
 const now=Date.parse('2026-10-15T12:00:00-03:00')
 assert.deepEqual(countdownParts({event_date:'2026-10-17',start_time:'14:30:00'},now),{days:2,hours:2,minutes:30})
 assert.equal(countdownParts({event_date:'2026-10-14'},now),null)
})

test('endereço próprio: formato seguro e válido',()=>{
 assert.equal(pageSlug('Carnaval de Laguna 2027!'),'carnaval-de-laguna-2027')
 assert.equal(isValidPageSlug('carnaval-2027'),true)
 assert.equal(isValidPageSlug('ab'),false)
 assert.equal(isValidPageSlug('Carnaval'),false)
})

test('migração: tema e endereço próprio só pelo admin, endereço único por cidade',()=>{
 const sql=read('supabase/migrations/20261015120000_event_page_theme.sql')
 assert.match(sql,/add column if not exists page_theme jsonb/)
 assert.match(sql,/create unique index if not exists events_city_page_slug_uidx[\s\S]*?where page_slug is not null/)
 assert.match(sql,/if auth\.uid\(\) is null or public\.is_admin\(\) then/)
 assert.match(sql,/new\.page_theme := old\.page_theme/)
 assert.match(sql,/before insert or update on public\.events/)
})

test('página do evento e admin usam o tema',()=>{
 const page=read('src/EventProfilePage.jsx')
 assert.match(page,/const theme=normalizeEventTheme\(event\.page_theme\)/)
 assert.match(page,/style=\{themed\?themeStyle\(theme\):undefined\}/)
 assert.match(page,/\?'id':'page_slug',eventId\)/)
 assert.match(page,/<EventThemeSections theme=\{theme\}/)
 const admin=read('src/AdminEventsMain.jsx')
 assert.match(admin,/🎨 Personalizar página/)
 assert.match(admin,/<AdminEventPageEditor supabase=\{supabase\} event=\{themeEditing\}/)
 const editor=read('src/AdminEventPageEditor.jsx')
 assert.match(editor,/page_theme: normalizeEventTheme\(draft\)/)
 assert.match(editor,/error\.code === '23505'/)
})

test('título fica no cartão branco: cor própria com aviso, e textos do cartão não usam a cor do fundo',async()=>{
 const {titleWarning,DEFAULT_TITLE_COLOR}=await import('../../src/event-theme.js')
 assert.equal(normalizeEventTheme({}).titleColor,DEFAULT_TITLE_COLOR)
 assert.equal(themeStyle(normalizeEventTheme({titleColor:'#7a1f5c'}))['--event-title'],'#7a1f5c')
 assert.match(titleWarning(normalizeEventTheme({titleColor:'#ffffff'})),/clara demais/)
 assert.equal(titleWarning(normalizeEventTheme({titleColor:'#09294d'})),'')
 const css=read('src/event-theme.css')
 assert.match(css,/\.vl-event-profile-title h1\{color:var\(--event-title,#09294d\)\}/)
 assert.doesNotMatch(css,/vl-event-profile-when[^{]*\{color:var\(--event-fg\)/)
 const editor=read('src/AdminEventPageEditor.jsx')
 assert.match(editor,/<Field label="Cor do título"/)
 assert.match(editor,/<div className="vl-event-profile-container"><div className="vl-event-profile-main">/)
})

test('vídeos: até 4 com título; o vídeo antigo vira o primeiro e links que não são do YouTube somem',()=>{
 const legacy=normalizeEventTheme({videoUrl:'https://youtu.be/dQw4w9WgXcQ'})
 assert.deepEqual(legacy.videos,[{url:'https://youtu.be/dQw4w9WgXcQ',title:''}])
 const two=normalizeEventTheme({videos:[{title:'Armandinho',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'},{title:'Veigh',url:'https://youtu.be/9bZkp7q19f0'},{title:'Fora',url:'https://vimeo.com/1'}]})
 assert.deepEqual(two.videos.map(v=>v.title),['Armandinho','Veigh'])
 const many=normalizeEventTheme({videos:Array.from({length:6},()=>({url:'https://youtu.be/dQw4w9WgXcQ'}))})
 assert.equal(many.videos.length,THEME_LIMITS.videos)
 assert.equal('videoUrl' in two,false)
})

test('link de voltar (pílula branca) usa a cor do título, nunca a cor pensada para o fundo',()=>{
 const css=read('src/event-theme.css')
 assert.match(css,/\.vl-event-profile-breadcrumbs a\{color:var\(--event-title,#1f6df2\)\}/)
 assert.doesNotMatch(css,/breadcrumbs a\{color:var\(--event-fg\)\}/)
})

test('página personalizada com contagem: botão de ingressos ao lado do contador e fora da linha de botões',()=>{
 const page=read('src/EventProfilePage.jsx')
 assert.match(page,/<div className="ev-countdown-row"><EventCountdown event=\{event\}\/><a className="ev-countdown-cta" href=\{event\.external_url\}/)
 assert.match(page,/\{event\.external_url&&!\(themed&&theme\.countdown\)&&<a className="vl-event-profile-primary"/)
 assert.match(read('src/event-theme.css'),/\.ev-countdown-cta\{[^}]*background:var\(--event-accent,#216df3\)/)
 assert.match(read('src/AdminEventPageEditor.jsx'),/<div className="ev-countdown-row"><EventCountdown event=\{event\} \/>/)
})

test('onde comer e ficar: só ids válidos, sem repetir, até 8; mapa só com imagem http(s)',()=>{
 const id='6703905f-0028-4859-8dcb-7a88c1069558'
 const theme=normalizeEventTheme({nearby:[{businessId:id.toUpperCase(),note:'Desconto'},{businessId:id},{businessId:'nao-e-uuid'}],venueMap:{imageUrl:'https://cdn.x/mapa.png',caption:'Palco ao fundo'}})
 assert.deepEqual(theme.nearby,[{businessId:id,note:'Desconto'}])
 assert.deepEqual(theme.venueMap,{imageUrl:'https://cdn.x/mapa.png',caption:'Palco ao fundo'})
 const ids=Array.from({length:12},(_,i)=>({businessId:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`}))
 assert.equal(normalizeEventTheme({nearby:ids}).nearby.length,THEME_LIMITS.nearby)
 assert.equal(normalizeEventTheme({venueMap:{imageUrl:'javascript:alert(1)'}}).venueMap.imageUrl,'')
})

test('seções só aparecem com conteúdo: mapa exige imagem e "onde comer" exige empresas ativas',()=>{
 const sections=read('src/EventThemeSections.jsx')
 assert.match(sections,/\{theme\.venueMap\.imageUrl && \(/)
 assert.match(sections,/\{theme\.nearby\.length > 0 && <EventNearbyPlaces/)
 const nearby=read('src/EventNearbyPlaces.jsx')
 assert.match(nearby,/from\('public_business_directory'\)/)
 assert.match(nearby,/if \(!places\.length\) return null/)
 assert.match(nearby,/getOpenStatus\(business\.opening_hours\)/)
 const editor=read('src/AdminEventPageEditor.jsx')
 assert.match(editor,/<h3>Onde comer e ficar<\/h3>/)
 assert.match(editor,/<h3>Mapa de setores<\/h3>/)
 assert.match(editor,/\.eq\('city_id', event\.city_id\)\.eq\('status', 'active'\)/)
})
