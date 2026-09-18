import React,{useEffect,useMemo,useState} from 'react'
import {supabase as db} from './supabase-client.js'
import './launch-home-preview.css'

const slugify=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')

const iconFor=name=>({Restaurantes:'🍽️',Supermercado:'🛒',Conveniência:'🏪',Academia:'🏋️',Lojas:'🛍️',Cafés:'☕',Saúde:'❤️',Beleza:'✨',Serviços:'🔧',Automóveis:'🚗',Imóveis:'🏠',Pets:'🐾',Turismo:'🧭',Outros:'✦'}[name]||'✦')
const fallbackCats=[
 ['🍽️','Restaurantes'],['🛒','Supermercado'],['🏪','Conveniência'],['🏋️','Academia'],['🛍️','Lojas'],['❤️','Saúde'],['✨','Beleza'],['🔧','Serviços'],['🚗','Automóveis'],['🏠','Imóveis'],['🐾','Pets'],['🧭','Turismo'],['✦','Outros']
]

const fallbackBusinesses=[{name:'Bistrô Laguna - Teste',cat:'Restaurantes',rating:'',place:'MAGALHÃES',img:'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=82'}]
const fallbackPromotionData=[{business:'Bistrô Laguna - Teste',title:'Festival de Sabores — 20% OFF',desc:'Aproveite 20% de desconto em pratos selecionados.',price:'R$ 24,90',old:'R$ 31,13',badge:'20% OFF',img:'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82'}]
const fallbackEvents=[{date:'24',mon:'SET',title:'Noite de Música ao Vivo - Bistrô Laguna',place:'Bistrô Laguna',time:'20:00'}]

function PreviewHeader(){
 return <header className="lvp-header">
  <div className="lvp-header-inner">
   <a className="lvp-logo" href="/laguna"><img src="/vitrine-local-header-logo.svg" alt="VitrineLocal"/></a>
   <a className="lvp-city" href="/laguna" aria-label="Abrir Laguna - SC">⌖ <span>Laguna - SC</span><b>⌄</b></a>
   <nav className="lvp-nav">
    <a className="active" href="#explorar">Explorar</a><a href="#promocoes">Promoções</a><a href="#eventos">Eventos</a><a href="#categorias">Categorias</a>
   </nav>
   <div className="lvp-actions"><a href="/login">Entrar</a><a className="lvp-business" href="/conta?new=business">Cadastrar empresa</a></div>
  </div>
 </header>
}

function LaunchHomePreview(){
 const [q,setQ]=useState('')
 const [cats,setCats]=useState(()=>fallbackCats)
 const [catStart,setCatStart]=useState(0)
 const [today,setToday]=useState(()=>new Date())
 const [weather,setWeather]=useState(null)
 const [weatherLoading,setWeatherLoading]=useState(true)
 const [businesses,setBusinesses]=useState(()=>fallbackBusinesses)
 const [promotions,setPromotions]=useState(()=>fallbackPromotionData)
 const [events,setEvents]=useState(()=>fallbackEvents)
 const [sponsored,setSponsored]=useState(()=>fallbackPromotionData[0])
 useEffect(()=>{
  const tick=()=>setToday(new Date())
  tick()
  const dateTimer=setInterval(tick,60*1000)
  return()=>clearInterval(dateTimer)
 },[])
 useEffect(()=>{
  let live=true
  const loadCategories=async()=>{
   if(!db){setCats(fallbackCats);return}
   try{
    const{data,error}=await db.from('categories').select('name,icon').eq('active',true).order('sort_order').order('name')
    if(!live)return
    if(error||!data?.length){setCats(fallbackCats);return}
    setCats(data.map(row=>[row.icon||iconFor(row.name),row.name]))
   }catch{if(live)setCats(fallbackCats)}
  }
  loadCategories()
  return()=>{live=false}
 },[])
 useEffect(()=>setCatStart(start=>Math.min(start,Math.max(0,cats.length-7))),[cats.length])
 useEffect(()=>{
  let live=true
  const loadHomeData=async()=>{
   if(!db)return
   try{
    const{data:city}=await db.from('cities').select('id').eq('slug','laguna').eq('active',true).maybeSingle()
    if(!city||!live)return
    const{data:bs}=await db.from('public_business_directory').select('id,name,slug,short_description,cover_url,logo_url,neighborhood,verified,featured,category_name,category_slug').eq('city_id',city.id).order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(4)
    if(live&&bs?.length){
     const ids=bs.map(b=>b.slug).filter(Boolean)
     const ratings={}
     for(const b of bs){
      const{data:rs}=await db.from('business_reviews').select('rating').eq('business_id',b.id)
      if(rs?.length)ratings[b.slug]=(rs.reduce((sum,r)=>sum+Number(r.rating||0),0)/rs.length).toFixed(1).replace('.',',')
     }
     setBusinesses(bs.map(b=>({name:b.name,slug:b.slug,cat:b.category_name||'Outros',rating:ratings[b.slug]||'',place:b.neighborhood||'Laguna',img:b.cover_url||b.logo_url||''})))
    }
    const{data:ps}=await db.from('promotions').select('id,title,description,image_url,price,original_price,business_id,starts_at,ends_at,businesses!inner(name,city_id)').eq('status','published').eq('businesses.city_id',city.id).order('created_at',{ascending:false}).limit(3)
    if(live&&ps?.length){
     const mapped=ps.map(p=>({id:p.id,business:p.businesses?.name||'Empresa local',title:p.title,desc:p.description||'Oferta disponível.',price:p.price!=null?'R$ '+Number(p.price).toFixed(2).replace('.',','):'Confira',old:p.original_price!=null?'R$ '+Number(p.original_price).toFixed(2).replace('.',','):'',badge:p.original_price&&p.price?Math.max(0,Math.round((1-Number(p.price)/Number(p.original_price))*100))+'% OFF':'OFERTA',img:p.image_url||''}))
     setPromotions(mapped)
     setSponsored(mapped[0])
    }
    const{data:es}=await db.from('events').select('title,event_date,start_time,location,address').eq('city_id',city.id).eq('active',true).gte('event_date',new Date().toISOString().slice(0,10)).order('event_date').order('start_time').limit(3)
    if(live&&es?.length)setEvents(es.map(e=>{const d=new Date(e.event_date+'T12:00:00');return {date:String(d.getDate()).padStart(2,'0'),mon:new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(d).replace('.','').toUpperCase(),title:e.title,place:e.location||e.address||'Laguna',time:e.start_time?String(e.start_time).slice(0,5):'Confira'}}))
   }catch{}
  }
  loadHomeData()
  return()=>{live=false}
 },[])
 useEffect(()=>{
  let live=true
  const load=async()=>{
   try{
    const geo=await fetch('https://geocoding-api.open-meteo.com/v1/search?name=Laguna&count=5&language=pt&format=json&countryCode=BR').then(r=>r.json())
    const match=(geo.results||[]).find(x=>String(x.name||'').toLowerCase()==='laguna'&&String(x.admin1||'').toLowerCase().includes('santa catarina'))||(geo.results||[])[0]
    if(!match?.latitude||!match?.longitude)throw new Error('weather')
    const data=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(match.latitude)+'&longitude='+encodeURIComponent(match.longitude)+'&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=celsius&timezone=America%2FSao_Paulo').then(r=>r.json())
    if(!live)return
    setWeather(data.current||null)
   }catch{if(live)setWeather(null)}finally{if(live)setWeatherLoading(false)}
  }
  load()
  const timer=setInterval(load,10*60*1000)
  return()=>{live=false;clearInterval(timer)}
 },[])
 const visibleCats=cats.slice(catStart,catStart+7)
 const dateLabel=useMemo(()=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(today).replace('.','').toUpperCase(),[today])
 return <div className="lvp-page">
  <PreviewHeader/>
  <main>
   <section className="lvp-hero">
    <div className="lvp-hero-bg"></div>
    <div className="lvp-hero-inner">
     <div className="lvp-hero-copy">
      <span className="lvp-kicker">✦ A cidade na palma da mão</span>
      <h1>Descubra o que <span>Laguna</span> tem de melhor.</h1>
      <p>Encontre empresas, serviços, promoções e eventos perto de você — tudo em um só lugar.</p>
      <form className="lvp-search" onSubmit={e=>{e.preventDefault();const term=q.trim();location.href=`/laguna/empresas${term?`?q=${encodeURIComponent(term)}`:''}`}}>
       <span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="O que você procura hoje?"/><button>Buscar</button>
      </form>
      <div className="lvp-quick">
       {['Restaurantes','Serviços','Beleza','Mercados'].map(x=><a key={x} href={`/laguna/empresas?categoria=${encodeURIComponent(slugify(x==='Mercados'?'Supermercado':x))}`}>{x}</a>)}
      </div>
      <div className="lvp-note">● Catálogo local de Laguna · atualizado por negócios da cidade.</div>
     </div>
     <aside className="lvp-hero-card">
      <div className="lvp-mini-head"><span>HOJE EM LAGUNA</span><strong>{dateLabel}</strong></div>
      <div className="lvp-weather"><span className="lvp-weather-icon">{weatherLoading?'◌':'🌤️'}</span><div><b>{weatherLoading?'Carregando clima…':weather?.temperature_2m!=null?`${Math.round(weather.temperature_2m)}°C`:'Clima indisponível'}</b><small>{weather?.apparent_temperature!=null?`Laguna · sensação ${Math.round(weather.apparent_temperature)}°C`:'Atualização em tempo real'}</small></div><span className="lvp-live-dot">AO VIVO</span></div><div className="lvp-mini-stat"><span className="lvp-mini-icon">🏪</span><div><b>Empresas locais</b><small>Encontre serviços, lojas e negócios</small></div></div>
      <div className="lvp-mini-stat"><span className="lvp-mini-icon">🏷️</span><div><b>Ofertas ativas</b><small>Promoções para aproveitar hoje</small></div></div>
      <div className="lvp-mini-stat"><span className="lvp-mini-icon">📅</span><div><b>Eventos próximos</b><small>O que acontece na cidade</small></div></div>
      <a className="lvp-mini-cta" href="/laguna/empresas">Explorar Laguna →</a>
     </aside>
    </div>
   </section>

   <section id="categorias" className="lvp-wrap lvp-categories">
    <div className="lvp-section-head"><div><span className="lvp-eyebrow">EXPLORE</span><h2>Encontre por categoria</h2><p>Descubra negócios de acordo com o que você precisa.</p></div><a href="/laguna/empresas">Ver todas →</a></div>
    <div className="lvp-cat-box">
      <button className="lvp-arrow" onClick={()=>setCatStart(Math.max(0,catStart-1))} disabled={catStart===0}>‹</button>
      <div className="lvp-cat-grid">{visibleCats.map(([icon,label])=><a href={`/laguna/empresas?categoria=${encodeURIComponent(slugify(label))}`} key={label}><span>{icon}</span><b>{label}</b></a>)}</div>
      <button className="lvp-arrow" onClick={()=>setCatStart(Math.min(cats.length-7,catStart+1))} disabled={catStart>=cats.length-7}>›</button>
    </div>
    <div className="lvp-category-count">{cats.length} categorias disponíveis</div>
   </section>

   <section className="lvp-wrap lvp-sponsored-wrap">
    <a className="lvp-sponsored" href="/laguna/promocoes">
      <div className="lvp-sponsored-image"><img src={sponsored.img||'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=84'} alt="Destaque patrocinado"/></div>
      <div className="lvp-sponsored-copy">
       <span className="lvp-sponsored-label">DESTAQUE PATROCINADO</span>
       <h2>{sponsored.title} · {sponsored.business}</h2>
       <p>{sponsored.desc}</p>
       <strong>Ver destaque →</strong>
      </div>
      <span className="lvp-sponsored-badge">{sponsored.badge}</span>
    </a>
   </section>

   <section id="explorar" className="lvp-wrap lvp-featured">
    <div className="lvp-section-head"><div><span className="lvp-eyebrow">DESCUBRA NEGÓCIOS</span><h2>Empresas em destaque</h2><p>Conheça lugares e profissionais que fazem Laguna acontecer.</p></div><a href="/laguna/empresas">Ver todas →</a></div>
    <div className="lvp-business-grid">{businesses.map(b=><a href={b.slug?`/laguna/empresa/${encodeURIComponent(b.slug)}`:`/laguna/empresas?categoria=${encodeURIComponent(slugify(b.cat))}`} className="lvp-business-card" key={b.name}>
      <div className="lvp-business-image"><img src={b.img} alt=""/><span className="lvp-verified">✓ Verificada</span></div>
      <div className="lvp-business-body"><span className="lvp-card-cat">{b.cat}</span><h3>{b.name}</h3><p>{b.rating&&<>⭐ {b.rating} · </>}📍 {b.place}</p><span className="lvp-card-link">Ver empresa →</span></div>
    </a>)}</div>
   </section>

   <section className="lvp-wrap lvp-needs">
    <div className="lvp-section-head"><div><span className="lvp-eyebrow">DO JEITO QUE VOCÊ PENSA</span><h2>O que você precisa hoje?</h2><p>Comece pela necessidade e descubra opções locais.</p></div></div>
    <div className="lvp-need-grid">
     <a href="/laguna/empresas?categoria=restaurantes"><span>🍽️</span><b>Quero comer</b><small>Restaurantes · Cafés · Lanches</small></a>
     <a href="/laguna/empresas?categoria=lojas"><span>🛍️</span><b>Quero comprar</b><small>Lojas · Mercado · Conveniência</small></a>
     <a href="/laguna/empresas?categoria=servicos"><span>🔧</span><b>Preciso resolver</b><small>Serviços · Oficinas · Assistência</small></a>
     <a href="/laguna/empresas?categoria=beleza"><span>💆</span><b>Quero cuidar de mim</b><small>Beleza · Saúde · Bem-estar</small></a>
    </div>
   </section>

   <section id="promocoes" className="lvp-soft">
    <div className="lvp-wrap">
     <div className="lvp-section-head"><div><span className="lvp-eyebrow">APROVEITE</span><h2>Ofertas perto de você</h2><p>Economize nas empresas locais.</p></div><a href="/laguna/promocoes">Ver todas →</a></div>
     <div className="lvp-promo-grid">{promotions.map(p=><a href="/laguna/promocoes" className="lvp-promo-card" key={p.title}>
      <div className="lvp-promo-image"><img src={p.img} alt=""/><strong>{p.badge}</strong></div>
      <div className="lvp-promo-body"><span>{p.business}</span><h3>{p.title}</h3><p>{p.desc}</p><div className="lvp-price">{p.price}{p.old&&<del>{p.old}</del>}</div><b>Ver oferta →</b></div>
     </a>)}</div>
    </div>
   </section>

   <section id="eventos" className="lvp-wrap lvp-events">
    <div className="lvp-section-head"><div><span className="lvp-eyebrow">AGENDA LOCAL</span><h2>O que está acontecendo em Laguna</h2><p>Eventos para aproveitar a cidade nos próximos dias.</p></div><a href="/laguna/eventos">Ver agenda →</a></div>
    <div className="lvp-event-list">{events.map(e=><a className="lvp-event" href="/laguna/eventos" key={e.title}><div className="lvp-date"><b>{e.date}</b><span>{e.mon}</span></div><div><h3>{e.title}</h3><p>📍 {e.place} · 🕐 {e.time}</p></div><span className="lvp-event-arrow">→</span></a>)}</div>
   </section>

   <section className="lvp-discover">
    <div className="lvp-wrap"><div className="lvp-section-head"><div><span className="lvp-eyebrow">DESCUBRA LAGUNA</span><h2>Mais motivos para voltar</h2><p>Lugares, dicas e novidades que dão vida à cidade.</p></div><a href="/laguna">Ver novidades →</a></div>
     <div className="lvp-story-grid"><article><div className="lvp-story-image s1"></div><span>GUIA LOCAL</span><h3>5 lugares para conhecer neste fim de semana</h3><p>Dicas para aproveitar Laguna como quem conhece a cidade.</p></article><article><div className="lvp-story-image s2"></div><span>NOVIDADE</span><h3>Novos negócios que chegaram à cidade</h3><p>Descubra empresas e serviços que estão começando por aqui.</p></article><article><div className="lvp-story-image s3"></div><span>EXPERIÊNCIA</span><h3>Onde comer, comprar e passear em Laguna</h3><p>Um jeito simples de encontrar tudo em um só lugar.</p></article></div>
    </div>
   </section>

   <section id="empresa" className="lvp-business-cta-section">
    <div className="lvp-wrap lvp-business-cta-wrap"><div><span className="lvp-eyebrow">PARA EMPRESAS</span><h2>Sua empresa precisa ser encontrada.</h2><p>Crie seu espaço no VitrineLocal e coloque seu negócio na frente de quem está procurando o que você oferece.</p><div className="lvp-business-points"><span>✓ Perfil da empresa</span><span>✓ Produtos e serviços</span><span>✓ Promoções</span><span>✓ Mais visibilidade</span></div></div><a href="/conta?new=business" className="lvp-business-cta-button">Cadastrar minha empresa →</a></div>
   </section>
  </main>
  <footer className="lvp-footer"><div className="lvp-wrap lvp-footer-grid"><div><img src="/vitrine-local-header-logo.svg" alt="VitrineLocal"/><p>A cidade em um só lugar.</p></div><div><b>Explorar</b><a href="#explorar">Empresas</a><a href="#promocoes">Promoções</a><a href="#eventos">Eventos</a><a href="#categorias">Categorias</a></div><div><b>Para empresas</b><a href="/conta?new=business">Cadastrar empresa</a><a href="/conta/publicidade">Publicidade</a><a href="/planos">Planos</a></div><div><b>VitrineLocal</b><a href="/laguna">Sobre</a><a href="mailto:contato@vitrinelocal.net">Contato</a><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a></div></div><div className="lvp-footer-bottom">© 2026 VitrineLocal · Laguna, SC</div></footer>
 </div>
}

export default LaunchHomePreview
