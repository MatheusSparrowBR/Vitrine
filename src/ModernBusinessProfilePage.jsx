import React,{useEffect,useMemo,useState}from'react'
import{createClient}from'@supabase/supabase-js'
import{getActiveBusinessPromotions}from'./promotion-service.js'
import{formatHours,getOpenStatus}from'./business-hours-utils.js'
import{loadPublicBusinessReviewSummaries}from'./public-review-summary.js'
import Icon from'./ui-icons.jsx'
import{createPushSubscription,syncPushSubscription,isPushSupported}from'./push-notifications.js'
import{getBusinessRelationship,setBusinessRelationship,loginPathForIntent}from'./business-relationship.js'
import'./item-cards-compact.css'
import'./business-service-badges.css'
import'./modern-business-profile-refinement.css'
import'./modern-business-profile-ux.css'
import'./modern-business-profile-lab-style.css'
import CoverPositionEditor from './CoverPositionEditor.jsx'
import{coverPositionCssVars}from'./cover-position-utils.js'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const phoneDigits=v=>String(v||'').replace(/\D/g,'')
const fmt=v=>{const n=Number(v);return Number.isFinite(n)?`R$ ${n.toFixed(2).replace('.',',')}`:''}
const normalizeItemType=item=>{const raw=String(item?.type??item?.item_type??item?.kind??'').trim().toLowerCase();if(['service','services','servico','serviço','servicos','serviços'].includes(raw))return'service';if(['product','products','produto','produtos'].includes(raw))return'product';return null}
function Gallery({business,photos,coverPositionDesktop,coverPositionMobile,canEditCover,onEditCover}){const cover=business.cover_url||'';const media=photos.filter(p=>p.url&&p.url!==cover);const images=media.filter(p=>p.media_type!=='video');const main=cover||images[0]?.url;const thumbs=media.filter(p=>p.media_type!=='video').slice(0,2);const total=(cover?1:0)+media.length;const extra=Math.max(0,total-3);const hasThumbs=thumbs.length>0;const coverStyle={...coverPositionCssVars(coverPositionDesktop,'desktop'),...coverPositionCssVars(coverPositionMobile,'mobile')};return <div className={`mbp-gallery ${hasThumbs?'has-media':'is-empty'}`} data-gallery-total={total}><button className="mbp-gallery-main" type="button" data-gallery-open aria-label="Abrir galeria de fotos">{main?<img className="mbp-cover-positioned" src={main} alt={`${business.name} capa`} loading="eager" style={coverStyle}/>:<div className="mbp-gallery-placeholder">VitrineLocal</div>}<span className="mbp-gallery-caption">▣ {business.short_description||'Conheça esta empresa local.'}</span></button>{canEditCover&&<button type="button" className="mbp-cover-edit-button" onClick={onEditCover} aria-label="Editar posicionamento da capa" title="Editar capa"><Icon name="camera" size={15}/><span>Editar capa</span></button>}<div className="mbp-gallery-side">{thumbs.map((p,i)=><button className="mbp-gallery-thumb" type="button" key={p.id||i} data-gallery-open aria-label={`Abrir foto ${i+2}`}><img src={p.url} alt="" loading="lazy"/></button>)}<button className="mbp-gallery-more" type="button" data-gallery-open aria-label="Ver todas as fotos">{extra>0&&<strong>+{extra}</strong>}<span>{total>0?'Ver todas as fotos':'Adicionar fotos'}</span></button></div></div>}
function ContactCard({icon,title,value,link,state}){const content=<><span className="mbp-contact-icon"><Icon name={icon} size={17}/></span><span><strong>{title}</strong><small>{value}</small></span></>;if(!link)return <div className={`mbp-contact-card ${state?`is-${state}`:''}`} data-contact-state={state||''}>{content}</div>;return <a className="mbp-contact-card" href={link} target="_blank" rel="noreferrer">{content}</a>}
function ItemCard({item}){const type=normalizeItemType(item)||'product';const hasPrice=item.price!==null&&item.price!==undefined&&item.price!==''&&Number.isFinite(Number(item.price));return <article className="mbp-item-card" data-item-type={type}>{item.image_url&&<div className="mbp-item-image"><img src={item.image_url} alt={item.name||'Item'} loading="lazy"/></div>}<div className="mbp-item-body"><span className="mbp-item-type">{type==='service'?'SERVIÇO':'PRODUTO'}</span><h3>{item.name}</h3>{item.description&&<p>{item.description}</p>}{hasPrice?<div className="mbp-item-price"><small>{type==='service'?'A partir de':'Por'}</small><strong>{fmt(item.price)}</strong></div>:<span className="mbp-item-no-price">Consulte o preço</span>}</div></article>}
function ItemsSection({items,tab,setTab}){if(!items.length)return null;const normalized=items.map(item=>({...item,__normalizedType:normalizeItemType(item)}));const products=normalized.filter(i=>i.__normalizedType==='product'),services=normalized.filter(i=>i.__normalizedType==='service');const visible=tab==='products'?products:tab==='services'?services:normalized;const tabs=[['all','Todos',normalized.length],['products','Produtos',products.length],['services','Serviços',services.length]].filter(t=>t[2]>0||t[0]==='all');return <section id="mbp-catalogo" className="mbp-section mbp-offer-section"><div className="mbp-section-title"><span>CATÁLOGO</span><div className="mbp-section-heading-row"><h2>O que esta empresa oferece</h2><small>{normalized.length} {normalized.length===1?'item':'itens'}</small></div></div><div className="mbp-offer-tabs" role="tablist">{tabs.map(([id,label,count])=><button type="button" key={id} className={tab===id?'active':''} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{label} <small>{count}</small></button>)}</div><div className="mbp-items">{visible.slice(0,6).map(i=><ItemCard item={i} key={i.id}/>)}</div></section>}

function MobileProfileNav({citySlug='laguna',businessId,wa,mapsUrl}){return <nav className="mbp-mobile-bottom" aria-label="Navegação principal mobile"><a className="mbp-mobile-home" href={'/'+citySlug}><Icon name="home" size={22}/><span>Início</span></a><BusinessPersonalActions businessId={businessId} compact/><a className="mbp-mobile-wa" data-track="whatsapp" href={wa||undefined} target={wa?'_blank':undefined} rel={wa?'noreferrer':undefined}><Icon name="phone" size={22}/><span>WhatsApp</span></a><a className="mbp-mobile-map" data-track="maps" href={mapsUrl||undefined} target={mapsUrl?'_blank':undefined} rel={mapsUrl?'noreferrer':undefined}><Icon name="pin" size={22}/><span>Mapa</span></a></nav>}
function BusinessPersonalActions({businessId,compact=false}){const[relationship,setRelationship]=useState({favorite:false}),[busy,setBusy]=useState(false);useEffect(()=>{let live=true;(async()=>{const next=await getBusinessRelationship(businessId);if(live)setRelationship({favorite:Boolean(next.favorite)})})();return()=>{live=false}},[businessId]);const toggleFavorite=async()=>{if(busy)return;const nextValue=!relationship.favorite;setBusy(true);try{const result=await setBusinessRelationship(businessId,'favorite',nextValue);if(result.requiresAuth){location.assign(loginPathForIntent('favorite'));return}setRelationship({favorite:nextValue})}finally{setBusy(false)}};return compact?<div className="mbp-relationship-row-compact"><button type="button" className={`mbp-shortcut-action ${relationship.favorite?'is-active':''}`} disabled={busy} aria-pressed={relationship.favorite} onClick={toggleFavorite}><span className="mbp-relationship-icon" aria-hidden="true">♡</span><span>{busy?'Salvando…':relationship.favorite?'Salvo':'Salvar'}</span></button></div>:<div className="mbp-relationship-row" aria-label="Ações pessoais"><button type="button" className={relationship.favorite?'is-active':''} disabled={busy} aria-pressed={relationship.favorite} onClick={toggleFavorite}><span className="mbp-relationship-icon" aria-hidden="true">♡</span><span>{busy?'Salvando…':relationship.favorite?'Empresa salva':'Salvar empresa'}</span></button></div>}

export default function ModernBusinessProfilePage({citySlug='laguna',businessSlug=''}){ 
 const[city,setCity]=useState(null),[business,setBusiness]=useState(null),[photos,setPhotos]=useState([]),[items,setItems]=useState([]),[promotions,setPromotions]=useState([]),[rating,setRating]=useState({avg:0,count:0}),[offerTab,setOfferTab]=useState('all'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[businessNotifications,setBusinessNotifications]=useState(false),[businessNotificationLoading,setBusinessNotificationLoading]=useState(false),[businessNotificationMessage,setBusinessNotificationMessage]=useState(''),[coverPositionDesktop,setCoverPositionDesktop]=useState({x:0,y:0,zoom:1}),[coverPositionMobile,setCoverPositionMobile]=useState({x:0,y:0,zoom:1}),[currentUser,setCurrentUser]=useState(null),[canEditCover,setCanEditCover]=useState(false),[coverEditorOpen,setCoverEditorOpen]=useState(false),[coverSaveBusy,setCoverSaveBusy]=useState(false)
 useEffect(()=>{let live=true;(async()=>{if(!db){setError('Configuração do banco indisponível.');setLoading(false);return}const{data:c}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle();if(!live)return;if(!c){setError('Cidade não encontrada.');setLoading(false);return}setCity(c);const{data:b,error:be}=await db.from('public_business_directory').select('*').eq('city_id',c.id).eq('slug',businessSlug).maybeSingle();const{data:positionData}=await db.from('businesses').select('cover_position_desktop,cover_position_mobile,owner_id').eq('id',b?.id||'00000000-0000-0000-0000-000000000000').maybeSingle();if(!live)return;if(be||!b){setError('Empresa não encontrada.');setLoading(false);return}const[p,i,pr,rm]=await Promise.all([db.from('business_photos').select('*').eq('business_id',b.id).order('sort_order'),db.from('business_items').select('*').eq('business_id',b.id).eq('active',true).order('sort_order'),getActiveBusinessPromotions(db,b.id,{limit:100}),loadPublicBusinessReviewSummaries(db,[b.id])]);if(!live)return;setBusiness({...b,categories:b.category_name?{name:b.category_name,slug:b.category_slug}:null});const{data:{user}}=await db.auth.getUser();if(user){const{data:profile}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();const editable=Boolean(profile?.role==='admin'||positionData?.owner_id===user.id);if(live){setCurrentUser(user);setCanEditCover(editable);setBusinessNotifications(Boolean((await db.from('business_notification_subscriptions').select('enabled').eq('user_id',user.id).eq('business_id',b.id).maybeSingle()).data?.enabled))}}setPhotos(p.data||[]);setItems(i.data||[]);setPromotions(pr.error?[]:(pr.data||[]));setRating(rm?.[b.id]||{avg:0,count:0});setCoverPositionDesktop({...{x:0,y:0,zoom:1},...(b?.cover_position_desktop||{})});setCoverPositionMobile({...{x:0,y:0,zoom:1},...(b?.cover_position_mobile||{})});setLoading(false)})();return()=>{live=false}},[citySlug,businessSlug])
 const hours=useMemo(()=>business?formatHours(business.opening_hours):[],[business])
 const toggleBusinessNotifications=async()=>{if(businessNotificationLoading||!business)return;if(!db)return;setBusinessNotificationLoading(true);setBusinessNotificationMessage('');try{const{data:{user}}=await db.auth.getUser();if(!user){setBusinessNotificationMessage('Entre na sua conta para ativar as notificações desta empresa.');return}if(businessNotifications){const{error:removeError}=await db.from('business_notification_subscriptions').update({enabled:false}).eq('user_id',user.id).eq('business_id',business.id);if(removeError)throw removeError;setBusinessNotifications(false);setBusinessNotificationMessage('Notificações desta empresa desativadas.');return}if(!isPushSupported()){setBusinessNotificationMessage('Seu navegador não oferece notificações Push.');return}if(Notification.permission==='denied'){setBusinessNotificationMessage('As notificações estão bloqueadas no navegador. Libere a permissão nas configurações do navegador.');return}if(Notification.permission!=='granted'){const permission=await Notification.requestPermission();if(permission!=='granted'){setBusinessNotificationMessage('Permissão para notificações não concedida.');return}}let subscription=await navigator.serviceWorker.ready.then(reg=>reg.pushManager.getSubscription());if(!subscription)subscription=await createPushSubscription();if(!subscription)throw new Error('Não foi possível ativar as notificações neste dispositivo.');await syncPushSubscription(user.id);const{error:upsertError}=await db.from('business_notification_subscriptions').upsert({user_id:user.id,business_id:business.id,enabled:true},{onConflict:'user_id,business_id'});if(upsertError)throw upsertError;setBusinessNotifications(true);setBusinessNotificationMessage('Pronto! Você receberá notificações desta empresa.')}catch(err){setBusinessNotificationMessage(err?.message||'Não foi possível ativar as notificações.')}finally{setBusinessNotificationLoading(false)}}
 const status=useMemo(()=>business?getOpenStatus(business.opening_hours):{open:false,label:'Horário',detail:'Consulte os horários'},[business])
 const saveCoverPosition=async({desktop,mobile})=>{if(!db||!business||!canEditCover)return;setCoverSaveBusy(true);try{const{error}=await db.from('businesses').update({cover_position_desktop:desktop,cover_position_mobile:mobile,updated_at:new Date().toISOString()}).eq('id',business.id);if(error)throw error;setCoverPositionDesktop(desktop);setCoverPositionMobile(mobile);setCoverEditorOpen(false)}catch(err){setError(err?.message||'Não foi possível salvar o enquadramento da capa.')}finally{setCoverSaveBusy(false)}}
 const mapsUrl=business?.address?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`:''
 const returnUrl=useMemo(()=>{try{const stored=sessionStorage.getItem('vl_catalog_return_url');return stored&&stored.startsWith(`/${citySlug}/empresas`)?stored:`/${citySlug}/empresas`}catch{return`/${citySlug}/empresas`}},[citySlug])
 const profileLocation=business?(business.neighborhood?`${business.neighborhood}, ${city?.name} - ${city?.state||'SC'}`:business.address||`${city?.name} - ${city?.state||'SC'}`):''
 const wa=business?.whatsapp||business?.phone
 const waUrl=business?.whatsapp?`https://wa.me/${phoneDigits(business.whatsapp)}`:(business?.phone?`tel:${phoneDigits(business.phone)}`:'')
 const contactLabel=business?.whatsapp?'Falar no WhatsApp':business?.phone?'Entrar em contato':'Contato indisponível'
 const services=[business?.has_dine_in&&'Consumo no local',business?.has_delivery&&'Delivery',business?.has_pickup&&'Retirada no local'].filter(Boolean)
 const share=async()=>{const data={title:business?.name||'VitrineLocal',text:`Confira ${business?.name||'esta empresa'} no VitrineLocal.`,url:window.location.href};try{if(navigator.share)await navigator.share(data);else if(navigator.clipboard)await navigator.clipboard.writeText(data.url)}catch{}}
 if(loading)return <main className="mbp-shell"><div className="mbp-loading">Carregando empresa…</div></main>
 if(error||!business||!city)return <main className="mbp-shell"><div className="mbp-error"><h1>{error||'Empresa não encontrada.'}</h1><a href={returnUrl}>Voltar para o catálogo</a></div></main>
 return <div className="mbp-shell">
  <main id="mbp-top" className="mbp-page">
   <div className="mbp-breadcrumbs"><a href={returnUrl}>Voltar para o catálogo</a><span>⌖ {city.name}</span><span>›</span><span>{business.categories?.name||'Empresa'}</span><span>›</span><strong>{business.name}</strong></div>

   <section className="mbp-profile-top">
    <header className="mbp-profile-head">
     <div>
      <div className="mbp-name-row"><h1>{business.name}</h1>{business.verified&&<span className="mbp-verified"><Icon name="check" size={11}/> Verificada</span>}</div>
      <p><strong>{business.categories?.name||'Empresa'}</strong><span>·</span><span>{business.neighborhood?`${business.neighborhood}, ${city.name} - ${city.state||'SC'}`:city.name+' - '+(city.state||'SC')}</span></p>
     </div>
     <span className={status.open?'mbp-status-pill':'mbp-status-pill is-closed'}><i/>{status.label} · {status.detail}</span>
    </header>

    <Gallery business={business} photos={photos} coverPositionDesktop={coverPositionDesktop} coverPositionMobile={coverPositionMobile} canEditCover={canEditCover} onEditCover={()=>setCoverEditorOpen(true)}/>

    <div className="mbp-identity">
     <div className="mbp-logo">{business.logo_url?<img src={business.logo_url} alt={`${business.name} logo`}/>:<span>V</span>}</div>
     <div className="mbp-identity-copy">
      <span className="mbp-kicker">EMPRESA LOCAL</span>
      <p className="mbp-identity-description">{business.short_description||business.description||'Conheça esta empresa local.'}</p>
      <div className="mbp-rating-line" aria-label={rating.count?`${rating.avg.toFixed(1)} de 5, ${rating.count} avaliações`:'Ainda sem avaliações'}>
       <span className="mbp-rating-stars">{Array.from({length:5},(_,i)=><Icon key={i} name="star" size={13} filled={Boolean(rating.count&&i<Math.round(rating.avg))}/>)}</span>
       <strong>{rating.count?rating.avg.toFixed(1):'—'}</strong>
       <span>{rating.count?`${rating.count} ${rating.count===1?'avaliação':'avaliações'}`:'Ainda sem avaliações'}</span>
      </div>
      <div className="mbp-badges mbp-identity-badges mbp-tags">{services.length?services.map(x=><span className="mbp-service-badge" key={x}>{x}</span>):<span>{business.categories?.name||'Empresa'}</span>}</div>
     </div>
     <div className="mbp-profile-shortcuts" aria-label="Ações da empresa">
      <BusinessPersonalActions businessId={business.id}/>
      {business.instagram_url&&<a className="mbp-shortcut-action mbp-shortcut-instagram" data-track="instagram" href={business.instagram_url} target="_blank" rel="noreferrer"><Icon name="instagram" size={14}/> Instagram</a>}
      <div className="mbp-business-notification mbp-inline-business-notification" aria-label="Receba novidades desta empresa">
       <button type="button" className={'mbp-shortcut-action mbp-shortcut-notifications '+(businessNotifications?'active':'')} onClick={toggleBusinessNotifications} disabled={businessNotificationLoading} aria-pressed={businessNotifications} aria-label="Ativar notificações da empresa" title={businessNotifications?'Desativar notificações desta empresa':'Ativar notificações desta empresa'}>
        <Icon name="bell" size={15} className="mbp-notification-svg"/>
        <span className="mbp-notification-label">{businessNotificationLoading?'Ativando…':businessNotifications?'Notificações ativadas':'Ativar notificações'}</span>
       </button>
      </div>
      <button type="button" className="mbp-shortcut-action mbp-shortcut-share" onClick={share}><Icon name="share" size={15}/> Compartilhar</button>
      {businessNotificationMessage&&<small className="mbp-inline-action-message">{businessNotificationMessage}</small>}
     </div>
    </div>

    <div className="mbp-primary-row" data-mbp-action-bar="true">
     {waUrl&&<a className="mbp-primary-cta" data-track="whatsapp" href={waUrl} target={business.whatsapp?'_blank':undefined} rel={business.whatsapp?'noreferrer':undefined}><Icon name="phone" size={16}/> {contactLabel}</a>}
     {mapsUrl&&<a className="mbp-secondary-cta" data-track="maps" href={mapsUrl} target="_blank" rel="noreferrer"><Icon name="pin" size={16}/> Como chegar</a>}
    </div>

    <div className="mbp-extra-actions mbp-share-row">
     {business.ifood_url&&<a className="mbp-shortcut-action mbp-shortcut-ifood" data-track="ifood" href={business.ifood_url} target="_blank" rel="noreferrer">iFood</a>}
    </div>
   </section>

   <div className="mbp-layout">
    <div className="mbp-main-column">
     <section className="mbp-panel" id="sobre">
      <div className="mbp-title"><span>INFORMAÇÕES ESSENCIAIS</span><h2>Informações essenciais</h2></div>
      <p className="mbp-about-description">{business.description||business.short_description||'Informações desta empresa ainda não foram detalhadas.'}</p>
      <div className="mbp-info-grid">
       <div><span className="mbp-info-icon"><Icon name="pin" size={16}/></span><strong>Localização</strong><small>{business.address||profileLocation||'Laguna - SC'}</small></div>
       <div><span className="mbp-info-icon"><Icon name="clock" size={16}/></span><strong>Funcionamento</strong><small>{status.detail}</small></div>
       <div><span className="mbp-info-icon"><Icon name="phone" size={16}/></span><strong>Contato</strong><small>{business.whatsapp?'WhatsApp direto · resposta rápida':business.phone||'Contato não informado'}</small></div>
       <div><span className="mbp-info-icon"><Icon name="check" size={16}/></span><strong>Serviços</strong><small>{services.length?services.join(' · '):business.categories?.name||'Consulte a empresa'}</small></div>
      </div>
      {promotions.length>0&&<div className="mbp-featured-promo"><div><span>OFERTAS ATIVAS</span><strong>{promotions[0].title}</strong><small>{promotions[0].description||'Confira esta oferta disponível nesta empresa.'}</small></div>{promotions[0].price!=null&&<b>{fmt(promotions[0].price)}</b>}</div>}
     </section>

     {items.length>0&&<ItemsSection items={items} tab={offerTab} setTab={setOfferTab}/>}

     {promotions.length>0&&<section className="mbp-panel mbp-promotions-panel"><div className="mbp-title"><span>OFERTAS ATIVAS</span><h2>Promoções da empresa</h2></div><div className="mbp-promo-grid">{promotions.slice(0,3).map(p=><article className="mbp-promo-card" key={p.id}>{p.image_url&&<img src={p.image_url} alt={p.title} loading="lazy"/>}<div><strong>{p.title}</strong>{p.description&&<p>{p.description}</p>}<div>{p.original_price!=null&&<del>{fmt(p.original_price)}</del>}{p.price!=null&&<b>{fmt(p.price)}</b>}</div></div></article>)}</div></section>}

     <section className="mbp-panel" id="endereco">
      <div className="mbp-title-row"><div className="mbp-title"><span>LOCALIZAÇÃO</span><h2>Endereço e rota</h2></div>{mapsUrl&&<a href={mapsUrl} target="_blank" rel="noreferrer">Abrir no Google Maps →</a>}</div>
      <p className="mbp-address">{business.address||profileLocation||'Laguna - SC'}</p>
      <div className="mbp-mapbox"><Icon name="pin" size={22}/><div><strong>{business.neighborhood||city.name}, {city.name}</strong><small>Abra a rota para chegar até a empresa.</small></div></div>
     </section>
    </div>

    <aside className="mbp-sidebar">
     <div className="mbp-side mbp-side-sticky mbp-hours-card-only">
      <div className="mbp-side-title"><small>HORÁRIOS</small><span className={status.open?'open':'closed'}>{status.open?'Aberto agora':'Fechado agora'}</span></div>
      <ul className="mbp-hours">{hours.map(day=><li key={day.key}><strong>{day.label}</strong><span>{day.text}</span></li>)}</ul>
      <small className="mbp-note"><Icon name="clock" size={12}/> Horários podem mudar em feriados. Confirme pelo contato da empresa.</small>
     </div>
    </aside>
   </div>
  </main>

  <MobileProfileNav citySlug={citySlug} businessId={business.id} wa={waUrl} mapsUrl={mapsUrl}/>
  {coverEditorOpen&&canEditCover&&<CoverPositionEditor coverUrl={business.cover_url} businessName={business.name} desktopPosition={coverPositionDesktop} mobilePosition={coverPositionMobile} onSave={saveCoverPosition} onClose={()=>!coverSaveBusy&&setCoverEditorOpen(false)} saveLabel="Salvar enquadramento"/>}
 </div>
}
