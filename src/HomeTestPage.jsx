import React,{useEffect,useMemo,useState} from 'react'
import './home-test.css'

const cityData={
 laguna:{name:'Laguna',state:'SC',subtitle:'Empresas, serviços e experiências locais de Laguna.',neighborhoods:['Mar Grosso','Centro Histórico','Magalhães','Cabeçuda','Portinho','Farol de Santa Marta'],categories:[
  ['alimentacao','Alimentação','42 opções','utensils'],['hospedagem','Hospedagem','16 opções','bed'],['saude','Saúde','28 opções','heart'],['automotivo','Automotivo','21 opções','car'],['moda','Moda','19 opções','shirt'],['servicos','Serviços','35 opções','wrench'],['beleza','Beleza','17 opções','sparkle'],['turismo','Turismo','14 opções','compass'],['casa','Casa & Construção','23 opções','home'],['pets','Pets','11 opções','paw']
 ],businesses:[
  ['Bistrô Laguna','Alimentação','Bistrô','Centro Histórico','4,9','open','Aberto agora','Cozinha contemporânea com ingredientes locais.',true,false,'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=84'],
  ['Pousada Farol do Mar','Hospedagem','Pousada','Farol de Santa Marta','4,8','open','Aberto agora','Hospedagem a poucos minutos das praias do Farol.',true,false,'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=84'],
  ['Clínica Vida Sul','Saúde','Clínica','Magalhães','4,9','closed','Abre às 13:30','Atendimento multiprofissional para toda a família.',true,false,'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=84'],
  ['Auto Center Laguna','Automotivo','Automotivo','Portinho','4,7','open','Aberto agora','Manutenção, revisão e serviços rápidos para seu carro.',true,false,'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=84'],
  ['Maré Alta Moda','Moda','Moda','Mar Grosso','4,8','open','Aberto agora','Moda casual e praia para toda a família.',true,false,'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=84'],
  ['Medeiros Materiais','Casa & Construção','Materiais','Cabeçuda','4,8','closed','Abre às 08:00','Materiais e soluções para obras e reformas.',true,true,'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=1200&q=84'],
  ['Studio Orla','Beleza','Beleza','Mar Grosso','4,9','open','Aberto agora','Cabelo, estética e cuidados com atendimento agendado.',true,false,'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=84'],
  ['Lagoa Ecotur','Turismo','Experiências','Centro Histórico','4,9','open','Aberto agora','Passeios e experiências para conhecer Laguna de outro jeito.',true,false,'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=84'],
 ]},
 tubarao:{name:'Tubarão',state:'SC',subtitle:'Empresas, serviços e experiências locais de Tubarão.',neighborhoods:['Centro','Dehon','Oficinas','Humaitá','Vila Moema'],categories:[
  ['alimentacao','Alimentação','58 opções','utensils'],['hospedagem','Hospedagem','19 opções','bed'],['saude','Saúde','34 opções','heart'],['automotivo','Automotivo','27 opções','car'],['moda','Moda','24 opções','shirt'],['servicos','Serviços','41 opções','wrench'],['beleza','Beleza','22 opções','sparkle'],['turismo','Turismo','12 opções','compass'],['casa','Casa & Construção','31 opções','home'],['pets','Pets','15 opções','paw']
 ],businesses:[
  ['Vila Moema Café','Alimentação','Café','Vila Moema','4,9','open','Aberto agora','Cafés especiais, brunch e doces artesanais.',true,true,'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=84'],
  ['Hotel Vale do Tubarão','Hospedagem','Hotel','Centro','4,7','open','Aberto agora','Hospedagem prática no centro de Tubarão.',true,false,'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=84'],
  ['Clínica Mais Saúde','Saúde','Clínica','Oficinas','4,8','closed','Abre às 13:30','Especialidades e atendimento integrado.',true,false,'https://images.unsplash.com/photo-1580281658628-6a6c22fc9c0d?auto=format&fit=crop&w=1200&q=84'],
  ['Sul Motors','Automotivo','Automotivo','Humaitá','4,8','open','Aberto agora','Serviços automotivos e revisão preventiva.',true,false,'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=84'],
  ['Estilo Moema','Moda','Moda','Vila Moema','4,9','open','Aberto agora','Moda feminina e acessórios selecionados.',true,false,'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=84'],
  ['Casa Forte Materiais','Casa & Construção','Materiais','Humaitá','4,7','closed','Abre às 08:00','Materiais para construção, acabamento e reforma.',true,true,'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=84'],
  ['Essenza Studio','Beleza','Beleza','Dehon','4,9','open','Aberto agora','Beleza, unhas e estética em um espaço completo.',true,false,'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=84'],
  ['Rota Sul Turismo','Turismo','Experiências','Centro','4,8','open','Aberto agora','Roteiros e experiências para explorar o Sul de SC.',true,false,'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=84'],
 ]}
}

const paths={
 search:<><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></>,map:<><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15"/><path d="M15 6v15"/></>,
 utensils:<><path d="M7 3v7"/><path d="M4 3v3a3 3 0 0 0 6 0V3"/><path d="M7 10v11"/><path d="M17 3v18"/><path d="M17 3c2 0 3 2 3 4v2h-3"/></>,bed:<><path d="M3 17v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5"/><path d="M3 17h18"/><path d="M5 10V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><path d="M3 20v-3"/><path d="M21 20v-3"/></>,
 heart:<><path d="M20.8 8.7c0 5.1-8.8 10.6-8.8 10.6S3.2 13.8 3.2 8.7a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></>,car:<><path d="m5 17-1 2"/><path d="m19 17 1 2"/><path d="M3 17h18"/><path d="m5 17 1.2-6h11.6L19 17"/><path d="M7.5 11 9 7h6l1.5 4"/><path d="M7 17h.01"/><path d="M17 17h.01"/></>,
 shirt:<><path d="m8 5 4 3 4-3 5 3-3 5-3-2v9H9v-9l-3 2-3-5 5-3Z"/></>,wrench:<><path d="M14.7 6.3a4.2 4.2 0 0 0-5.3-5l3.1 3.1-2.4 2.4L7 3.7a4.2 4.2 0 0 0 5 5.3l6.8 6.8a2 2 0 0 1-2.8 2.8l-6.8-6.8a4.2 4.2 0 0 1-5-5.3l3.1 3.1 2.4-2.4-3.1-3.1a4.2 4.2 0 0 1 5 5.3"/></>,
 sparkle:<><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></>,compass:<><circle cx="12" cy="12" r="9"/><path d="m14.8 9.2-1.7 3.9-3.9 1.7 1.7-3.9 3.9-1.7Z"/></>,home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v10h14V9"/><path d="M9 19v-6h6v6"/></>,paw:<><path d="M8.5 11.5c-2.4-.5-4.5.7-4.5 2.7 0 2 2 3.2 4.1 2.7 1.3-.3 2.2-.2 3.9 1 1.7-1.2 2.6-1.3 3.9-1 2.1.5 4.1-.7 4.1-2.7 0-2-2.1-3.2-4.5-2.7"/></>,message:<path d="M20 11a8 8 0 0 1-8 8 8.8 8.8 0 0 1-3.5-.7L4 20l1.4-3.5A8 8 0 1 1 20 11Z"/>,star:<><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></>,check:<path d="m5 12 4 4L19 6"/>,arrow:<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,heartFill:<path d="M20.8 8.7c0 5.1-8.8 10.6-8.8 10.6S3.2 13.8 3.2 8.7a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" fill="currentColor" stroke="none"/>
}

const Icon=({name,size=18})=><svg className="home-lab-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.check}</svg>
const WhatsAppIcon=()=> <svg className="home-lab-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.2 11.7A8.1 8.1 0 0 1 8.3 19L4 20l1.2-4.1A8.1 8.1 0 1 1 20.2 11.7Z"/><path d="M8.7 8.3c.2-.4.4-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .5-.2.7l-.6.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.6c.2-.2.5-.3.7-.2l1.7.7c.3.1.4.3.4.5v.5c0 .4-.1.6-.5.8-.5.2-1.1.3-1.7.1-1.6-.5-3.1-1.5-4.3-2.7-1.2-1.2-2.2-2.7-2.7-4.3-.2-.6-.1-1.2.1-1.7Z"/></svg>

function HomeLabLogo(){return <a href="/home-teste" className="home-lab-logo" aria-label="VitrineLocal Home Lab"><span className="home-lab-mark">V</span><span className="home-lab-wordmark">VitrineLocal</span><small>LAB</small></a>}

function BusinessCard({item}){
 const [name,category,label,neighborhood,rating,status,statusLabel,description,whatsapp,delivery,image]=item
 const message=encodeURIComponent('Olá! Encontrei '+name+' na VitrineLocal e gostaria de saber mais.')
 return <article className="home-lab-business-card">
  <div className="home-lab-image-wrap">
   <img src={image} alt={name} loading="lazy" decoding="async"/>
   <span className="home-lab-photo-badge">{label}</span>
   <span className={'home-lab-status-badge '+(status==='open'?'open':'closed')}><i className="home-lab-status-dot"/> {statusLabel}</span>
   <button className="home-lab-save" type="button" aria-label={'Salvar '+name}><Icon name="heartFill" size={17}/></button>
  </div>
  <div className="home-lab-business-content">
   <div className="home-lab-card-title-row"><h3>{name}</h3><span className="home-lab-verified" title="Empresa verificada"><Icon name="check" size={13}/></span></div>
   <p className="home-lab-description">{description}</p>
   <div className="home-lab-meta-line"><span><Icon name="map" size={14}/>{neighborhood}</span><span><Icon name="star" size={13}/> {rating}</span></div>
   <div className="home-lab-card-actions"><a className="home-lab-whatsapp" href={'https://wa.me/5548999999999?text='+message} target="_blank" rel="noreferrer"><WhatsAppIcon/> WhatsApp</a><a className="home-lab-profile-link" href="#perfil">Ver perfil</a></div>
  </div>
 </article>
}

export default function HomeTestPage(){
 const [citySlug,setCitySlug]=useState('laguna'),[query,setQuery]=useState(''),[location,setLocation]=useState(''),[submittedSearch,setSubmittedSearch]=useState(''),[submittedLocation,setSubmittedLocation]=useState(''),[activeFilter,setActiveFilter]=useState('all'),[mobileNav,setMobileNav]=useState('home')
 const city=cityData[citySlug]
 useEffect(()=>{
  const previousTitle=document.title
  const canonical=document.querySelector('link[rel="canonical"]')
  const previousCanonical=canonical?.getAttribute('href')||null
  document.title='Home Lab | VitrineLocal'
  if(canonical)canonical.setAttribute('href',window.location.origin+'/home-teste')
  let robots=document.querySelector('meta[name="robots"]');const created=!robots
  if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots)}
  const previousRobots=robots.getAttribute('content');robots.setAttribute('content','noindex,nofollow,noarchive')
  return()=>{document.title=previousTitle;if(canonical){if(previousCanonical)canonical.setAttribute('href',previousCanonical);else canonical.removeAttribute('href')}if(robots){if(created)robots.remove();else if(previousRobots)robots.setAttribute('content',previousRobots)}}
 },[])
 useEffect(()=>{setQuery('');setLocation('');setSubmittedSearch('');setSubmittedLocation('');setActiveFilter('all')},[citySlug])
 const filteredBusinesses=useMemo(()=>{
  const s=submittedSearch.trim().toLowerCase(),l=submittedLocation.trim().toLowerCase()
  return city.businesses.filter(item=>{
   const text=item.slice(0,8).join(' ').toLowerCase()
   return (!s||text.includes(s))&&(!l||item[3].toLowerCase()===l)&&(activeFilter==='all'||(activeFilter==='open'&&item[5]==='open')||(activeFilter==='whatsapp'&&item[8])||(activeFilter==='rating'&&Number(item[4].replace(',','.'))>=4.9)||(activeFilter==='delivery'&&item[9]))
  })
 },[activeFilter,city,submittedLocation,submittedSearch])
 const search=e=>{e.preventDefault();setSubmittedSearch(query);setSubmittedLocation(location)}
 const categorySearch=name=>{setQuery(name);setSubmittedSearch(name);setSubmittedLocation('')}
 const quickSearch=name=>{setQuery(name);setSubmittedSearch(name);setSubmittedLocation('')}
 const quickAction=action=>{
  if(action==='open'||action==='whatsapp'){setActiveFilter(action);setSubmittedSearch('');setSubmittedLocation('');return}
  if(action==='food'){quickSearch('Alimentação');return}
  if(action==='hotel'){quickSearch('Hospedagem')}
 }
 const filter=id=>setActiveFilter(activeFilter===id?'all':id)
 const clear=()=>{setQuery('');setLocation('');setSubmittedSearch('');setSubmittedLocation('');setActiveFilter('all')}

 return <div className="home-lab-page">
  <div id="topo" className="home-lab-labbar"><div className="home-lab-container home-lab-labbar-inner"><span className="home-lab-labtag">HOME LAB</span><strong>Protótipo isolado de Design & UX</strong><span className="home-lab-labnote">Dados simulados · sem banco de dados · sem alterações na Home oficial</span><a href="/">← Home oficial</a></div></div>
  <header className="home-lab-header"><div className="home-lab-container home-lab-header-inner">
   <HomeLabLogo/>
   <nav className="home-lab-desktop-nav"><a href="#categorias">Categorias</a><a href="#empresas">Empresas</a><a href="#descobertas">Descobrir</a></nav>
   <div className="home-lab-header-actions"><a href="#anunciar" className="home-lab-outline-button">Cadastrar empresa</a><a href="/usuario/login" className="home-lab-login">Entrar</a></div>
  </div></header>
  <main>
   <section className="home-lab-hero"><div className="home-lab-container home-lab-hero-inner">
    <div className="home-lab-hero-top">
     <div className="home-lab-hero-copy"><span className="home-lab-kicker"><Icon name="map" size={13}/> GUIA COMERCIAL REGIONAL</span><h1>Comércios e serviços locais</h1></div>
     <div className="home-lab-city-switcher" aria-label="Selecionar cidade">
      <button type="button" className={citySlug==='laguna'?'active':''} onClick={()=>setCitySlug('laguna')}><Icon name="map" size={14}/> Laguna - SC</button>
      <button type="button" className={citySlug==='tubarao'?'active':''} onClick={()=>setCitySlug('tubarao')}>Tubarão - SC</button>
     </div>
    </div>
    <p className="home-lab-hero-subtitle">Encontre empresas, serviços, lugares e ofertas em <strong>{city.name}</strong>. Pesquise por atividade e refine por bairro para chegar mais rápido ao que precisa.</p>
    <form className="home-lab-search-shell" onSubmit={search}>
     <label className="home-lab-search-field"><span className="home-lab-search-icon"><Icon name="search"/></span><span><small>O que procura?</small><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="padaria, eletricista, hotel..." aria-label="O que procura"/></span></label>
     <label className="home-lab-search-field"><span className="home-lab-search-icon"><Icon name="map"/></span><span><small>Bairro / Região</small><select value={location} onChange={e=>setLocation(e.target.value)} aria-label="Bairro ou Região"><option value="">Toda a cidade</option>{city.neighborhoods.map(n=><option key={n}>{n}</option>)}</select></span></label>
     <button className="home-lab-search-button" type="submit"><Icon name="search" size={17}/> Buscar</button>
    </form>
    <div className="home-lab-hero-context"><div className="home-lab-quick-wrap"><span>Atalhos:</span><div className="home-lab-quick-links">
  <button type="button" onClick={()=>quickAction('open')}><i className="home-lab-quick-dot"/>Aberto agora</button>
  <button type="button" onClick={()=>quickAction('whatsapp')}><Icon name="message" size={13}/>WhatsApp Direto</button>
  <button type="button" onClick={()=>quickAction('food')}>Gastronomia &amp; Pizzas</button>
  <button type="button" onClick={()=>quickAction('hotel')}>Pousadas &amp; Hotéis</button>
 </div></div>
 <div className="home-lab-city-note"><Icon name="map" size={16}/><span>Explorando <strong>{city.name}</strong> · {city.neighborhoods.slice(0,3).join(' · ')}</span></div>
</div>
   </div></section>

   <section className="home-lab-filter-strip"><div className="home-lab-container home-lab-filter-inner"><span className="home-lab-filter-label">Filtrar</span>{[['open','Aberto agora','check'],['whatsapp','Com WhatsApp','message'],['rating','Mais bem avaliados','star'],['delivery','Com Delivery','arrow']].map(f=><button key={f[0]} type="button" className={'home-lab-filter-chip '+(activeFilter===f[0]?'active':'')} onClick={()=>filter(f[0])}><Icon name={f[2]} size={14}/>{f[1]}</button>)}</div></section>

   <section id="categorias" className="home-lab-section home-lab-categories-section"><div className="home-lab-container"><div className="home-lab-section-head"><span className="home-lab-section-kicker">EXPLORAR {city.name.toUpperCase()}</span><h2>Escolha uma categoria</h2><p>Atalhos para chegar ao que você procura sem navegar por telas desnecessárias.</p></div><div className="home-lab-category-scroller">{city.categories.map(c=><button type="button" className="home-lab-category-card" key={c[0]} onClick={()=>categorySearch(c[1])}><span className="home-lab-category-icon"><Icon name={c[3]} size={20}/></span><strong>{c[1]}</strong><small>{c[2]}</small></button>)}</div></div></section>

   <section id="empresas" className="home-lab-section"><div className="home-lab-container"><div className="home-lab-results-head"><div><span className="home-lab-section-kicker">NEGÓCIOS LOCAIS</span><h2>Empresas em destaque</h2><p>{filteredBusinesses.length?'Resultados simulados para testar descoberta, confiança e conversão em '+city.name+'.':'Tente outra busca ou remova um filtro para continuar explorando.'}</p></div><span className="home-lab-results-context"><Icon name="map" size={15}/>{city.name} - {city.state}</span></div>
    {filteredBusinesses.length?<div className="home-lab-business-grid">{filteredBusinesses.map((item,i)=><React.Fragment key={item[0]}><BusinessCard item={item}/>{i===7&&filteredBusinesses.length>8?<aside className="home-lab-b2b-banner"><div className="home-lab-b2b-icon"><Icon name="sparkle" size={20}/></div><div><span>PARA EMPRESAS</span><strong>Possui um negócio em {city.name}?</strong><p>Apareça para quem busca seus produtos e serviços hoje.</p></div><a href="#anunciar">Cadastrar empresa <Icon name="arrow" size={14}/></a></aside>:null}</React.Fragment>)}</div>:<div className="home-lab-empty-state"><strong>Nenhum resultado nesta simulação.</strong><span>Experimente outra busca, bairro ou filtro.</span><button type="button" onClick={clear}>Limpar filtros</button></div>}
   </div></section>

   <section id="descobertas" className="home-lab-section home-lab-discovery-section"><div className="home-lab-container"><div className="home-lab-section-head"><span className="home-lab-section-kicker">DESCOBRIR</span><h2>Mais motivos para abrir o VitrineLocal</h2><p>Áreas de conteúdo pensadas para recorrência, utilidade e intenção local.</p></div><div className="home-lab-discovery-grid">
    <article><span className="home-lab-discovery-index">01</span><Icon name="star"/><h3>Promoções locais</h3><p>Ofertas relevantes publicadas por empresas da cidade, sem ruído.</p><a href="#empresas">Ver oportunidades <Icon name="arrow" size={14}/></a></article>
    <article><span className="home-lab-discovery-index">02</span><Icon name="map"/><h3>Agenda e experiências</h3><p>Eventos, lugares e atividades organizados por cidade e intenção.</p><a href="#anunciar">Explorar agenda <Icon name="arrow" size={14}/></a></article>
    <article><span className="home-lab-discovery-index">03</span><Icon name="message"/><h3>Contato direto</h3><p>Chegue ao negócio por WhatsApp quando a decisão estiver pronta.</p><a href="#empresas">Testar conversão <Icon name="arrow" size={14}/></a></article>
   </div></div></section>

   <section id="anunciar" className="home-lab-merchant-cta"><div className="home-lab-container home-lab-merchant-inner"><div><span className="home-lab-section-kicker">PARA COMERCIANTES</span><h2>Quer colocar sua empresa diante de quem já está procurando?</h2><p>Cadastre o negócio, destaque serviços e transforme busca local em contato.</p></div><a href="/usuario/cadastro" className="home-lab-primary-button">Cadastrar empresa <Icon name="arrow" size={15}/></a></div></section>
  </main>
  <nav className="home-lab-bottom-nav" aria-label="Navegação móvel">
 <div className="home-lab-bottom-nav-inner">
  <a href="#topo" className={mobileNav==='home'?'active':''} onClick={()=>setMobileNav('home')} aria-current={mobileNav==='home'?'page':undefined}><Icon name="home"/><span>Início</span></a>
  <a href="#categorias" className={mobileNav==='explore'?'active':''} onClick={()=>setMobileNav('explore')}><Icon name="compass"/><span>Categorias</span></a>
  <a href="#empresas" className={mobileNav==='saved'?'active':''} onClick={()=>setMobileNav('saved')}><Icon name="heart"/><span>Salvos</span></a>
  <a href="#anunciar" className={mobileNav==='announce'?'active':''} onClick={()=>setMobileNav('announce')}><Icon name="sparkle"/><span>Anunciar</span></a>
 </div>
</nav>
  <footer className="home-lab-footer"><div className="home-lab-container home-lab-footer-inner"><HomeLabLogo/><span>Home Lab · Dados simulados · Nenhum acesso ao banco nesta página</span><a href="/">Ir para a Home oficial</a></div></footer>
 </div>
}
