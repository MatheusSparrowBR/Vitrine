import React,{useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {formatHours} from './BusinessHoursEditor.jsx'
import './core.css'
import './business-hours.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const fallbackCats=[['Restaurantes','🍽️'],['Lojas','🛍️'],['Serviços','🧰'],['Saúde','❤️'],['Beleza','✨'],['Turismo','📍'],['Automóveis','🚗'],['Imóveis','🏠'],['Pets','🐾'],['Outros','✦']]
const fmt=v=>v==null||v===''?'':`R$ ${Number(v).toFixed(2).replace('.',',')}`
const phoneDigits=v=>String(v||'').replace(/\D/g,'')
const isPromotionCurrent=(p,now=Date.now())=>{
 const start=p?.starts_at?new Date(p.starts_at).getTime():null
 const end=p?.ends_at?new Date(p.ends_at).getTime():null
 return p?.status==='published'&&(start===null||Number.isFinite(start)&&start<=now)&&(end===null||Number.isFinite(end)&&end>now)
}

function PublicHeader({city,showExplore=true}){
 return <header className="topbar"><div className="nav"><a className="brand" href={`/${city?.slug||'laguna'}`}><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a>{city?.name&&<span className="city-select static">📍 {city.name} - {city.state||'SC'}</span>}<div className="nav-spacer"/><nav className="nav-actions">{showExplore&&<a href={`/${city?.slug||'laguna'}/empresas`}>Explorar</a>}<a href={`/${city?.slug||'laguna'}/promocoes`}>Promoções</a><a href={`/${city?.slug||'laguna'}/eventos`}>Eventos</a><a href="/planos">Planos</a><a className="primary" href="/login">Entrar</a></nav></div></header>
}

export function BusinessesPage({citySlug='laguna'}){
 const[city,setCity]=useState(null),[businesses,setBusinesses]=useState([]),[categories,setCategories]=useState([]),[q,setQ]=useState(''),[cat,setCat]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{let live=true;(async()=>{
  const params=new URLSearchParams(location.search)
  const initialCategory=params.get('categoria')||params.get('category')||''
  if(!db){setCity({id:'fallback',name:'Laguna',state:'SC',slug:citySlug});setCategories(fallbackCats.map(([name,icon],i)=>({id:i,name,icon,slug:name.toLowerCase()})));setCat(initialCategory);setLoading(false);return}
  const{data:c}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle();if(!live)return;setCity(c||null);if(!c){setLoading(false);return}
  const[b,cs]=await Promise.all([
   db.from('businesses').select('id,name,slug,short_description,description,cover_url,logo_url,address,neighborhood,phone,whatsapp,featured,verified,categories(name,slug,icon)').eq('city_id',c.id).eq('status','active').order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(100),
   db.from('categories').select('id,name,slug,icon').eq('active',true).order('sort_order').order('name')
  ])
  const loadedCategories=cs.data?.length?cs.data:fallbackCats.map(([name,icon],i)=>({id:i,name,icon,slug:name.toLowerCase()}))
  const validCategory=initialCategory&&loadedCategories.some(c=>c.slug===initialCategory)?initialCategory:''
  if(live){setBusinesses(b.data||[]);setCategories(loadedCategories);setCat(validCategory);setLoading(false)}
 })();return()=>{live=false}},[citySlug])
 const items=businesses.filter(b=>{const x=q.trim().toLowerCase();return(!x||[b.name,b.short_description,b.description,b.address,b.neighborhood,b.categories?.name].filter(Boolean).join(' ').toLowerCase().includes(x))&&(!cat||b.categories?.slug===cat)})
 const changeCategory=e=>{const next=e.target.value;setCat(next);const url=new URL(location.href);if(next)url.searchParams.set('categoria',next);else url.searchParams.delete('categoria');history.replaceState(null,'',url.pathname+(url.search?'?'+url.searchParams.toString():''))}
 if(loading)return <main className="page"><div className="empty"><h3>Carregando empresas…</h3></div></main>
 if(!city)return <main className="page"><div className="empty"><h3>Cidade não encontrada.</h3><a className="btn primary" href="/laguna">Voltar</a></div></main>
 return <div className="app"><PublicHeader city={city}/><main className="page">
  <div className="page-tools"><a className="back-link" href={`/${city.slug}`}>← Voltar para {city.name}</a></div>
  <div className="page-title"><span className="section-kicker">CATÁLOGO LOCAL</span><h1>Empresas em {city.name}</h1><p>Encontre negócios, serviços e lugares da cidade.</p></div>
  <div className="toolbar"><div className="searchbox compact"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar empresa, serviço ou bairro"/></div><select value={cat} onChange={changeCategory}><option value="">Todas as categorias</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>
  {items.length?<div className="business-grid">{items.map(b=><a className="business-card" href={`/${city.slug}/empresa/${encodeURIComponent(b.slug)}`} key={b.id}>
   <div className="business-cover">{b.cover_url?<img className="business-cover-image" src={b.cover_url} alt="" loading="lazy"/>:<div className="cover-placeholder">V</div>}{b.logo_url&&<span className="business-logo-wrap"><img className="business-logo" src={b.logo_url} alt={`${b.name} logo`} loading="lazy"/></span>}{b.verified&&<span className="verified">✓ Verificada</span>}</div>
   <div className="business-body"><span className="business-category">{b.categories?.name||'Empresa'}</span><h3>{b.name}</h3><p>{b.short_description||b.description||'Conheça este negócio local.'}</p><div className="business-footer"><span>{b.neighborhood||b.address||'Laguna - SC'}</span><span className="business-meta"><span className="business-rating">★ Sem avaliações</span>{b.whatsapp&&<span className="business-whatsapp">WhatsApp</span>}</span></div></div>
  </a>)}</div>:<div className="empty"><h3>Nenhuma empresa encontrada.</h3><p>Tente outro termo ou categoria.</p></div>}
 </main></div>
}

export function PromotionsPage({citySlug='laguna'}){
 const[city,setCity]=useState(null),[items,setItems]=useState([]),[loading,setLoading]=useState(true)
 useEffect(()=>{let live=true;(async()=>{if(!db){setCity({id:'fallback',name:'Laguna',state:'SC',slug:citySlug});setLoading(false);return}const{data:c}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle();if(!live)return;setCity(c||null);if(!c){setLoading(false);return}const{data}=await db.from('promotions').select('id,title,description,image_url,price,original_price,starts_at,ends_at,businesses!inner(id,name,slug,city_id)').eq('status','published').eq('businesses.city_id',c.id).order('created_at',{ascending:false}).limit(100);if(live){setItems((data||[]).filter(isPromotionCurrent));setLoading(false)}})();return()=>{live=false}},[citySlug])
 if(loading)return <main className="page"><div className="empty"><h3>Carregando promoções…</h3></div></main>
 if(!city)return <main className="page"><div className="empty"><h3>Cidade não encontrada.</h3><a className="btn primary" href="/laguna">Voltar</a></div></main>
 return <div className="app"><PublicHeader city={city}/><main className="page"><div className="page-tools"><a className="back-link" href={`/${city.slug}`}>← Voltar para {city.name}</a></div><span className="section-kicker">OFERTAS LOCAIS</span><h1>Promoções em {city.name}</h1><p>Ofertas publicadas pelas empresas participantes.</p>{items.length?<div className="promotion-grid">{items.map(p=><article className="promotion-card" key={p.id}>{p.image_url?<img src={p.image_url} alt=""/>:<div className="promotion-cover">🔥</div>}<div className="promotion-body"><span className="business-category">PROMOÇÃO</span><h3>{p.title}</h3><p>{p.description||'Confira esta oferta.'}</p><div className="price-row">{p.original_price!=null&&<del>{fmt(p.original_price)}</del>}{p.price!=null&&<strong>{fmt(p.price)}</strong>}</div><a className="link-btn" href={`/${city.slug}/empresa/${encodeURIComponent(p.businesses.slug)}`}>Ver empresa →</a></div></article>)}</div>:<div className="empty" style={{marginTop:22}}><h3>Nenhuma promoção disponível.</h3><p>Novas ofertas aparecerão aqui quando forem publicadas.</p></div>}</main></div>
}

export function BusinessProfilePage({citySlug='laguna',businessSlug=''}){
 const[city,setCity]=useState(null),[business,setBusiness]=useState(null),[photos,setPhotos]=useState([]),[items,setItems]=useState([]),[promotions,setPromotions]=useState([]),[loading,setLoading]=useState(true)
 useEffect(()=>{let live=true;(async()=>{if(!db){setLoading(false);return}const{data:c}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle();if(!live||!c){setCity(c||null);setLoading(false);return}setCity(c);const{data:b,error}=await db.from('businesses').select('*,categories(name,slug),cities(name,state,slug)').eq('city_id',c.id).eq('slug',businessSlug).eq('status','active').maybeSingle();if(!live)return;if(error||!b){setLoading(false);return}const[p,i,pr]=await Promise.all([db.from('business_photos').select('*').eq('business_id',b.id).order('sort_order'),db.from('business_items').select('*').eq('business_id',b.id).eq('active',true).order('sort_order'),db.from('promotions').select('*').eq('business_id',b.id).eq('status','published').order('created_at',{ascending:false})]);if(live){setBusiness(b);setPhotos(p.data||[]);setItems(i.data||[]);setPromotions((pr.data||[]).filter(isPromotionCurrent));setLoading(false)}})();return()=>{live=false}},[citySlug,businessSlug])
 if(loading)return <main className="page"><div className="empty"><h3>Carregando empresa…</h3></div></main>
 if(!city||!business)return <main className="page"><div className="empty"><h3>Empresa não encontrada.</h3><a className="btn primary" href={`/${citySlug}/empresas`}>Voltar para empresas</a></div></main>
 const wa=business.whatsapp||business.phone
 const hours=formatHours(business.opening_hours)
 const location=business.neighborhood?`${business.neighborhood}, ${city.name} - ${city.state||'SC'}`:business.address||`${city.name} - ${city.state||'SC'}`
 return <div className="app"><PublicHeader city={city}/><main className="page"><div className="page-tools"><a className="back-link" href={`/${city.slug}/empresas`}>← Voltar para empresas</a></div>
  <div className="profile-cover">{business.cover_url?<img src={business.cover_url} alt={`${business.name} capa`} loading="lazy"/>:<div className="cover-placeholder large">V</div>}{business.logo_url&&<div className="profile-logo"><img src={business.logo_url} alt={`${business.name} logo`} loading="lazy"/></div>}</div>
  <div className="profile-head"><div><span className="business-category">{business.categories?.name||'Empresa'}</span><h1>{business.name}</h1><p>{business.short_description||''}</p>{business.verified&&<span className="verified" style={{position:'static',display:'inline-flex'}}>✓ Verificada</span>}<div className="profile-meta"><span className="profile-rating">★ Sem avaliações</span><span className="profile-location">📍 {location}</span></div></div></div>
  <div className="profile-actions">{wa&&<a className="primary" href={`https://wa.me/${phoneDigits(wa)}`} target="_blank" rel="noreferrer">WhatsApp</a>}{business.instagram_url&&<a className="outline" href={business.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}{business.website_url&&<a className="outline" href={business.website_url} target="_blank" rel="noreferrer">Site</a>}{business.address&&<a className="outline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer">Como chegar</a>}</div>
  <div className="profile-columns"><div><section className="profile-card"><h2>Sobre a empresa</h2><p>{business.description||'Informações desta empresa ainda não foram detalhadas.'}</p>{business.address&&<p>📍 {business.address}{business.neighborhood?` · ${business.neighborhood}`:''}</p>}</section><section className="profile-card profile-hours-card" style={{marginTop:16}}><h2>Horário de funcionamento</h2><div className="public-hours-grid">{hours.map(day=><div className={`public-hour ${day.closed?'closed':''}`} key={day.key}><strong>{day.label}</strong><span>{day.text}</span></div>)}</div></section>{photos.length>0&&<section className="profile-card" style={{marginTop:16}}><h2>Fotos e mídias</h2><div className="profile-gallery">{photos.map(p=><div key={p.id}>{p.media_type==='video'?<video src={p.url} controls/>:<img src={p.url} alt={p.alt_text||''} loading="lazy"/>}</div>)}</div></section>}{items.length>0&&<section className="profile-card" style={{marginTop:16}}><h2>Produtos e serviços</h2><div className="item-grid">{items.map(i=><article className="item-card" key={i.id}>{i.image_url&&<img src={i.image_url} alt="" loading="lazy"/>}<div className="item-card-body"><h3>{i.name}</h3>{i.description&&<p>{i.description}</p>}{i.price!=null&&<strong>{fmt(i.price)}</strong>}</div></article>)}</div></section>}</div><aside><section className="profile-card"><h2>Promoções</h2>{promotions.length?promotions.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid #edf1f7'}}><strong>{p.title}</strong><span>{p.price!=null?fmt(p.price):''}</span></div>):<p>Nenhuma promoção ativa no momento.</p>}</section></aside></div>
 </main></div>
}

export function NotFoundPage(){return <main className="page section"><div className="empty"><h1>Página não encontrada</h1><p>O endereço acessado não existe no VitrineLocal.</p><a className="btn primary" href="/laguna">Voltar ao início</a></div></main>}
