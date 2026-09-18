import React,{useEffect,useMemo,useState}from'react'
import{supabase as db}from'./supabase-client.js'
import SiteHeader from'./SiteHeader.jsx'
import'./launch-home-preview.css'

const slugify=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
const iconFor=name=>({Restaurantes:'🍽️',Supermercado:'🛒',Conveniência:'🏪',Academia:'🏋️',Lojas:'🛍️',Cafés:'☕',Saúde:'❤️',Beleza:'✨',Serviços:'🔧',Automóveis:'🚗',Imóveis:'🏠',Pets:'🐾',Turismo:'🧭',Outros:'✦'}[name]||'✦')
const weatherLabel=code=>({0:'Céu limpo',1:'Principalmente limpo',2:'Parcialmente nublado',3:'Nublado',45:'Neblina',48:'Neblina',51:'Garoa',53:'Garoa',55:'Garoa',61:'Chuva fraca',63:'Chuva moderada',65:'Chuva forte',80:'Pancadas de chuva',81:'Pancadas de chuva',82:'Pancadas de chuva',95:'Trovoada',96:'Trovoada',99:'Trovoada'}[Number(code)]||'Condições atuais')

function EmptyPanel({title,text,href,label}){return <div className="lvp-empty-panel"><h3>{title}</h3><p>{text}</p>{href&&<a href={href}>{label||'Ver mais →'}</a>}</div>}

function LaunchHomePreview(){
 const[q,setQ]=useState(''),[cats,setCats]=useState([]),[catStart,setCatStart]=useState(0),[mobileCats,setMobileCats]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width:760px)').matches)
 const[today,setToday]=useState(()=>new Date()),[weather,setWeather]=useState(null),[weatherLoading,setWeatherLoading]=useState(true)
 const[businesses,setBusinesses]=useState([]),[promotions,setPromotions]=useState([]),[events,setEvents]=useState([]),[sponsored,setSponsored]=useState(null),[stories,setStories]=useState([])
 const[stats,setStats]=useState({businesses:0,promotions:0,events:0}),[dataError,setDataError]=useState(false)

 useEffect(()=>{const tick=()=>setToday(new Date());tick();const t=setInterval(tick,60000);return()=>clearInterval(t)},[])
 useEffect(()=>{
  let live=true
  ;(async()=>{
   if(!db){if(live)setDataError(true);return}
   try{
    const{data,error}=await db.from('categories').select('name,icon').eq('active',true).order('sort_order').order('name')
    if(!live)return
    if(error){setDataError(true);setCats([]);return}
    setCats((data||[]).map(row=>[row.icon||iconFor(row.name),row.name]))
   }catch{if(live){setDataError(true);setCats([])}}
  })()
  return()=>{live=false}
 },[])
 useEffect(()=>{const m=window.matchMedia('(max-width:760px)'),sync=()=>setMobileCats(m.matches);sync();m.addEventListener?.('change',sync);return()=>m.removeEventListener?.('change',sync)},[])
 useEffect(()=>{const per=mobileCats?6:7;setCatStart(start=>Math.min(start,Math.max(0,cats.length-per)))},[cats.length,mobileCats])

 useEffect(()=>{
  let live=true
  ;(async()=>{
   if(!db){if(live)setDataError(true);return}
   try{
    const{data:city,error:cityError}=await db.from('cities').select('id,name,state,slug').eq('slug','laguna').eq('active',true).maybeSingle()
    if(cityError||!city){if(live)setDataError(true);return}
    const now=new Date().toISOString(),todayKey=new Date().toISOString().slice(0,10)
    const[bsRes,psRes,esRes,adsRes,postsRes]=await Promise.all([
      db.from('public_business_directory').select('id,name,slug,short_description,cover_url,logo_url,neighborhood,verified,featured,category_name,category_slug').eq('city_id',city.id).order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(4),
      db.from('promotions').select('id,title,description,image_url,price,original_price,business_id,starts_at,ends_at,businesses!inner(name,city_id,cover_url,logo_url)').eq('status','published').eq('businesses.city_id',city.id).lte('starts_at',now).gte('ends_at',now).order('created_at',{ascending:false}).limit(3),
      db.from('events').select('id,title,event_date,start_time,location,address').eq('city_id',city.id).eq('active',true).gte('event_date',todayKey).order('event_date').order('start_time').limit(3),
      db.from('advertisements').select('id,title,description,image_url,target_url,starts_at,ends_at,placement,priority').eq('city_id',city.id).eq('active',true).lte('starts_at',now).gte('ends_at',now).order('priority',{ascending:false}).limit(1),
      db.from('posts').select('id,title,content,image_url,type,published_at,created_at').eq('city_id',city.id).eq('status','published').order('published_at',{ascending:false}).order('created_at',{ascending:false}).limit(3)
    ])
    if(!live)return
    if(bsRes.error||psRes.error||esRes.error||adsRes.error||postsRes.error)setDataError(true)
    const bs=bsRes.data||[],ps=psRes.data||[],es=esRes.data||[],ads=adsRes.data||[],posts=postsRes.data||[]
    const ratings={}
    if(bs.length){
      const{data:rs}=await db.from('business_reviews').select('business_id,rating').eq('status','published').in('business_id',bs.map(b=>b.id))
      for(const r of rs||[])(ratings[r.business_id]??=[]).push(Number(r.rating||0))
    }
    setBusinesses(bs.map(b=>({id:b.id,name:b.name,slug:b.slug,verified:b.verified,cat:b.category_name||'Outros',rating:ratings[b.id]?.length?(ratings[b.id].reduce((a,v)=>a+v,0)/ratings[b.id].length).toFixed(1).replace('.',','):'',place:b.neighborhood||'Laguna',img:b.cover_url||b.logo_url||''})))
    setPromotions(ps.map(p=>({id:p.id,business:p.businesses?.name||'Empresa local',title:p.title,desc:p.description||'',price:p.price!=null?'R$ '+Number(p.price).toFixed(2).replace('.',','):'Confira',old:p.original_price!=null?'R$ '+Number(p.original_price).toFixed(2).replace('.',','):'',badge:p.original_price&&p.price?Math.max(0,Math.round((1-Number(p.price)/Number(p.original_price))*100))+'% OFF':'OFERTA',img:p.image_url||p.businesses?.cover_url||p.businesses?.logo_url||''})))
    setEvents(es.map(e=>{const d=new Date(e.event_date+'T12:00:00');return{id:e.id,date:String(d.getDate()).padStart(2,'0'),mon:new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(d).replace('.','').toUpperCase(),title:e.title,place:e.location||e.address||'Laguna',time:e.start_time?String(e.start_time).slice(0,5):'Confira'}}))
    setSponsored(ads[0]||null)
    setStories(posts.map(p=>({id:p.id,type:p.type||'NOVIDADE',title:p.title,description:p.content||'',img:p.image_url||''})))
    setStats({businesses:bs.length,promotions:ps.length,events:es.length})
   }catch{if(live)setDataError(true)}
  })()
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
    if(live)setWeather(data.current||null)
   }catch{if(live)setWeather(null)}finally{if(live)setWeatherLoading(false)}
  }
  load();const t=setInterval(load,600000);return()=>{live=false;clearInterval(t)}
 },[])

 const catsPerPage=mobileCats?6:7
 const visibleCats=cats.slice(catStart,catStart+catsPerPage),categoryPages=Math.max(1,Math.ceil(cats.length/catsPerPage))
 const quickCats=['Restaurantes','Serviços','Beleza','Supermercado'].filter(name=>cats.some(([_,label])=>label===name))
 const dateLabel=useMemo(()=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(today).replace('.','').toUpperCase(),[today])
 const moveCats=dir=>setCatStart(start=>dir<0?Math.max(0,start-catsPerPage):Math.min(Math.max(0,cats.length-catsPerPage),start+catsPerPage))

 return <div className="lvp-page">
  <SiteHeader/>
  <main>
   <section className="lvp-hero"><div className="lvp-hero-bg"/><div className="lvp-hero-inner">
    <div className="lvp-hero-copy">
     <span className="lvp-kicker">✦ A cidade na palma da mão</span><h1>Descubra o que <span>Laguna</span> tem de melhor.</h1>
     <p>Encontre empresas, serviços, promoções e eventos perto de você — tudo em um só lugar.</p>
     <form className="lvp-search" onSubmit={e=>{e.preventDefault();const term=q.trim();location.href='/laguna/empresas'+(term?'?q='+encodeURIComponent(term):'')}}><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="O que você procura hoje?"/><button>Buscar</button></form>
     <div className="lvp-quick">{quickCats.map(x=><a key={x} href={'/laguna/empresas?categoria='+encodeURIComponent(slugify(x))}>{x}</a>)}</div>
     <div className="lvp-note">● Catálogo local de Laguna · dados publicados no VitrineLocal.</div>
    </div>
    <aside className="lvp-hero-card"><div className="lvp-mini-head"><span>HOJE EM LAGUNA</span><strong>{dateLabel}</strong></div>
     <div className="lvp-weather"><span className="lvp-weather-icon">{weatherLoading?'◌':'🌤️'}</span><div><b>{weatherLoading?'Carregando clima…':weather?.temperature_2m!=null?Math.round(weather.temperature_2m)+'°C':'Clima indisponível'}</b><small>{weather?.apparent_temperature!=null?'Laguna · '+weatherLabel(weather.weather_code)+' · sensação '+Math.round(weather.apparent_temperature)+'°C':'Atualização em tempo real'}</small></div><span className="lvp-live-dot">AO VIVO</span></div>
     <div className="lvp-mini-stat"><span className="lvp-mini-icon">🏪</span><div><b>{stats.businesses} empresa{stats.businesses===1?'':'s'}</b><small>Negócios ativos em Laguna</small></div></div>
     <div className="lvp-mini-stat"><span className="lvp-mini-icon">🏷️</span><div><b>{stats.promotions} oferta{stats.promotions===1?'':'s'} ativa{stats.promotions===1?'':'s'}</b><small>Promoções publicadas agora</small></div></div>
     <div className="lvp-mini-stat"><span className="lvp-mini-icon">📅</span><div><b>{stats.events} evento{stats.events===1?'':'s'}</b><small>Próximos eventos publicados</small></div></div>
     <a className="lvp-mini-cta" href="/laguna/empresas">Explorar Laguna →</a>
    </aside>
   </div></section>

   <section id="categorias" className="lvp-wrap lvp-categories"><div className="lvp-section-head"><div><span className="lvp-eyebrow">EXPLORE</span><h2>Encontre por categoria</h2><p>Descubra categorias cadastradas no VitrineLocal.</p></div><a href="/laguna/empresas">Ver todas →</a></div>
    <div className="lvp-cat-box"><button className="lvp-arrow" onClick={()=>moveCats(-1)} disabled={catStart===0}>‹</button><div className="lvp-cat-grid">{visibleCats.map(([icon,label])=><a href={'/laguna/empresas?categoria='+encodeURIComponent(slugify(label))} key={label}><span>{icon}</span><b>{label}</b></a>)}</div><button className="lvp-arrow" onClick={()=>moveCats(1)} disabled={catStart+catsPerPage>=cats.length}>›</button></div>
    <div className="lvp-cat-page-indicator" aria-live="polite">Página {Math.floor(catStart/7)+1} de {categoryPages}</div><div className="lvp-category-count">{cats.length} categorias disponíveis</div>
    {dataError&&<p className="lvp-data-warning">Alguns dados não puderam ser carregados agora.</p>}
   </section>

<section className="lvp-wrap lvp-sponsored-wrap">{sponsored?<a className="lvp-sponsored" href={sponsored.target_url||'/laguna'}>
    <div className="lvp-sponsored-image"><img src={sponsored.image_url||''} alt="" onError={e=>{e.currentTarget.style.display='none'}}/></div><div className="lvp-sponsored-copy"><span className="lvp-sponsored-label">DESTAQUE PATROCINADO</span><h2>{sponsored.title}</h2><p>{sponsored.description||'Publicidade publicada no VitrineLocal.'}</p><strong>Saiba mais →</strong></div>
   </a>:<div className="lvp-empty-sponsored lvp-empty-panel"><h3>Espaço para publicidade local</h3><p>Nenhum anúncio patrocinado está ativo em Laguna neste momento.</p><a href="/conta/publicidade">Conhecer publicidade →</a></div>}</section>

   <section id="explorar" className="lvp-wrap lvp-featured"><div className="lvp-section-head"><div><span className="lvp-eyebrow">DESCUBRA NEGÓCIOS</span><h2>Empresas em destaque</h2><p>Empresas ativas e publicadas no catálogo de Laguna.</p></div><a href="/laguna/empresas">Ver todas →</a></div>
    {businesses.length?<div className={'lvp-business-grid'+(businesses.length===1?' lvp-business-grid-single':'')}>{businesses.map(b=><a href={'/laguna/empresa/'+encodeURIComponent(b.slug)} className="lvp-business-card" key={b.id}><div className="lvp-business-image">{b.img?<img src={b.img} alt="" onError={e=>{e.currentTarget.style.display='none'}}/>:<div className="lvp-business-placeholder">{String(b.name).slice(0,1).toUpperCase()}</div>}{b.verified&&<span className="lvp-verified">✓ Verificada</span>}</div><div className="lvp-business-body"><span className="lvp-card-cat">{b.cat}</span><h3>{b.name}</h3><p>{b.rating&&<>⭐ {b.rating} · </>}📍 {b.place}</p><span className="lvp-card-link">Ver empresa →</span></div></a>)}</div>:<EmptyPanel title="Nenhuma empresa em destaque" text="Ainda não há empresas ativas e publicadas para destacar nesta área." href="/laguna/empresas" label="Explorar catálogo →"/>}
   </section>

   <section className="lvp-wrap lvp-needs"><div className="lvp-section-head"><div><span className="lvp-eyebrow">ENCONTRE PELO QUE PRECISA</span><h2>O que você precisa hoje?</h2><p>Atalhos para categorias que existem no catálogo.</p></div></div>
    <div className="lvp-need-grid">{quickCats.map((x,i)=><a key={x} href={'/laguna/empresas?categoria='+encodeURIComponent(slugify(x))}><span>{['🍽️','🛍️','🔧','💆'][i]}</span><b>{i===0?'Quero comer':i===1?'Quero comprar':i===2?'Preciso resolver':'Quero cuidar de mim'}</b><small>{x}</small></a>)}</div>
   </section>

   <section id="promocoes" className="lvp-soft"><div className="lvp-wrap"><div className="lvp-section-head"><div><span className="lvp-eyebrow">APROVEITE</span><h2>Ofertas perto de você</h2><p>Promoções publicadas e válidas agora.</p></div><a href="/laguna/promocoes">Ver todas →</a></div>
    {promotions.length?<div className={'lvp-promo-grid'+(promotions.length===1?' lvp-promo-grid-single':'')}>{promotions.map(p=><a href="/laguna/promocoes" className="lvp-promo-card" key={p.id}><div className="lvp-promo-image">{p.img?<img src={p.img} alt="" onError={e=>{e.currentTarget.style.display='none'}}/>:<div className="lvp-business-placeholder">%</div>}<strong>{p.badge}</strong></div><div className="lvp-promo-body"><span>{p.business}</span><h3>{p.title}</h3><p>{p.desc}</p><div className="lvp-price">{p.price}{p.old&&<del>{p.old}</del>}</div><b>Ver oferta →</b></div></a>)}</div>:<EmptyPanel title="Nenhuma oferta ativa" text="Não há promoções publicadas e válidas neste momento." href="/laguna/empresas" label="Explorar empresas →"/>}
   </div></section>

   <section id="eventos" className="lvp-wrap lvp-events"><div className="lvp-section-head"><div><span className="lvp-eyebrow">AGENDA LOCAL</span><h2>O que está acontecendo em Laguna</h2><p>Eventos publicados para os próximos dias.</p></div><a href="/laguna/eventos">Ver agenda →</a></div>
    {events.length?<div className="lvp-event-list">{events.map(e=><a className="lvp-event" href="/laguna/eventos" key={e.id}><div className="lvp-date"><b>{e.date}</b><span>{e.mon}</span></div><div><h3>{e.title}</h3><p>📍 {e.place} · 🕐 {e.time}</p></div><span className="lvp-event-arrow">→</span></a>)}</div>:<EmptyPanel title="Nenhum evento próximo" text="Não há eventos ativos publicados para os próximos dias." href="/laguna/eventos" label="Ver agenda →"/>}
   </section>

   {stories.length>0&&<section className="lvp-discover"><div className="lvp-wrap"><div className="lvp-section-head"><div><span className="lvp-eyebrow">NOVIDADES</span><h2>Novidades de Laguna</h2><p>Conteúdos publicados no VitrineLocal.</p></div></div><div className="lvp-story-grid">{stories.map(s=><article key={s.id}>{s.img&&<div className="lvp-story-image" style={{backgroundImage:'url('+s.img+')'}}/>}<span>{s.type}</span><h3>{s.title}</h3><p>{s.description.slice(0,180)}</p></article>)}</div></div></section>}

   <section id="empresa" className="lvp-business-cta-section"><div className="lvp-wrap lvp-business-cta-wrap"><div><span className="lvp-eyebrow">PARA EMPRESAS</span><h2>Sua empresa precisa ser encontrada.</h2><p>Crie seu espaço no VitrineLocal e coloque seu negócio na frente de quem está procurando o que você oferece.</p><div className="lvp-business-points"><span>✓ Perfil da empresa</span><span>✓ Produtos e serviços</span><span>✓ Promoções</span><span>✓ Mais visibilidade</span></div></div><a href="/conta?new=business" className="lvp-business-cta-button">Cadastrar minha empresa →</a></div></section>
  </main>
  <footer className="lvp-footer"><div className="lvp-wrap lvp-footer-grid"><div><img src="/vitrine-local-header-logo.svg" alt="VitrineLocal"/><p>A cidade em um só lugar.</p></div><div><b>Explorar</b><a href="#explorar">Empresas</a><a href="#promocoes">Promoções</a><a href="#eventos">Eventos</a><a href="#categorias">Categorias</a></div><div><b>Para empresas</b><a href="/conta?new=business">Cadastrar empresa</a><a href="/conta/publicidade">Publicidade</a><a href="/planos">Planos</a></div><div><b>VitrineLocal</b><a href="/laguna">Início</a><a href="mailto:contato@vitrinelocal.net">Contato</a><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a></div></div><div className="lvp-footer-bottom">© 2026 VitrineLocal · Laguna, SC</div></footer>
 </div>
}
export default LaunchHomePreview
