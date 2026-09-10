import React,{useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {formatHours} from './BusinessHoursEditor.jsx'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const phoneDigits=v=>String(v||'').replace(/\D/g,'')
const fmt=v=>v==null||v===''?'':`R$ ${Number(v).toFixed(2).replace('.',',')}`

function Gallery({business,photos}){
 const images=photos.filter(p=>p.media_type!=='video')
 const main=business.cover_url||images[0]?.url
 const thumbs=[...images.slice(0,3)]
 while(thumbs.length<3&&main)thumbs.push({id:`fallback-${thumbs.length}`,url:main})
 const extra=Math.max(0,photos.length-3)
 return <div className="mbp-gallery">
  <div className="mbp-gallery-main">{main?<img src={main} alt={`${business.name} capa`} loading="eager"/>:<div className="mbp-gallery-placeholder">VitrineLocal</div>}<span className="mbp-gallery-caption">▣ {business.short_description||'Conheça esta empresa local.'}</span></div>
  <div className="mbp-gallery-side">{thumbs.slice(0,2).map((p,i)=><div className="mbp-gallery-thumb" key={p.id||i}><img src={p.url} alt="" loading="lazy"/></div>)}<div className="mbp-gallery-more">{extra>0&&<strong>+{extra}</strong>}<span>Ver todas as fotos</span></div></div>
 </div>
}

function ContactCard({icon,title,value,link}){
 const content=<><span className="mbp-contact-icon">{icon}</span><span><strong>{title}</strong><small>{value}</small></span></>
 if(!link)return <div className="mbp-contact-card">{content}</div>
 return <a className="mbp-contact-card" href={link} target="_blank" rel="noreferrer">{content}</a>
}

export default function ModernBusinessProfilePage({citySlug='laguna',businessSlug=''}){
 const[city,setCity]=useState(null),[business,setBusiness]=useState(null),[photos,setPhotos]=useState([]),[items,setItems]=useState([]),[promotions,setPromotions]=useState([]),[tab,setTab]=useState('about'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saved,setSaved]=useState(false)
 useEffect(()=>{let live=true;(async()=>{
  if(!db){setError('Configuração do banco indisponível.');setLoading(false);return}
  const{data:c}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle()
  if(!live)return
  if(!c){setError('Cidade não encontrada.');setLoading(false);return}
  setCity(c)
  const{data:b,error:be}=await db.from('businesses').select('*,categories(name,slug,icon),cities(name,state,slug)').eq('city_id',c.id).eq('slug',businessSlug).eq('status','active').maybeSingle()
  if(!live)return
  if(be||!b){setError('Empresa não encontrada.');setLoading(false);return}
  const[p,i,pr]=await Promise.all([
   db.from('business_photos').select('*').eq('business_id',b.id).order('sort_order'),
   db.from('business_items').select('*').eq('business_id',b.id).eq('active',true).order('sort_order'),
   db.from('promotions').select('*').eq('business_id',b.id).eq('status','published').order('created_at',{ascending:false})
  ])
  if(live){setBusiness(b);setPhotos(p.data||[]);setItems(i.data||[]);setPromotions(pr.data||[]);setLoading(false)}
 })();return()=>{live=false}},[citySlug,businessSlug])
 const hours=useMemo(()=>business?formatHours(business.opening_hours):[],[business])
 const profileLocation=business?(business.neighborhood?`${business.neighborhood}, ${city?.name} - ${city?.state||'SC'}`:business.address||`${city?.name} - ${city?.state||'SC'}`):''
 const wa=business?.whatsapp||business?.phone
 const share=async()=>{const data={title:business?.name||'VitrineLocal',text:`Confira ${business?.name||'esta empresa'} no VitrineLocal.`,url:window.location.href};try{if(navigator.share)await navigator.share(data);else if(navigator.clipboard)await navigator.clipboard.writeText(data.url)}catch{}}
 if(loading)return <main className="mbp-shell"><div className="mbp-loading">Carregando empresa…</div></main>
 if(error||!business||!city)return <main className="mbp-shell"><div className="mbp-error"><h1>{error||'Empresa não encontrada.'}</h1><a href={`/${citySlug}/empresas`}>← Voltar para a lista</a></div></main>
 return <div className="mbp-shell">
  <header className="mbp-topbar"><div className="mbp-nav">
   <a className="mbp-brand" href={`/${city.slug}`}><span className="mbp-brand-mark">V</span><span>Vitrine<span>Local</span></span></a>
   <form className="mbp-search" onSubmit={e=>{e.preventDefault();location.href=`/${city.slug}/empresas`}}><span>⌕</span><input placeholder="Busque por empresas, serviços, categorias…" aria-label="Buscar"/></form>
   <nav className="mbp-nav-links"><a href={`/${city.slug}`}>Início</a><a href={`/${city.slug}/empresas`}>Empresas</a><a href={`/${city.slug}/promocoes`}>Promoções</a><a href={`/${city.slug}/eventos`}>Eventos</a></nav>
   <a className="mbp-city" href={`/${city.slug}`}>⌖ {city.name} - {city.state||'SC'}⌄</a><a className="mbp-user" href="/conta" aria-label="Minha conta">◉</a>
  </div></header>
  <main className="mbp-page">
   <div className="mbp-breadcrumbs"><a href={`/${city.slug}/empresas`}>← Voltar para a lista</a><span>⌖ {city.name}</span><span>›</span><span>{business.categories?.name||'Empresa'}</span><span>›</span><strong>{business.name}</strong></div>
   <div className="mbp-layout">
    <section className="mbp-main-card">
     <Gallery business={business} photos={photos}/>
     <div className="mbp-company-head">
      <div className="mbp-logo">{business.logo_url?<img src={business.logo_url} alt={`${business.name} logo`}/>:<span>V</span>}</div>
      <div className="mbp-company-copy"><h1>{business.name}</h1><div className="mbp-badges"><span className="mbp-rating">★ Sem avaliações</span>{business.verified&&<span className="mbp-verified">✓ Verificada</span>}<span className="mbp-category">▤ {business.categories?.name||'Empresa'}</span></div><p>{business.short_description||business.description||'Conheça esta empresa local.'}</p></div>
     </div>
     <div className="mbp-contact-grid">
      <ContactCard icon="⌖" title="Localização" value={profileLocation||'Laguna - SC'} link={business.address?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`:undefined}/>
      <ContactCard icon="◷" title={hours.some(h=>!h.closed)?'Aberto agora':'Horário'} value={hours.find(h=>!h.closed)?.text||'Consulte os horários'} />
      {wa&&<ContactCard icon="☎" title="WhatsApp" value={business.phone||business.whatsapp} link={`https://wa.me/${phoneDigits(wa)}`}/>} 
      {business.instagram_url&&<ContactCard icon="◎" title="Instagram" value={business.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//,'@').replace(/\/$/,'')} link={business.instagram_url}/>} 
     </div>
     {wa&&<a className="mbp-primary-cta" href={`https://wa.me/${phoneDigits(wa)}`} target="_blank" rel="noreferrer">◉ <span>Entre em contato</span></a>}
     <div className="mbp-action-row"><a href={business.instagram_url||'#'} target={business.instagram_url?'_blank':undefined} rel="noreferrer">◎ Instagram</a><button onClick={share}>♧ Compartilhar</button><button className={saved?'saved':''} onClick={()=>setSaved(v=>!v)}>♡ {saved?'Salvo':'Salvar'}</button></div>
     {items.length>0&&<section className="mbp-section"><div className="mbp-section-title"><div><span>PRODUTOS E SERVIÇOS</span><h2>O que a empresa oferece</h2></div></div><div className="mbp-items">{items.slice(0,6).map(i=><article key={i.id}>{i.image_url&&<img src={i.image_url} alt="" loading="lazy"/>}<div><h3>{i.name}</h3>{i.description&&<p>{i.description}</p>}{i.price!=null&&<strong>{fmt(i.price)}</strong>}</div></article>)}</div></section>}
    </section>
    <aside className="mbp-sidebar">
     <div className="mbp-tabs" role="tablist">{[['about','Sobre'],['hours','Horário'],['reviews','Avaliações'],['location','Localização']].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
     {tab==='about'&&<section className="mbp-side-card"><div className="mbp-side-icon">▤</div><h2>Sobre a empresa</h2><p>{business.description||'Informações desta empresa ainda não foram detalhadas.'}</p><h3>Categorias</h3><div className="mbp-pills"><span>{business.categories?.name||'Empresa'}</span>{business.categories?.name==='Restaurantes'&&<><span>Pizzaria</span><span>Gastronomia</span></>}{wa&&<span>Delivery</span>}</div><h3>Diferenciais</h3><div className="mbp-diff-grid"><span>✓ Atendimento de qualidade</span><span>✓ Negócio local</span><span>✓ Presença digital</span><span>✓ Contato rápido</span></div></section>}
     {tab==='hours'&&<section className="mbp-side-card mbp-hours-card"><div className="mbp-side-icon">◷</div><h2>Horário de funcionamento</h2><p><span className="mbp-open-pill">● Aberto agora</span> · Consulte antes de ir</p><div className="mbp-hours-list">{hours.map(day=><div key={day.key}><span>{day.label}</span><strong>{day.text}</strong></div>)}</div><div className="mbp-hours-note">◷ Horários podem ser alterados em feriados.<br/>Entre em contato para confirmar.</div></section>}
     {tab==='reviews'&&<section className="mbp-side-card"><div className="mbp-side-icon">★</div><h2>Avaliações</h2><div className="mbp-empty-rating"><strong>Sem avaliações</strong><p>As avaliações dos clientes aparecerão aqui quando o sistema de avaliações estiver disponível.</p></div></section>}
     {tab==='location'&&<section className="mbp-side-card"><div className="mbp-side-icon">⌖</div><h2>Localização</h2><p className="mbp-location-text">{business.address||profileLocation||'Laguna - SC'}</p>{business.address?<a className="mbp-map-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer">Abrir no Google Maps →</a>:<p>O endereço ainda não foi informado.</p>}</section>}
     {promotions.length>0&&<section className="mbp-side-card mbp-promos"><div className="mbp-side-icon">%</div><h2>Promoções</h2>{promotions.slice(0,3).map(p=><div className="mbp-promo" key={p.id}><strong>{p.title}</strong>{p.price!=null&&<span>{fmt(p.price)}</span>}</div>)}</section>}
    </aside>
   </div>
  </main>
 </div>
}
