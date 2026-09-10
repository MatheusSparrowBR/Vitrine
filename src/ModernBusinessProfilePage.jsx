import React,{useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {formatHours} from './BusinessHoursEditor.jsx'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const phoneDigits=v=>String(v||'').replace(/\D/g,'')
const fmt=v=>v==null||v===''?'':`R$ ${Number(v).toFixed(2).replace('.',',')}`
const businessRating=b=>b?.average_rating??b?.avg_rating??b?.rating??null
const businessReviewCount=b=>b?.review_count??b?.reviews_count??b?.rating_count??0
const DAY_KEYS=['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

function minutes(v){const m=String(v||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),n=Number(m[2]);return h<=23&&n<=59?h*60+n:null}
function currentDayIndex(date=new Date()){return(date.getDay()+6)%7}
function getOpenStatus(value,date=new Date()){
 const source=value&&typeof value==='object'?value:{}
 const index=currentDayIndex(date)
 const now=date.getHours()*60+date.getMinutes()
 const parse=key=>{const d=source[key];if(!d||d.closed)return null;const open=minutes(d.open),closeRaw=minutes(d.close);if(open==null||closeRaw==null||open===closeRaw)return null;return{open,close:closeRaw<=open?closeRaw+1440:closeRaw,closeLabel:d.close,openLabel:d.open}}
 const today=parse(DAY_KEYS[index])
 if(today&&today.open<1440&&now>=today.open&&now<today.close)return{open:true,label:'Aberto agora',detail:`Fecha às ${today.closeLabel}`}
 const prev=parse(DAY_KEYS[(index+6)%7])
 if(prev&&prev.close>1440&&now<prev.close-1440)return{open:true,label:'Aberto agora',detail:`Fecha às ${prev.closeLabel}`}
 for(let offset=0;offset<7;offset+=1){const target=(index+offset)%7;const d=parse(DAY_KEYS[target]);if(!d)continue;if(offset===0&&now>=d.open)continue;return{open:false,label:'Fechado agora',detail:`Abre às ${d.openLabel}`}}
 return{open:false,label:'Fechado agora',detail:'Consulte os horários'}
}

function Gallery({business,photos}){
 const cover=business.cover_url||''
 const media=photos.filter(p=>p.url&&p.url!==cover)
 const images=media.filter(p=>p.media_type!=='video')
 const main=cover||images[0]?.url
 const thumbs=media.filter(p=>p.media_type!=='video').slice(0,2)
 while(thumbs.length<2&&main)thumbs.push({id:`fallback-${thumbs.length}`,url:main})
 const total=(cover?1:0)+media.length
 const extra=Math.max(0,total-3)
 return <div className="mbp-gallery" data-gallery-total={total}>
  <button className="mbp-gallery-main" type="button" data-gallery-open aria-label="Abrir galeria de fotos">
   {main?<img src={main} alt={`${business.name} capa`} loading="eager"/>:<div className="mbp-gallery-placeholder">VitrineLocal</div>}
   <span className="mbp-gallery-caption">▣ {business.short_description||'Conheça esta empresa local.'}</span>
  </button>
  <div className="mbp-gallery-side">
   {thumbs.map((p,i)=><button className="mbp-gallery-thumb" type="button" key={p.id||i} data-gallery-open aria-label={`Abrir foto ${i+2}`}><img src={p.url} alt="" loading="lazy"/></button>)}
   <button className="mbp-gallery-more" type="button" data-gallery-open aria-label="Ver todas as fotos">
    {extra>0&&<strong>+{extra}</strong>}
    <span>{total>0?'Ver todas as fotos':'Adicionar fotos'}</span>
   </button>
  </div>
 </div>
}

function ContactCard({icon,title,value,link,state}){
 const content=<><span className="mbp-contact-icon">{icon}</span><span><strong>{title}</strong><small>{value}</small></span></>
 if(!link)return <div className={`mbp-contact-card ${state?`is-${state}`:''}`} data-contact-state={state||''}>{content}</div>
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
 const status=useMemo(()=>business?getOpenStatus(business.opening_hours):{open:false,label:'Horário',detail:'Consulte os horários'},[business])
 const profileLocation=business?(business.neighborhood?`${business.neighborhood}, ${city?.name} - ${city?.state||'SC'}`:business.address||`${city?.name} - ${city?.state||'SC'}`):''
 const wa=business?.whatsapp||business?.phone
 const rating=businessRating(business)
 const reviewCount=businessReviewCount(business)
 const share=async()=>{const data={title:business?.name||'VitrineLocal',text:`Confira ${business?.name||'esta empresa'} no VitrineLocal.`,url:window.location.href};try{if(navigator.share)await navigator.share(data);else if(navigator.clipboard)await navigator.clipboard.writeText(data.url)}catch{}}
 if(loading)return <main className="mbp-shell"><div className="mbp-loading">Carregando empresa…</div></main>
 if(error||!business||!city)return <main className="mbp-shell"><div className="mbp-error"><h1>{error||'Empresa não encontrada.'}</h1><a href={`/${citySlug}/empresas`}>← Voltar para a lista</a></div></main>
 return <div className="mbp-shell">
  <main className="mbp-page">
   <div className="mbp-breadcrumbs"><a href={`/${city.slug}/empresas`}>← Voltar para a lista</a><span>⌖ {city.name}</span><span>›</span><span>{business.categories?.name||'Empresa'}</span><span>›</span><strong>{business.name}</strong></div>
   <div className="mbp-layout">
    <section className="mbp-main-card">
     <Gallery business={business} photos={photos}/>
     <div className="mbp-company-head">
      <div className="mbp-logo">{business.logo_url?<img src={business.logo_url} alt={`${business.name} logo`}/>:<span>V</span>}</div>
      <div className="mbp-company-copy"><div className="mbp-kicker">EMPRESA LOCAL</div><h1>{business.name}</h1><div className="mbp-badges">{rating!=null&&reviewCount>0?<span className="mbp-rating">★ {Number(rating).toFixed(1)} <small>({reviewCount})</small></span>:<span className="mbp-rating">★ Sem avaliações</span>}{business.verified&&<span className="mbp-verified">✓ Verificada</span>}<span className="mbp-category">▤ {business.categories?.name||'Empresa'}</span><span className={status.open?'mbp-live-pill':'mbp-closed-pill'}>{status.open?'● Aberto':'● Fechado'}</span></div><p>{business.short_description||business.description||'Conheça esta empresa local.'}</p></div>
     </div>
     <div className="mbp-contact-grid"><ContactCard icon="⌖" title="Localização" value={profileLocation||'Laguna - SC'} link={business.address?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`:undefined}/><ContactCard icon="◷" title={status.label} value={status.detail}/>{wa&&<ContactCard icon="☎" title="WhatsApp" value={business.phone||business.whatsapp} link={`https://wa.me/${phoneDigits(wa)}`}/>} {business.instagram_url&&<ContactCard icon="◎" title="Instagram" value={business.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//,'@').replace(/\/$/,'')} link={business.instagram_url}/>}</div>
     {wa&&<a className="mbp-primary-cta" data-track="whatsapp" href={`https://wa.me/${phoneDigits(wa)}`} target="_blank" rel="noreferrer">◉ <span>Entre em contato</span></a>}
     <div className="mbp-action-row"><a data-track="instagram" href={business.instagram_url||'#'} target={business.instagram_url?'_blank':undefined} rel="noreferrer">◎ Instagram</a><button data-track="share" onClick={share}>♧ Compartilhar</button><button data-track="save" className={saved?'saved':''} onClick={()=>setSaved(v=>!v)}>♡ {saved?'Salvo':'Salvar'}</button></div>
     {items.length>0&&<section className="mbp-section"><div className="mbp-section-title"><span>PRODUTOS E SERVIÇOS</span><div className="mbp-section-heading-row"><h2>O que a empresa oferece</h2><small>{items.length} {items.length===1?'item':'itens'}</small></div></div><div className="mbp-items">{items.slice(0,6).map(i=><article key={i.id}>{i.image_url&&<img src={i.image_url} alt="" loading="lazy"/>}<div><h3>{i.name}</h3>{i.description&&<p>{i.description}</p>}{i.price!=null&&<strong>{fmt(i.price)}</strong>}</div></article>)}</div></section>}
     {promotions.length>0&&<section className="mbp-section"><div className="mbp-section-title"><span>OFERTAS ATIVAS</span><div className="mbp-section-heading-row"><h2>Promoções da empresa</h2><small>{promotions.length} ativa{promotions.length===1?'':'s'}</small></div></div><div className="mbp-promo-grid">{promotions.slice(0,3).map(p=><article className="mbp-promo-card" key={p.id}>{p.image_url&&<img src={p.image_url} alt="" loading="lazy"/>}<div><strong>{p.title}</strong>{p.description&&<p>{p.description}</p>}<div>{p.original_price!=null&&<del>{fmt(p.original_price)}</del>}{p.price!=null&&<b>{fmt(p.price)}</b>}</div></div></article>)}</div></section>}
    </section>
    <aside className="mbp-sidebar"><div className="mbp-tabs" role="tablist">{[['about','Sobre'],['hours','Horário'],['reviews','Avaliações'],['location','Localização']].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
     {tab==='about'&&<section className="mbp-side-card"><div className="mbp-side-icon">▤</div><span className="mbp-side-kicker">VISÃO GERAL</span><h2>Sobre a empresa</h2><p>{business.description||'Informações desta empresa ainda não foram detalhadas.'}</p><h3>Categorias</h3><div className="mbp-pills"><span>{business.categories?.name||'Empresa'}</span>{business.categories?.name==='Restaurantes'&&<><span>Pizzaria</span><span>Gastronomia</span></>}{wa&&<span>Atendimento pelo WhatsApp</span>}</div></section>}
     {tab==='hours'&&<section className="mbp-side-card mbp-hours-card"><div className="mbp-side-icon">◷</div><span className="mbp-side-kicker">ATENDIMENTO</span><h2>Horário de funcionamento</h2><p><span className={status.open?'mbp-open-pill':'mbp-closed-pill'}>● {status.open?'Aberto agora':'Fechado agora'}</span> · {status.detail}</p><div className="mbp-hours-list">{hours.map(day=><div key={day.key}><span>{day.label}</span><strong>{day.text}</strong></div>)}</div><div className="mbp-hours-note">◷ Horários podem ser alterados em feriados.<br/>Entre em contato para confirmar.</div></section>}
     {tab==='reviews'&&<section className="mbp-side-card"><div className="mbp-side-icon">★</div><span className="mbp-side-kicker">CONFIANÇA</span><h2>Avaliações</h2>{rating!=null&&reviewCount>0?<div className="mbp-rating-summary"><strong>{Number(rating).toFixed(1)}</strong><span>★★★★★</span><small>{reviewCount} avaliações</small></div>:<div className="mbp-empty-rating"><strong>Sem avaliações ainda</strong><p>As avaliações dos clientes aparecerão aqui quando estiverem disponíveis.</p></div>}</section>}
     {tab==='location'&&<section className="mbp-side-card"><div className="mbp-side-icon">⌖</div><span className="mbp-side-kicker">LOCALIZAÇÃO</span><h2>Onde estamos</h2><p className="mbp-location-text">{business.address||profileLocation||'Laguna - SC'}</p>{business.address?<a className="mbp-map-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer">Abrir no Google Maps →</a>:<p>O endereço ainda não foi informado.</p>}</section>}
    </aside>
   </div>
  </main>
 </div>
}
