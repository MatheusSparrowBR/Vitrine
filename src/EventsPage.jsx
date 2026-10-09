import React,{useEffect,useMemo,useState} from 'react'
import {projectTodayISO} from './promotion-service.js'
import Icon from './ui-icons.jsx'
import {excerptLines,isFreeEvent} from './event-utils.js'
import {getEventFavoriteIds,setEventFavorite,loginPathForIntent} from './event-favorites.js'
import './events.css'

export default function EventsPage({supabase,city,onBack}){
 const [events,setEvents]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[saved,setSaved]=useState(new Set()),[saveMessage,setSaveMessage]=useState('')
 useEffect(()=>{let live=true;async function load(){if(!supabase||!city?.id){setLoading(false);return}setLoading(true);setError('');const {data,error}=await supabase.from('events').select('id,title,description,image_url,event_date,event_end_date,start_time,end_time,location,address,category,price,external_url,featured').eq('city_id',city.id).eq('active',true).gte('event_end_date',projectTodayISO()).order('featured',{ascending:false}).order('event_date').order('start_time');if(!live)return;if(error)setError(error.message);setEvents(data||[]);setLoading(false)}load();return()=>{live=false}},[supabase,city?.id])
 useEffect(()=>{let live=true;if(!events.length)return;getEventFavoriteIds(supabase,events.map(e=>e.id)).then(result=>{if(live)setSaved(result.ids)});return()=>{live=false}},[supabase,events])

 const citySlug=city?.slug||'laguna'
 const categories=useMemo(()=>[...new Set(events.map(e=>e.category).filter(Boolean))],[events])
 const hasFree=useMemo(()=>events.some(isFreeEvent),[events])
 const visible=useMemo(()=>events.filter(e=>filter==='all'||(filter==='free'?isFreeEvent(e):e.category===filter)),[events,filter])

 const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'long'}):'Data não informada'
 const formatDateRange=(start,end)=>{const first=formatDate(start);if(!end||end===start)return first;const last=new Date(`${end}T00:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});return `De ${first} até ${last}`}
 const formatPrice=event=>isFreeEvent(event)?'Gratuito':`R$ ${Number(event.price).toFixed(2).replace('.',',')}`

 const toggleSave=async event=>{
  const next=!saved.has(event.id)
  setSaveMessage('')
  try{
   const result=await setEventFavorite(supabase,event.id,next)
   if(result.requiresAuth){location.assign(loginPathForIntent('event'));return}
   setSaved(prev=>{const copy=new Set(prev);next?copy.add(event.id):copy.delete(event.id);return copy})
  }catch(err){setSaveMessage(err?.message||'Não foi possível salvar este evento.')}
 }

 return <><main className="vl-events-page"><button className="link" onClick={onBack}>← Voltar</button><div className="section-head"><div><span className="section-kicker">Agenda da cidade</span><h1>Eventos em {city?.name||'sua cidade'}</h1><p className="muted">Confira os próximos eventos cadastrados na cidade. Eventos em destaque aparecem primeiro.</p></div></div>
  {!loading&&!error&&events.length>0&&<div className="vl-events-filters" role="group" aria-label="Filtrar eventos">
   <button type="button" className={filter==='all'?'is-active':''} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Todos</button>
   {hasFree&&<button type="button" className={filter==='free'?'is-active':''} aria-pressed={filter==='free'} onClick={()=>setFilter('free')}>Gratuitos</button>}
   {categories.map(c=><button type="button" key={c} className={filter===c?'is-active':''} aria-pressed={filter===c} onClick={()=>setFilter(c)}>{c}</button>)}
  </div>}
  {saveMessage&&<p className="vl-events-save-message" role="status">{saveMessage}</p>}
  {loading&&<div className="empty"><h3>Carregando agenda…</h3></div>}
  {!loading&&error&&<div className="empty"><h3>Não foi possível carregar a agenda.</h3><p>{error}</p></div>}
  {!loading&&!error&&!events.length&&<div className="empty"><h3>Nenhum evento próximo.</h3><p>Novos eventos aparecerão aqui quando forem publicados.</p></div>}
  {!loading&&!error&&events.length>0&&!visible.length&&<div className="empty"><h3>Nenhum evento neste filtro.</h3><p>Escolha outra opção para ver os demais eventos.</p></div>}
  {!loading&&!error&&visible.length>0&&<div className="vl-events-grid">{visible.map(event=>{const isSaved=saved.has(event.id);const excerpt=excerptLines(event.description,2);return <article className={`vl-event ${event.featured?'is-featured':''}`} key={event.id}><a className="vl-event-card-link" href={`/${citySlug}/evento/${event.id}`} aria-label={`Ver evento ${event.title}`}>{event.image_url?<img src={event.image_url} alt="" loading="lazy"/>:<div className="vl-event-placeholder" aria-hidden="true">📅</div>}<div className="vl-event-body"><div className="vl-event-date-row"><span className="vl-event-date">{formatDateRange(event.event_date,event.event_end_date)}</span>{event.featured&&<span className="vl-event-featured-badge">⭐ Destaque</span>}</div><h3>{event.title}</h3>{event.category&&<span className="section-kicker">{event.category}</span>}<p className="vl-event-description">{excerpt||'Confira todos os detalhes deste evento.'}</p><div className="vl-event-meta">{event.start_time&&<span>🕐 {String(event.start_time).slice(0,5)}{event.end_time?`–${String(event.end_time).slice(0,5)}`:''}</span>}{event.location&&<span>📍 {event.location}</span>}<span className="vl-event-price">{formatPrice(event)}</span></div><span className="vl-events-link">Ver evento →</span></div></a><button type="button" className={`vl-event-save ${isSaved?'is-active':''}`} aria-pressed={isSaved} aria-label={isSaved?`Remover ${event.title} dos salvos`:`Salvar ${event.title}`} onClick={()=>toggleSave(event)}><Icon name="heart" size={18} filled={isSaved}/></button></article>})}</div>}
 </main>
 <nav className="vl-events-mobile-bottom-nav" aria-label="Navegação de eventos mobile"><div className="vl-events-mobile-bottom-nav-inner"><a href={`/${citySlug}`}><Icon name="home" size={22}/><span>Início</span></a><a href={`/${citySlug}#categorias`}><Icon name="grid" size={22}/><span>Categorias</span></a><a href={`/${citySlug}/eventos`} className="is-active" aria-current="page"><Icon name="calendar" size={22}/><span>Eventos</span></a><a href="/usuario/perfil?mode=personal&tab=favorites"><Icon name="heart" size={22}/><span>Salvos</span></a></div></nav></>
}
