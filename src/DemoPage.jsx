import React,{useEffect,useMemo,useState} from "react"
import {supabase} from "./supabase-client.js"
import Icon from "./ui-icons.jsx"
import CityHomePage from "./CityHomePage.jsx"
import EventsPage from "./EventsPage.jsx"
import "./account-modern.css"
import "./account-workspace.css"
import "./modern-business-profile.css"
import "./modern-business-profile-refinement.css"
import "./commercial-analytics.css"
import "./demo.css"

const TABS=[["home","Início"],["businesses","Empresas"],["promotions","Promoções"],["events","Eventos"],["profile","Perfil da empresa"],["account","Minha conta"]]
const ACCOUNT_NAV=[["overview","grid","Visão geral"],["company","briefcase","Minha empresa"],["media","image","Mídias"],["items","grid","Produtos e serviços"],["promotions","tag","Promoções"],["analytics","grid","Desempenho"],["plan","tag","Meu plano"]]
const LIMITS={photos:100,items:200,promotions:20}
const slugify=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")
const money=value=>value==null||value===""?"":"R$ "+Number(value).toFixed(2).replace(".",",")

export default function DemoPage(){
 useEffect(()=>{document.body.classList.add("demo-active");return()=>document.body.classList.remove("demo-active")},[])
 const [tab,setTab]=useState("home"),[accountSection,setAccountSection]=useState("overview"),[city,setCity]=useState(null),[businesses,setBusinesses]=useState([]),[categories,setCategories]=useState([]),[selectedId,setSelectedId]=useState(""),[promotions,setPromotions]=useState([]),[photos,setPhotos]=useState([]),[items,setItems]=useState([]),[premiumPlan,setPremiumPlan]=useState(null),[loading,setLoading]=useState(true),[dataError,setDataError]=useState("")
 useEffect(()=>{let live=true;(async()=>{
  if(!supabase){setLoading(false);return}
  const {data:cityRow}=await supabase.from("cities").select("id,name,state,slug,active").eq("slug","laguna").eq("active",true).maybeSingle()
  if(!live)return
  setCity(cityRow||null)
  if(!cityRow){setLoading(false);return}
  const [businessRes,promoRes,planRes,categoryRes]=await Promise.all([
   supabase.from("demo_public_business_directory").select("*").eq("city_id",cityRow.id).order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(100),
   supabase.from("promotions").select("id,title,description,price,original_price,image_url,status,business_id,starts_at,ends_at").eq("status","published").order("created_at",{ascending:false}).limit(100),
   supabase.from("plans").select("id,code,name,price_monthly,features,active").eq("code","premium").eq("active",true).maybeSingle(),
   supabase.from("categories").select("id,name,slug,icon").eq("active",true).order("sort_order").order("name")
  ])
  if(!live)return
  let sourceRows=businessRes.data||[]
  if(!sourceRows.length){
   const fallback=await supabase.from("businesses").select("id,name,slug,short_description,description,cover_url,logo_url,address,neighborhood,phone,whatsapp,featured,verified,created_at,city_id,category_id,opening_hours,has_delivery,has_pickup,has_dine_in").eq("city_id",cityRow.id).eq("status","active").order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(100)
   sourceRows=fallback.data||[]
   if(fallback.error&&!sourceRows.length)setDataError("Não foi possível carregar as empresas da demonstração.")
  }
  const categoryMap=new Map((categoryRes.data||[]).map(row=>[row.id,row]))
  const rows=sourceRows.map(row=>{const category=categoryMap.get(row.category_id);return {...row,city_name:cityRow.name,city_state:cityRow.state,category_name:row.category_name||category?.name||null,category_slug:row.category_slug||category?.slug||null,categories:row.category_name?{name:row.category_name,slug:row.category_slug}:category||null}})
  const uniqueCategories=[],seen=new Set()
  const categoryRows=categoryRes.data||[]
  categoryRows.forEach(row=>{if(seen.has(row.name))return;seen.add(row.name);uniqueCategories.push({name:row.name,slug:row.slug||slugify(row.name),icon:row.icon||"grid"})})
  rows.forEach(row=>{if(row.category_name&&!seen.has(row.category_name)){seen.add(row.category_name);uniqueCategories.push({name:row.category_name,slug:row.category_slug||slugify(row.category_name),icon:row.categories?.icon||"grid"})}})
  setBusinesses(rows);setCategories(uniqueCategories);setSelectedId(rows.find(row=>row.slug==="teste")?.id||rows.find(row=>row.featured)?.id||rows[0]?.id||"");setPromotions(promoRes.data||[]);setPremiumPlan(planRes.data||null);setLoading(false)
 })();return()=>{live=false}},[])
 useEffect(()=>{let live=true;if(!selectedId||!supabase){setPhotos([]);setItems([]);return()=>{}}
  ;(async()=>{const [photosRes,itemsRes]=await Promise.all([
   supabase.from("business_photos").select("id,url,alt_text,sort_order,media_type").eq("business_id",selectedId).order("sort_order").limit(100),
   supabase.from("business_items").select("id,business_id,type,name,description,price,image_url,active,sort_order").eq("business_id",selectedId).order("sort_order").limit(200)
  ]);if(!live)return;setPhotos(photosRes.data||[]);setItems(itemsRes.data||[])})()
  return()=>{live=false}
 },[selectedId])
 const selected=useMemo(()=>businesses.find(row=>row.id===selectedId)||businesses[0]||null,[businesses,selectedId])
 const selectedPromotions=useMemo(()=>promotions.filter(row=>row.business_id===selected?.id),[promotions,selected?.id])
 const navigateDemo=event=>{
  const anchor=event.target.closest?.("a[href]");if(!anchor)return
  const href=anchor.getAttribute("href");if(!href||href.startsWith("#")||href.startsWith("http")||href.startsWith("mailto:")||href.startsWith("tel:"))return
  let url;try{url=new URL(href,window.location.origin)}catch{return}
  const path=url.pathname
  if(path==="/laguna"||path==="/"){event.preventDefault();setTab("home");return}
  if(path==="/laguna/empresas"){event.preventDefault();setTab("businesses");return}
  if(path==="/laguna/promocoes"){event.preventDefault();setTab("promotions");return}
  if(path==="/laguna/eventos"){event.preventDefault();setTab("events");return}
  const match=path.match(/^\/laguna\/empresa\/(.+)$/)
  if(match){event.preventDefault();const business=businesses.find(row=>row.slug===decodeURIComponent(match[1]));if(business){setSelectedId(business.id);setTab("profile")}return}
  if(path.startsWith("/conta")||path==="/planos"){event.preventDefault();setAccountSection(path==="/planos"?"plan":"overview");setTab("account")}
 }
 if(loading)return <div className="demo-loading"><span className="demo-kicker">MODO DEMONSTRAÇÃO</span><h1>Preparando o VitrineLocal…</h1><p>Carregando a estrutura visual e os dados públicos atuais.</p></div>
 if(!city)return <div className="demo-loading"><h1>Demo indisponível</h1><p>A cidade Laguna não está disponível no catálogo público.</p></div>
 if(dataError&&tab==="businesses"&&!businesses.length)return <main className="demo-shell"><div className="demo-loading"><h1>Catálogo temporariamente indisponível</h1><p>{dataError}</p><button className="demo-retry-button" onClick={()=>window.location.reload()}>Tentar novamente</button></div></main>
 return <main className="demo-shell">
  <section className="demo-banner"><div><span className="demo-kicker">VITRINELOCAL · DEMO</span><strong>Demonstração completa e interativa</strong><p>Experiência visual do projeto principal, com dados públicos atuais e ambiente 100% somente leitura.</p></div><div className="demo-banner-actions"><span className="demo-premium"><Icon name="star" size={13}/> Experiência Premium</span><span className="demo-readonly-top"><Icon name="lock" size={12}/> Sem login · sem edição</span></div></section>
  <nav className="demo-nav" aria-label="Navegação da demonstração">{TABS.map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{label}</button>)}<span className="demo-nav-spacer"/><span className="demo-readonly"><Icon name="lock" size={12}/> Somente visualização</span></nav>
  <div className="demo-stage" onClick={navigateDemo}>
   {tab==="home"&&<div className="demo-embedded demo-home-view"><CityHomePage citySlug={city.slug}/></div>}
   {tab==="businesses"&&<DemoBusinesses businesses={businesses} categories={categories} city={city} onProfile={id=>{setSelectedId(id);setTab("profile")}}/>}
   {tab==="promotions"&&<DemoPromotions city={city} promotions={promotions} businesses={businesses}/>}
   {tab==="events"&&<div className="demo-embedded demo-events-view"><EventsPage supabase={supabase} city={city} onBack={()=>setTab("home")}/></div>}
   {tab==="profile"&&selected&&<DemoProfile city={city} business={selected} photos={photos} items={items} promotions={selectedPromotions}/>}
   {tab==="account"&&selected&&<DemoAccount businesses={businesses} selected={selected} onSelect={setSelectedId} photos={photos} items={items} promotions={selectedPromotions} plan={premiumPlan} section={accountSection} setSection={setAccountSection}/>}
  </div>
 </main>
}

function DemoBusinesses({businesses,categories,city,onProfile}){
 const [query,setQuery]=useState(""),[category,setCategory]=useState("")
 const filtered=useMemo(()=>{const term=query.trim().toLowerCase();return businesses.filter(row=>{const text=[row.name,row.short_description,row.description,row.address,row.neighborhood,row.category_name].filter(Boolean).join(" ").toLowerCase();return(!term||text.includes(term))&&(!category||row.category_slug===category||slugify(row.category_name)===category)})},[businesses,query,category])
 return <div className="demo-businesses-page mbl-shell"><div className="mbl-page">
  <div className="mbl-breadcrumb"><span className="demo-inline-link">Voltar para {city.name}</span><span>{city.name}</span><span>›</span><strong>Empresas</strong></div>
  <section className="mbl-hero"><div><span className="mbl-kicker">CATÁLOGO LOCAL · DEMO</span><h1>Empresas em {city.name}</h1><p>Empresas reais cadastradas no projeto principal, consultadas sem alterar nenhum dado.</p></div><div className="mbl-result-count"><strong>{filtered.length}</strong><span>{filtered.length===1?"resultado":"resultados"}</span></div></section>
  <section className="mbl-toolbar"><div className="mbl-toolbar-row"><div className="mbl-search-large"><Icon name="search" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa, serviço ou bairro"/></div><button className="mbl-clear" onClick={()=>{setQuery("");setCategory("")}}>Limpar filtros</button></div><div className="mbl-chips"><button className={!category?"active":""} onClick={()=>setCategory("")}>Todos</button>{categories.map(cat=><button key={cat.slug} className={category===cat.slug?"active":""} onClick={()=>setCategory(cat.slug)}>{cat.name}</button>)}</div><div className="mbl-sort-row"><span className="mbl-sort-label">Ordenar por</span><select className="mbl-sort-select" defaultValue="relevancia"><option value="relevancia">Relevância</option></select></div></section>
  {filtered.length?<section className="mbl-grid" aria-label="Empresas encontradas">{filtered.map(b=><article className="mbl-card" key={b.id}><div className="mbl-card-main demo-readonly-card" role="button" tabIndex={0} onClick={()=>onProfile(b.id)} onKeyDown={e=>{if(e.key==="Enter")onProfile(b.id)}}><div className="mbl-cover">{b.cover_url?<img src={b.cover_url} alt="" loading="lazy"/>:<div className="mbl-cover-placeholder"><Icon name="store" size={30}/></div>}{b.search_featured&&<span className="mbl-search-featured">Busca em destaque</span>}{b.featured&&<span className="mbl-featured">Destaque</span>}{b.verified&&<span className="mbl-verified"><Icon name="check" size={11}/> Verificada</span>}{b.logo_url&&<span className="mbl-logo"><img src={b.logo_url} alt="" loading="lazy"/></span>}</div><div className="mbl-body"><div className="mbl-category"><span>{b.category_name||"Empresa"}</span><span className="mbl-rating-inline">Ainda sem avaliações</span></div><h2>{b.name}</h2><p>{b.short_description||b.description||"Conheça este negócio local."}</p><div className="mbl-footer"><span><Icon name="pin" size={11}/>{b.neighborhood||b.address||city.name+" - "+city.state}</span><strong aria-label="Sem avaliações"><span className="mbl-stars">{[0,1,2,3,4].map(index=><Icon key={index} name="star" size={12}/>)}</span></strong></div></div></div>{b.whatsapp&&<div className="mbl-card-actions"><span className="mbl-quick-contact"><Icon name="phone" size={13}/>WhatsApp</span></div>}</article>)}</section>:<section className="mbl-empty"><div className="mbl-empty-icon"><Icon name="search" size={24}/></div><h2>Nenhum resultado</h2><p>Não há uma empresa que corresponda aos filtros escolhidos.</p></section>}
 </div></div>
}

function DemoPromotions({city,promotions,businesses}){
 const byId=useMemo(()=>Object.fromEntries(businesses.map(row=>[row.id,row])),[businesses])
 return <div className="demo-promotions-page"><div className="page"><div className="page-title"><span className="section-kicker">OFERTAS LOCAIS · DEMO</span><h1>Promoções em {city.name}</h1><p>Promoções atualmente publicadas no projeto principal, exibidas em modo somente leitura.</p></div>{promotions.length?<div className="business-grid">{promotions.map(p=>{const business=byId[p.business_id];return <article className="business-card demo-promotion-card" key={p.id}><div className="business-cover">{p.image_url?<img className="business-cover-image" src={p.image_url} alt="" loading="lazy"/>:business?.cover_url?<img className="business-cover-image" src={business.cover_url} alt="" loading="lazy"/>:<div className="cover-placeholder">V</div>}<span className="demo-promotion-badge">PROMOÇÃO</span></div><div className="business-body"><span className="business-category">{business?.name||"Empresa local"}</span><h3>{p.title}</h3><p>{p.description||"Confira esta oferta publicada."}</p><div className="business-footer"><span>{p.ends_at?"Válida até "+new Date(p.ends_at).toLocaleDateString("pt-BR"):"Oferta vigente"}</span><span className="business-meta"><span className="business-rating">{p.price!=null?money(p.price):"Confira"}</span></span></div></div></article>})}</div>:<div className="empty"><h3>Nenhuma promoção publicada.</h3><p>As promoções aparecerão aqui assim que forem publicadas no projeto principal.</p></div>}</div></div>
}

function DemoProfile({city,business,photos,items,promotions}){
 const [tab,setTab]=useState("about")
 const location=business.neighborhood?business.neighborhood+", "+city.name+" - "+city.state:business.address||city.name+" - "+city.state
 const wa=business.whatsapp||business.phone
 const hours=Object.entries(business.opening_hours||{}).map(([key,val])=>({key,label:{monday:"Segunda-feira",tuesday:"Terça-feira",wednesday:"Quarta-feira",thursday:"Quinta-feira",friday:"Sexta-feira",saturday:"Sábado",sunday:"Domingo"}[key]||key,text:val?.closed?"Fechado":val?.open&&val?.close?`${val.open} às ${val.close}`:"Não informado"}))
 const status=hours.length?(()=>{const now=new Date();const day=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][now.getDay()];const h=(business.opening_hours||{})[day];if(!h||h.closed)return {open:false,label:"Horário",detail:"Fechado agora"};return {open:true,label:"Aberto agora",detail:`${h.open} às ${h.close}`}})():{open:false,label:"Horário",detail:"Consulte os horários"}
 return <div className="demo-profile-page mbp-shell"><main className="mbp-page">
  <div className="mbp-breadcrumbs"><span className="demo-inline-link">Voltar para Empresas</span><span>⌖ {city.name}</span><span>›</span><span>{business.category_name||"Empresa"}</span><span>›</span><strong>{business.name}</strong></div>
  <div className="mbp-layout">
   <section className="mbp-main-card">
    <div className="mbp-gallery">
      <div className="mbp-gallery-main">{business.cover_url?<img src={business.cover_url} alt=""/>:<div className="mbp-gallery-placeholder">VitrineLocal</div>}<div className="mbp-gallery-caption">{business.name}</div></div>
      <div className="mbp-gallery-side">
       {photos.slice(0,3).map(photo=><div className="mbp-gallery-thumb" key={photo.id}><img src={photo.url} alt={photo.alt_text||""}/></div>)}
       {!photos.length&&<div className="mbp-gallery-thumb"><div className="mbp-gallery-placeholder">Galeria</div></div>}
       <div className="mbp-gallery-more"><strong>{photos.length||0}</strong><span>fotos públicas</span></div>
      </div>
    </div>
    <div className="mbp-company-head">
      <div className="mbp-logo">{business.logo_url?<img src={business.logo_url} alt=`${business.name} logo`/>:<span>V</span>}</div>
      <div className="mbp-company-copy">
       <div className="mbp-kicker">EMPRESA LOCAL · DEMO</div>
       <h1>{business.name}</h1>
       <div className="mbp-rating-summary"><span className="mbp-rating-summary-stars">{[0,1,2,3,4].map(i=><Icon key={i} name="star" size={14}/>)}</span><strong className="mbp-rating-summary-score">—</strong><span className="mbp-rating-summary-count">Ainda sem avaliações</span></div>
       <div className="mbp-badges">{business.verified&&<span className="mbp-verified"><Icon name="check" size={11}/> Verificada</span>}<span className="mbp-category"><Icon name={business.categories?.icon||"grid"} size={11}/> {business.category_name||"Empresa"}</span><span className={status.open?"mbp-live-pill":"mbp-closed-pill"}><Icon name={status.open?"check":"clock"} size={11}/> {status.open?"Aberto agora":"Fechado agora"}</span>{business.has_delivery&&<span className="mbp-service-badge mbp-service-badge-delivery"><Icon name="motorcycle" size={12}/> Delivery</span>}{business.has_pickup&&<span className="mbp-service-badge mbp-service-badge-pickup"><Icon name="bag" size={12}/> Retirada no local</span>}{business.has_dine_in&&<span className="mbp-service-badge mbp-service-badge-dinein"><Icon name="utensils" size={12}/> Consumo no local</span>}</div>
       <p>{business.short_description||business.description||"Conheça esta empresa local."}</p>
      </div>
    </div>
    <div className="mbp-contact-grid">
      <div className="mbp-contact-card"><span className="mbp-contact-icon"><Icon name="pin" size={14}/></span><span><strong>Localização</strong><small>{location}</small></span></div>
      <div className="mbp-contact-card"><span className="mbp-contact-icon"><Icon name="clock" size={14}/></span><span><strong>{status.label}</strong><small>{status.detail}</small></span></div>
      {wa&&<div className="mbp-contact-card"><span className="mbp-contact-icon"><Icon name="phone" size={14}/></span><span><strong>{business.whatsapp?"WhatsApp":"Telefone"}</strong><small>{wa}</small></span></div>}
      {business.instagram_url&&<div className="mbp-contact-card"><span className="mbp-contact-icon"><Icon name="instagram" size={14}/></span><span><strong>Instagram</strong><small>{business.instagram_url}</small></span></div>}
    </div>
    {wa&&<span className="mbp-primary-cta demo-disabled-action"><Icon name="phone" size={16}/> {business.whatsapp?"Falar no WhatsApp":"Entrar em contato"}</span>}
    <div className="mbp-action-row"><span className="mbp-secondary-action demo-disabled-action"><Icon name="pin" size={14}/> Como chegar</span><span className="mbp-secondary-action demo-disabled-action"><Icon name="share" size={14}/> Compartilhar</span><span className="mbp-secondary-action demo-disabled-action"><Icon name="heart" size={14}/> Salvar</span></div>
    {business.description&&<div className="mbp-section"><div className="mbp-section-title"><span>SOBRE A EMPRESA</span><h2>Sobre {business.name}</h2></div><p className="mbp-about-description">{business.description}</p></div>}
    {items.length>0&&<div className="mbp-section mbp-offer-section"><div className="mbp-section-title"><span>CATÁLOGO</span><div className="mbp-section-heading-row"><h2>O que esta empresa oferece</h2><small>{items.length} itens</small></div></div><div className="mbp-items">{items.slice(0,6).map(item=><article className="mbp-item-card" key={item.id}>{item.image_url&&<div className="mbp-item-image"><img src={item.image_url} alt={item.name||"Item"}/></div>}<div className="mbp-item-body"><span className="mbp-item-type">{item.type==="service"?"SERVIÇO":"PRODUTO"}</span><h3>{item.name}</h3>{item.description&&<p>{item.description}</p>}{item.price!=null?<div className="mbp-item-price"><small>{item.type==="service"?"A partir de":"Por"}</small><strong>{money(item.price)}</strong></div>:<span className="mbp-item-no-price">Consulte o preço</span>}</div></article>)}</div></div>}
    {promotions.length>0&&<div className="mbp-section"><div className="mbp-section-title"><span>PROMOÇÕES</span><h2>Ofertas da empresa</h2></div><div className="demo-profile-promotions">{promotions.slice(0,6).map(p=><article key={p.id}><div><strong>{p.title}</strong><p>{p.description||""}</p></div><b>{p.price!=null?money(p.price):"Confira"}</b></article>)}</div></div>}
   </section>
   <aside className="mbp-sidebar">
    <div className="mbp-tabs" role="tablist">{[["about","Sobre"],["hours","Horário"],["location","Localização"]].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {tab==="about"&&<section className="mbp-side-card"><div className="mbp-side-icon"><Icon name="grid" size={17}/></div><span className="mbp-side-kicker">VISÃO GERAL</span><h2>Sobre a empresa</h2><p className="mbp-about-description">{business.description||business.short_description||"Informações desta empresa ainda não foram detalhadas."}</p><h3>Categorias</h3><div className="mbp-pills"><span>{business.category_name||"Empresa"}</span>{wa&&<span>Atendimento pelo WhatsApp</span>}</div></section>}
    {tab==="hours"&&<section className="mbp-side-card mbp-hours-card"><div className="mbp-side-icon"><Icon name="clock" size={17}/></div><span className="mbp-side-kicker">ATENDIMENTO</span><h2>Horário de funcionamento</h2><p><span className={status.open?"mbp-open-pill":"mbp-closed-pill"}><Icon name={status.open?"check":"clock"} size={11}/> {status.open?"Aberto agora":"Fechado agora"}</span> · {status.detail}</p><div className="mbp-hours-list">{hours.map(day=><div key={day.key}><span>{day.label}</span><strong>{day.text}</strong></div>)}</div><div className="mbp-hours-note"><Icon name="clock" size={11}/> Horários podem ser alterados em feriados.<br/>Entre em contato para confirmar.</div></section>}
    {tab==="location"&&<section className="mbp-side-card"><div className="mbp-side-icon"><Icon name="pin" size={17}/></div><span className="mbp-side-kicker">LOCALIZAÇÃO</span><h2>Onde estamos</h2><p className="mbp-location-text">{business.address||location}</p><span className="mbp-map-btn demo-disabled-action">Como chegar <Icon name="arrowRight" size={14}/></span></section>}
   </aside>
  </div>
 </main></div>
}

function DemoAccount({businesses,selected,onSelect,photos,items,promotions,plan,section,setSection}){
 return <div className="app account-workspace-app demo-account-app"><main className="account-workspace demo-account-workspace"><aside className="account-sidebar">
  <div className="account-sidebar-head"><div><span className="account-eyebrow">ESPAÇO DO EMPREENDEDOR</span><h2>Minha conta</h2></div><span className="demo-account-lock"><Icon name="lock" size={12}/></span></div>
  <div className="account-business-switcher"><span className="account-business-switcher-label">EMPRESA ATIVA · DEMO</span><div className="account-business-switcher-row"><div className="account-business-switcher-avatar"><Icon name="store" size={15}/></div><select value={selected.id} onChange={e=>onSelect(e.target.value)}>{businesses.map(row=><option value={row.id} key={row.id}>{row.name}</option>)}</select><span className="account-business-switcher-status">Premium</span></div></div>
  <nav className="account-sidebar-nav">{ACCOUNT_NAV.map(([key,icon,label])=><button key={key} type="button" className={"account-nav-item "+(section===key?"active":"")} onClick={()=>setSection(key)}><span className="nav-icon"><Icon name={icon} size={17}/></span><span>{label}</span>{key==="media"&&<b>{photos.length}</b>}{key==="items"&&<b>{items.length}</b>}{key==="promotions"&&<b>{promotions.length}</b>}</button>)}</nav>
  <div className="account-sidebar-footer"><div className="account-user-chip"><div className="account-avatar">D</div><div><strong>demo@vitrinelocal.net</strong><small>Conta de demonstração</small></div></div><span className="demo-sidebar-premium">Plano Premium · completo</span></div>
 </aside><section className="account-content"><div className="demo-account-strip"><Icon name="lock" size={12}/> Demonstração somente leitura. Edição, upload, exclusão, publicação, contratação e logout estão desativados.</div>
 {section==="overview"&&<DemoOverview selected={selected} onSection={setSection} photos={photos} items={items} promotions={promotions}/>}
 {section==="company"&&<DemoCompany selected={selected}/>}
 {section==="media"&&<DemoMedia selected={selected} photos={photos}/>}
 {section==="items"&&<DemoItems selected={selected} items={items}/>}
 {section==="promotions"&&<DemoAccountPromotions selected={selected} promotions={promotions}/>}
 {section==="analytics"&&<DemoAnalytics/>}
 {section==="plan"&&<DemoPlan plan={plan}/>}
 </section></main></div>
}

function DemoOverview({selected,onSection,photos,items,promotions}){
 const stats=[["Visualizações","4.280"],["WhatsApp","312"],["Instagram","184"],["Site","96"]]
 return <div className="account-section"><div className="account-section-header"><div><span className="account-eyebrow">VISÃO GERAL · DEMO</span><h1>Olá, {selected.name}.</h1><p>Experiência completa do espaço empresarial, com recursos Premium liberados e sem gravação de dados.</p></div><div className="account-status-badge"><i className="dot"/>Ativa · Premium</div></div>
  <section className="account-completion-card"><div className="account-completion-top"><div><h2>Seu perfil está 100% completo</h2><p>Na demonstração, todas as etapas são apresentadas como concluídas.</p></div><strong className="account-completion-score">100%</strong></div><div className="account-completion-progress"><i style={{width:"100%"}}/></div><div className="account-task-list"><span className="account-task done"><Icon name="check" size={11}/>Concluído · Perfil público</span><span className="account-task done"><Icon name="check" size={11}/>Concluído · Mídias</span><span className="account-task done"><Icon name="check" size={11}/>Concluído · Produtos e serviços</span><span className="account-task done"><Icon name="check" size={11}/>Concluído · Promoções</span></div></section>
  <div className="account-overview-card"><div className="account-overview-cover">{selected.cover_url?<img src={selected.cover_url} alt=""/>:<div className="account-cover-fallback">VitrineLocal</div>}<div className="account-overview-brand">{selected.logo_url?<img src={selected.logo_url} alt=""/>:<span>V</span>}</div></div><div className="account-overview-info"><div><span className="account-chip">{selected.category_name||"Empresa local"}</span><h2>{selected.name}</h2><p>{selected.short_description||"Presença empresarial no catálogo local."}</p><span className="account-muted"><Icon name="pin" size={11}/> {selected.city_name||"Laguna"} - {selected.city_state||"SC"}</span></div><div className="account-overview-actions"><button disabled>Editar empresa</button><button disabled>Ver perfil ↗</button></div></div></div>
  <div className="account-stats-grid">{stats.map(([label,value])=><div className="account-stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>Métrica demonstrativa</small><em className="account-stat-period">Premium · demo</em></div>)}</div>
  <div className="account-quick-grid"><button onClick={()=>setSection("company")}><span><Icon name="briefcase" size={15}/></span><div><strong>Ver dados da empresa</strong><small>{selected.address||"Cadastro empresarial atual"}</small></div><b>→</b></button><button onClick={()=>setSection("media")}><span><Icon name="image" size={15}/></span><div><strong>Explorar mídias</strong><small>{photos.length} mídia(s) carregada(s)</small></div><b>→</b></button><button onClick={()=>setSection("items")}><span><Icon name="grid" size={15}/></span><div><strong>Produtos e serviços</strong><small>{items.length} item(ns) cadastrados</small></div><b>→</b></button><button onClick={()=>setSection("promotions")}><span><Icon name="tag" size={15}/></span><div><strong>Promoções</strong><small>{promotions.length} publicação(ões) ativa(s)</small></div><b>→</b></button></div>
 </div>
}

function DemoCompany({selected}){
 const fields=[["Nome",selected.name],["Categoria",selected.category_name||"—"],["Cidade",(selected.city_name||"Laguna")+" - "+(selected.city_state||"SC")],["Endereço",selected.address||"—"],["Bairro",selected.neighborhood||"—"],["Telefone",selected.phone||"—"],["WhatsApp",selected.whatsapp||"—"],["Instagram",selected.instagram_url||"—"],["Site",selected.website_url||"—"]]
 return <div className="account-section"><div className="account-section-header"><div><span className="account-eyebrow">MINHA EMPRESA · DEMO</span><h1>Dados da empresa</h1><p>Os dados são exibidos como estão no catálogo público e permanecem bloqueados.</p></div><button className="account-primary-btn" disabled>Somente leitura</button></div><div className="account-card"><div className="account-card-title"><div><h2>Informações principais</h2><p>Nenhum campo pode ser alterado na demonstração.</p></div></div><div className="account-form-grid">{fields.map(([label,value])=><label className="field" key={label}><span>{label}</span><input value={String(value||"")} readOnly disabled/></label>)}<label className="field full"><span>Descrição curta</span><textarea rows="4" value={selected.short_description||""} readOnly disabled/></label><label className="field full"><span>Descrição</span><textarea rows="7" value={selected.description||""} readOnly disabled/></label></div></div></div>
}

function DemoMedia({selected,photos}){
 return <div className="account-section"><div className="account-section-header"><div><span className="account-eyebrow">MÍDIAS · DEMO</span><h1>Identidade e galeria</h1><p>Experiência Premium de mídia, totalmente bloqueada para alterações.</p></div><button className="account-primary-btn" disabled>Adicionar mídia</button></div><div className="demo-media-grid"><div className="demo-media-card"><span>Capa</span>{selected.cover_url?<img src={selected.cover_url} alt="Capa da empresa"/>:<div className="demo-media-empty">Sem capa</div>}</div><div className="demo-media-card demo-logo-card"><span>Logo</span>{selected.logo_url?<img src={selected.logo_url} alt="Logo da empresa"/>:<div className="demo-media-empty">Sem logo</div>}</div></div><div className="account-card"><div className="account-card-title"><div><h2>Galeria</h2><p>Plano Premium: até {LIMITS.photos} mídias armazenadas.</p></div><span className="account-chip">{photos.length}/{LIMITS.photos}</span></div>{photos.length?<div className="demo-gallery-grid">{photos.map(photo=><figure key={photo.id}><img src={photo.url} alt={photo.alt_text||"Mídia da empresa"}/><figcaption>{photo.media_type==="video"?"Vídeo":"Imagem"}</figcaption></figure>)}</div>:<div className="demo-empty-inline"><Icon name="image" size={20}/><span>Nenhuma mídia adicional disponível para esta empresa.</span></div>}</div></div>
}

function DemoItems({selected,items}){
 return <div className="account-section"><div className="account-section-header"><div><span className="account-eyebrow">PRODUTOS E SERVIÇOS · DEMO</span><h1>Catálogo da empresa</h1><p>Itens atuais do cadastro, em modo somente leitura, com capacidade Premium liberada.</p></div><button className="account-primary-btn" disabled>Adicionar item</button></div><div className="demo-usage-card"><span>Capacidade Premium</span><strong>{items.length} / {LIMITS.items} itens</strong><div className="demo-usage-bar"><i style={{width:Math.min(items.length/LIMITS.items*100,100)+"%"}}/></div></div>{items.length?<div className="demo-item-grid">{items.map(item=><article className="demo-item-card" key={item.id}>{item.image_url?<img className="demo-item-image" src={item.image_url} alt=""/>:<div className="demo-item-icon"><Icon name={item.type==="service"?"briefcase":"tag"} size={21}/></div>}<span>{item.type==="service"?"Serviço":"Produto"}</span><h3>{item.name}</h3><p>{item.description||"Item cadastrado no catálogo da empresa."}</p>{item.price!=null&&<strong>{money(item.price)}</strong>}<button disabled>Editar</button></article>)}</div>:<div className="account-card demo-empty-state"><h2>Nenhum produto ou serviço cadastrado</h2><p>O módulo continua liberado para demonstrar a capacidade Premium.</p></div>}</div>
}

function DemoAccountPromotions({selected,promotions}){
 return <div className="account-section"><div className="account-section-header"><div><span className="account-eyebrow">PROMOÇÕES · DEMO</span><h1>Ofertas da empresa</h1><p>Publicações atuais, sem qualquer possibilidade de alteração.</p></div><button className="account-primary-btn" disabled>Nova promoção</button></div><div className="demo-usage-card"><span>Quota mensal Premium</span><strong>{promotions.length} / {LIMITS.promotions} promoções</strong><div className="demo-usage-bar"><i style={{width:Math.min(promotions.length/LIMITS.promotions*100,100)+"%"}}/></div></div>{promotions.length?<div className="demo-promo-list">{promotions.map(p=><article className="demo-promo-row" key={p.id}><div className="demo-promo-thumb">{p.image_url?<img src={p.image_url} alt=""/>:<Icon name="tag" size={21}/>}</div><div><span>{selected.name}</span><h3>{p.title}</h3><p>{p.description||"Promoção publicada no catálogo."}</p></div><b>{p.price!=null?money(p.price):"Confira"}</b></article>)}</div>:<div className="account-card demo-empty-state"><h2>Nenhuma promoção publicada nesta empresa</h2><p>O módulo continua desbloqueado no ambiente Premium.</p></div>}</div>
}

function DemoAnalytics(){
 const [range,setRange]=useState(30)
 const [selectedChannel,setSelectedChannel]=useState("all")
 const base={profile_views:4280,whatsapp_clicks:312,instagram_clicks:184,website_clicks:96,total_interactions:612,banner_impressions:12480,banner_clicks:326,promotion_clicks:58,event_clicks:34}
 const factor=range===7?.34:range===90?2.72:1
 const m=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,Math.round(v*factor)]))
 const contacts=(m.whatsapp_clicks||0)+(m.instagram_clicks||0)+(m.website_clicks||0)
 const conversion=m.profile_views?((contacts/m.profile_views)*100).toFixed(1):"0.0"
 const daily=Array.from({length:Math.min(range,30)},(_,i)=>({day:String(i+1),value:Math.round((45+((i*17)%53))*factor)}))
 const maxDaily=Math.max(1,...daily.map(x=>x.value))
 const channels=[["WhatsApp",m.whatsapp_clicks],["Instagram",m.instagram_clicks],["Site",m.website_clicks]]
 const filteredChannels=selectedChannel==="all"?channels:channels.filter(([name])=>name===selectedChannel)
 return <main className="commercial-analytics-page demo-commercial-analytics"><div className="ca-shell">
  <header className="ca-head"><div><span>DESEMPENHO COMERCIAL</span><h1>Analytics da empresa</h1><p>Demonstração do mesmo módulo de desempenho do espaço Minha Conta, com dados ilustrativos.</p></div><div className="ca-actions"><span className="ca-demo-only-badge">SOMENTE LEITURA</span><select value={range} onChange={e=>setRange(Number(e.target.value))}><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></div></header>
  <section className="ca-kpis"><DemoKpi title="Visualizações" value={m.profile_views.toLocaleString("pt-BR")} note={`${range} dias · perfil`}/><DemoKpi title="Contatos" value={contacts.toLocaleString("pt-BR")} note="WhatsApp + Instagram + site" tone="green"/><DemoKpi title="Conversão" value={`${conversion}%`} note="visita → contato" tone="purple"/><DemoKpi title="Interações" value={m.total_interactions.toLocaleString("pt-BR")} note="ações registradas" tone="amber"/></section>
  <section className="ca-grid"><article className="ca-card"><div className="ca-card-head"><div><span>FUNIL</span><h2>De visita a contato</h2><p>Onde o interesse acontece no perfil da empresa.</p></div></div><div className="ca-funnel">{[["Visualizações",m.profile_views],["WhatsApp",m.whatsapp_clicks],["Instagram",m.instagram_clicks],["Site",m.website_clicks]].map(([label,value])=>{const max=Math.max(1,m.profile_views);return <div className="ca-funnel-row" key={label}><div><strong>{label}</strong><small>{Number(value).toLocaleString("pt-BR")}</small></div><div className="ca-track"><i style={{width:`${Math.max(3,value/max*100)}%`}}/></div><b>{m.profile_views?((value/m.profile_views)*100).toFixed(1):"0.0"}%</b></div>})}</div></article>
   <article className="ca-card"><div className="ca-card-head"><div><span>PUBLICIDADE</span><h2>Banner Premium</h2><p>Visão demonstrativa do módulo de publicidade do Premium.</p></div><strong className="ca-ad-status contracted">CONTRATADO</strong></div><div className="ca-ad-campaign"><div><span>● Campanha ativa</span><strong>Banner Premium · Demonstração</strong><small>Exibição simulada no ambiente demo</small></div></div><div className="ca-ad-metrics"><Metric label="Impressões" value={m.banner_impressions.toLocaleString("pt-BR")}/><Metric label="Cliques" value={m.banner_clicks.toLocaleString("pt-BR")}/><Metric label="CTR" value={`${((m.banner_clicks/m.banner_impressions)*100).toFixed(1)}%`}/></div></article>
  </section>
  <section className="ca-card ca-advanced-card"><div className="ca-card-head"><div><span>ESTATÍSTICAS AVANÇADAS</span><h2>Leitura avançada do desempenho</h2><p>Visitantes, tendências diárias, canais de contato e comparação de período.</p></div><strong className="ca-premium-badge">PREMIUM</strong></div><div className="ca-advanced-kpis"><DemoKpi title="Visitantes únicos" value={Math.round(m.profile_views*.68).toLocaleString("pt-BR")} note="estimativa demonstrativa"/><DemoKpi title="Engajamentos" value={Math.round(m.total_interactions*.7).toLocaleString("pt-BR")} note="interações qualificadas" tone="green"/><DemoKpi title="Taxa de engajamento" value={((m.total_interactions/m.profile_views)*100).toFixed(1)+"%"} note="contato / visualização" tone="purple"/><DemoKpi title="Variação" value="+12,4%" note="vs. período anterior" tone="amber"/></div><div className="ca-advanced-grid"><article className="ca-advanced-panel"><div className="ca-subhead"><h3>Tendência diária</h3><span>{range} dias</span></div><div className="ca-daily-chart">{daily.map(row=><div className="ca-day-bar" key={row.day} title={`${row.day}: ${row.value} visualizações`}><i style={{height:`${Math.max(6,row.value/maxDaily*100)}%`}}/><small>{row.day}</small></div>)}</div><p className="ca-caption">Visualizações diárias simuladas para demonstrar o mesmo componente do Premium.</p></article><article className="ca-advanced-panel"><div className="ca-subhead"><h3>Canais de contato</h3><span>{contacts.toLocaleString("pt-BR")} contatos</span></div><div className="ca-channel-list"><div className="ca-demo-channel-filter"><button onClick={()=>setSelectedChannel("all")} className={selectedChannel==="all"?"active":""}>Todos</button>{channels.map(([name])=><button key={name} onClick={()=>setSelectedChannel(name)} className={selectedChannel===name?"active":""}>{name}</button>)}</div>{filteredChannels.map(([label,value])=><div key={label}><div><strong>{label}</strong><span>{Number(value).toLocaleString("pt-BR")}</span></div><div className="ca-channel-track"><i style={{width:`${Math.max(4,contacts?(value/contacts*100):4)}%`}}/></div></div>)}</div></article></div></section>
  <section className="ca-card"><div className="ca-card-head"><div><span>OPORTUNIDADES</span><h2>Como transformar tráfego em vendas</h2><p>Use os sinais do perfil para priorizar as próximas ações.</p></div></div><div className="ca-opportunities"><div><b>WhatsApp</b><strong>{m.whatsapp_clicks.toLocaleString("pt-BR")}</strong><small>Canal principal de contato na demonstração.</small></div><div><b>Promoções</b><strong>{m.promotion_clicks.toLocaleString("pt-BR")}</strong><small>Cliques simulados em ofertas publicadas.</small></div><div><b>Eventos</b><strong>{m.event_clicks.toLocaleString("pt-BR")}</strong><small>Interações simuladas com a agenda.</small></div></div></section>
 </div></main>
}
function DemoKpi({title,value,note,tone=""}){return <div className={`ca-kpi ${tone}`}><span>{title}</span><strong>{value}</strong><small>{note}</small></div>}
function Metric({label,value}){return <div><span>{label}</span><strong>{value}</strong></div>}

function DemoPlan({plan}){
 const features=["Perfil empresarial completo","Busca em destaque","Empresa verificada","Analytics avançado","Produtos e serviços","Até 100 mídias","Até 20 promoções por ciclo","Publicidade Premium","Gestão de avaliações","Instagram da cidade"]
 const price=plan?.price_monthly!=null?money(plan.price_monthly):"R$ 59,90"
 return <div className="account-section"><div className="account-section-header"><div><span className="account-eyebrow">MEU PLANO · DEMO</span><h1>Plano Premium</h1><p>Todos os recursos Premium estão liberados para visualização, sem contratação.</p></div><span className="demo-premium-large"><Icon name="star" size={15}/> PREMIUM</span></div><div className="demo-plan-hero"><div><span>PLANO ATIVO NA DEMONSTRAÇÃO</span><strong>{plan?.name||"Premium"}</strong><p>Experiência completa do painel empresarial sem autenticação e sem gravação.</p></div><b>{price}<small>/mês · referência atual</small></b></div><div className="account-card"><div className="account-card-title"><div><h2>Recursos incluídos</h2><p>Todos desbloqueados no ambiente de demonstração.</p></div></div><div className="demo-feature-grid">{features.map(feature=><div key={feature}><Icon name="check" size={13}/><span>{feature}</span></div>)}</div></div></div>
}
