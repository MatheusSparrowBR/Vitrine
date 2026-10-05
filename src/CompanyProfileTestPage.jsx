import React,{useEffect,useState} from 'react'
import './company-profile-test.css'

const b={
 name:'Bistrô Laguna',
 category:'Restaurante · Cozinha contemporânea',
 city:'Laguna - SC',
 neighborhood:'Centro Histórico',
 address:'Rua Gustavo Richard, 245 — Centro Histórico, Laguna - SC',
 rating:'4,9',
 reviews:'128 avaliações',
 cover:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=88',
 logo:'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=240&q=85',
 description:'Cozinha contemporânea com ingredientes locais, ambiente acolhedor e atendimento para almoço, jantar e encontros especiais.',
 hours:[
  ['Segunda-feira (Hoje)','11:30–14:30 · 18:00–23:00'],
  ['Terça a Quinta','11:30–14:30 · 18:00–23:00'],
  ['Sexta-feira','11:30–14:30 · 18:00–00:00'],
  ['Sábado','18:00–00:00'],
  ['Domingo','18:00–22:30']
 ],
 photos:[
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=88',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=86',
  'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=900&q=86'
 ],
 orders:[
  ['Risoto de camarão da casa','Arroz arbóreo, camarões, limão-siciliano e ervas.','R$ 68,90'],
  ['Peixe do dia','Pesca local, legumes tostados e molho de ervas.','R$ 64,90']
 ],
 promo:['OFERTA DA SEMANA','10% OFF no prato principal','Válido de segunda a quinta para consumo no local.','LAGUNA10']
}

const I=({n,s=18,fill=false})=>{
 const p={
  pin:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  star:<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>,
  heart:<path d="M20.8 8.7c0 5.1-8.8 10.6-8.8 10.6S3.2 13.8 3.2 8.7a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/>,
  share:<><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>,
  phone:<path d="M6.6 4.2 9 3.5a1.5 1.5 0 0 1 1.7.8l1.2 2.8a1.5 1.5 0 0 1-.4 1.7l-1.5 1.2a12.5 12.5 0 0 0 3.8 3.8l1.2-1.5a1.5 1.5 0 0 1 1.7-.4l2.8 1.2a1.5 1.5 0 0 1 .8 1.7l-.7 2.4a1.8 1.8 0 0 1-2 1.3C10.6 17.6 6.4 13.4 4.6 7a1.8 1.8 0 0 1 1.3-2.8Z"/>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check:<path d="m5 12 4 4L19 6"/>,
  grid:<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  arrow:<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>
 }
 return <svg width={s} height={s} viewBox="0 0 24 24" fill={fill?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[n]||p.check}</svg>
}

const Stars=()=> <span className="cpl-stars">{[0,1,2,3,4].map(i=><I key={i} n="star" s={13} fill/>)}</span>

export default function CompanyProfileTestPage(){
 const[saved,setSaved]=useState(false),[gallery,setGallery]=useState(false),[photo,setPhoto]=useState(0)
 useEffect(()=>{
  const title=document.title
  const canonical=document.querySelector('link[rel="canonical"]')
  const previousCanonical=canonical?.getAttribute('href')||null
  document.title='Perfil Lab | '+b.name
  if(canonical)canonical.setAttribute('href',location.origin+'/perfil-teste')
  let robots=document.querySelector('meta[name="robots"]'),created=!robots
  if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots)}
  const previousRobots=robots.getAttribute('content')
  robots.setAttribute('content','noindex,nofollow,noarchive')
  return()=>{document.title=title;if(canonical){if(previousCanonical)canonical.setAttribute('href',previousCanonical);else canonical.removeAttribute('href')}if(robots){if(created)robots.remove();else if(previousRobots)robots.setAttribute('content',previousRobots)}}
 },[])
 const wa='https://wa.me/5548999999999?text='+encodeURIComponent('Olá! Encontrei o '+b.name+' na VitrineLocal e gostaria de saber mais.')
 const share=async()=>{
  try{
   if(navigator.share)await navigator.share({title:b.name,url:location.href})
   else await navigator.clipboard?.writeText(location.href)
  }catch{}
 }
 return <div className="company-profile-lab">
  <div className="cpl-labbar"><div className="cpl-container"><span>PERFIL LAB</span><strong>Protótipo isolado de UX/UI</strong><small>Dados simulados · sem banco · perfil oficial preservado</small><a href="/home-teste">← Voltar para Home Lab</a></div></div>

  <header className="cpl-header"><div className="cpl-container cpl-header-inner">
   <a className="cpl-brand" href="/home-teste"><b>V</b><strong>VitrineLocal</strong><small>LAB</small></a>
   <div className="cpl-city"><I n="pin" s={13}/>{b.city}</div>
   <nav><a href="/home-teste">Início</a><a href="#sobre">Empresa</a><a href="#pedidos">Destaques</a><a href="#endereco">Localização</a></nav>
  </div></header>

  <main id="topo" className="cpl-main"><div className="cpl-container">
   <nav className="cpl-bread" aria-label="Breadcrumb"><a href="/home-teste">Laguna</a><span>/</span><a href="#pedidos">{b.category.split(' · ')[0]}</a><span>/</span><strong>{b.name}</strong></nav>

   <section className="cpl-profile">
    <header className="cpl-profile-head">
     <div>
      <div className="cpl-name-row"><h1>{b.name}</h1><span className="cpl-verified"><I n="check" s={12}/> Verificada</span></div>
      <p><strong>{b.category}</strong><span>·</span><span>{b.neighborhood}, {b.city}</span></p>
     </div>
     <span className="cpl-status"><i/> Aberto agora · Fecha às 23:00</span>
    </header>

    <div className="cpl-gallery" aria-label="Galeria da empresa">
     <button className="cpl-photo cpl-photo-main" type="button" onClick={()=>{setPhoto(0);setGallery(true)}}><img src={b.photos[0]} alt={'Ambiente interno de '+b.name}/></button>
     <div className="cpl-photo-stack">
      <button className="cpl-photo" type="button" onClick={()=>{setPhoto(1);setGallery(true)}}><img src={b.photos[1]} alt={'Ambiente de '+b.name}/></button>
      <button className="cpl-photo" type="button" onClick={()=>{setPhoto(2);setGallery(true)}}><img src={b.photos[2]} alt={'Detalhes de '+b.name}/></button>
     </div>
     <button className="cpl-gallery-button" type="button" onClick={()=>{setPhoto(0);setGallery(true)}}><I n="grid" s={14}/> Ver fotos</button>
    </div>

    <div className="cpl-identity">
     <div className="cpl-logo"><img src={b.logo} alt=""/></div>
     <div className="cpl-copy"><span className="cpl-kicker">EMPRESA LOCAL</span><p>{b.description}</p><div className="cpl-rating"><Stars/><strong>{b.rating}</strong><span>{b.reviews}</span></div><div className="cpl-tags"><span>Consumo no local</span><span>Delivery</span><span>Retirada</span></div></div>
     <div className="cpl-actions"><button type="button" className={saved?'active':''} onClick={()=>setSaved(v=>!v)}><I n="heart" s={16} fill={saved}/>{saved?'Salvo':'Salvar'}</button><button type="button" onClick={share}><I n="share" s={16}/>Compartilhar</button></div>
    </div>
    <div className="cpl-primary"><a className="wa" href={wa} target="_blank" rel="noreferrer"><I n="phone" s={16}/> Falar no WhatsApp</a><a href="https://www.google.com/maps/search/?api=1&query=Rua+Gustavo+Richard+245+Laguna+SC"><I n="pin" s={16}/> Como chegar</a></div>
   </section>

   <div className="cpl-layout">
    <div className="cpl-main-column">
     <section className="cpl-panel" id="sobre">
      <div className="cpl-title"><span>SOBRE O ESTABELECIMENTO</span><h2>Informações essenciais</h2></div>
      <p>{b.description} Localizado no Centro Histórico, o espaço foi pensado para unir experiência local, atendimento direto e conforto para moradores e visitantes.</p>
      <div className="cpl-info">
       <div><I n="pin" s={17}/><strong>Localização</strong><small>{b.address}</small></div>
       <div><I n="clock" s={17}/><strong>Funcionamento</strong><small>Hoje: 11:30–14:30 · 18:00–23:00</small></div>
       <div><I n="phone" s={17}/><strong>Contato</strong><small>WhatsApp direto · resposta rápida</small></div>
       <div><I n="check" s={17}/><strong>Serviços</strong><small>Consumo no local · Delivery · Retirada</small></div>
      </div>
      <div className="cpl-promo"><div><span>{b.promo[0]}</span><strong>{b.promo[1]}</strong><small>{b.promo[2]}</small></div><b>{b.promo[3]}</b></div>
     </section>

     <section className="cpl-panel" id="pedidos">
      <div className="cpl-title"><span>DESTAQUES</span><h2>Mais pedidos no local</h2></div>
      <div className="cpl-orders">{b.orders.map(x=><article key={x[0]}><div><strong>{x[0]}</strong><p>{x[1]}</p></div><b>{x[2]}</b></article>)}</div>
     </section>

     <section className="cpl-panel" id="endereco">
      <div className="cpl-title-row"><div className="cpl-title"><span>LOCALIZAÇÃO</span><h2>Endereço e rota</h2></div><a href="https://www.google.com/maps/search/?api=1&query=Rua+Gustavo+Richard+245+Laguna+SC">Abrir no Google Maps →</a></div>
      <p className="cpl-address">{b.address}</p>
      <div className="cpl-mapbox"><I n="pin" s={24}/><div><strong>Centro Histórico, Laguna</strong><small>Rota direta para a localização simulada da empresa.</small></div></div>
     </section>
    </div>

    <aside className="cpl-sidebar">
     <div className="cpl-side cpl-side-sticky">
      <small>FALAR COM A EMPRESA</small>
      <h3>Resolva a dúvida antes de sair da página.</h3>
      <p>Confirme horário, disponibilidade, entrega ou peça informações diretamente pelo WhatsApp.</p>
      <a className="wa" href={wa} target="_blank" rel="noreferrer"><I n="phone" s={16}/> Pedir pelo WhatsApp</a>
      <a className="cpl-phone" href="tel:+554836440000"><I n="phone" s={14}/> (48) 3644-0000</a>
     </div>

     <div className="cpl-side">
      <div className="cpl-side-title"><small>HORÁRIOS</small><span>Aberto agora</span></div>
      <ul className="cpl-hours">{b.hours.map(([day,time])=><li key={day} className={day.startsWith('Segunda')?'today':''}><strong>{day}</strong><span>{time}</span></li>)}</ul>
      <small className="cpl-note"><I n="clock" s={13}/> Horários podem mudar em feriados. Confirme pelo WhatsApp.</small>
     </div>

     <div className="cpl-side cpl-reputation"><small>REPUTAÇÃO</small><div><strong>{b.rating}</strong><Stars/></div><p>{b.reviews} · avaliações simuladas para testar confiança.</p></div>
    </aside>
   </div>
  </div></main>

  <nav className="cpl-bottom" aria-label="Ações rápidas"><a href="#topo"><I n="grid" s={17}/><span>Perfil</span></a><button className={saved?'active':''} onClick={()=>setSaved(v=>!v)}><I n="heart" s={17} fill={saved}/><span>{saved?'Salvo':'Salvar'}</span></button><a className="wa" href={wa}><I n="phone" s={17}/><span>WhatsApp</span></a><a href="https://www.google.com/maps/search/?api=1&query=Rua+Gustavo+Richard+245+Laguna+SC"><I n="pin" s={17}/><span>Mapa</span></a></nav>

  {gallery&&<div className="cpl-modal" role="dialog" aria-modal="true" onClick={()=>setGallery(false)}><button type="button" aria-label="Fechar" onClick={()=>setGallery(false)}>×</button><img src={b.photos[photo]} alt="" onClick={e=>e.stopPropagation()}/><button className="prev" type="button" aria-label="Foto anterior" onClick={e=>{e.stopPropagation();setPhoto(i=>(i-1+b.photos.length)%b.photos.length)}}>‹</button><button className="next" type="button" aria-label="Próxima foto" onClick={e=>{e.stopPropagation();setPhoto(i=>(i+1)%b.photos.length)}}>›</button></div>}
 </div>
}
