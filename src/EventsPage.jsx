import React,{useEffect,useMemo,useState} from 'react'
import {projectTodayISO} from './promotion-service.js'
import Icon from './ui-icons.jsx'
import {excerptLines,isFreeEvent} from './event-utils.js'
import {getEventFavoriteIds,setEventFavorite,loginPathForIntent} from './event-favorites.js'
import {revealLabel} from './event-teaser.js'
import './events.css'
import {PageTrail} from './SiteChrome.jsx'

export default function EventsPage({supabase,city,onBack}){
 const [events,setEvents]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[saved,setSaved]=useState(new Set()),[saveMessage,setSaveMessage]=useState(''),[teasers,setTeasers]=useState([])
 useEffect(()=>{let live=true;async function load(){if(!supabase||!city?.id){setLoading(false);return}setLoading(true);setError('');const {data,error}=await supabase.from('events').select('id,title,description,image_url,event_date,event_end_date,start_time,end_time,location,address,category,price,external_url,featured').eq('city_id',city.id).eq('active',true).gte('event_end_date',projectTodayISO()).order('featured',{ascending:false}).order('event_date').order('start_time');if(!live)return;const {data:teaserRows}=await supabase.from('public_event_teasers').select('id,title,image_url,category,page_slug,teaser_reveal_at,teaser_auto_reveal').eq('city_id',city.id).order('teaser_reveal_at',{ascending:true,nullsFirst:false});if(!live)return;setTeasers(teaserRows||[]);if(error)setError(error.message);setEvents(data||[]);setLoading(false)}load();return()=>{live=false}},[supabase,city?.id])
 useEffect(()=>{let live=true;const ids=[...events,...teasers].map(e=>e.id);if(!ids.length)return;getEventFavoriteIds(supabase,ids).then(result=>{if(live)setSaved(result.ids)});return()=>{live=false}},[supabase,events,teasers])

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

 return <><main className="vl-events-page"><PageTrail items={[{label:city?.name||'Início',href:`/${city?.slug||'laguna'}`},{label:'Eventos',current:true}]}/><section className="mbl-hero vl-events-hero"><div><h1>Eventos em {city?.name||'sua cidade'}</h1><p>Shows, festas e programação da cidade — os destaques aparecem primeiro.</p></div>{!loading&&!error&&<div className="mbl-result-count"><strong>{events.length+teasers.length}</strong><span>{events.length+teasers.length===1?'evento':'eventos'}</span></div>}</section>
  {!loading&&!error&&events.length>0&&<div className="vl-events-filters" role="group" aria-label="Filtrar eventos">
   <button type="button" className={filter==='all'?'is-active':''} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Todos</button>
   {hasFree&&<button type="button" className={filter==='free'?'is-active':''} aria-pressed={filter==='free'} onClick={()=>setFilter('free')}>Gratuitos</button>}
   {categories.map(c=><button type="button" key={c} className={filter===c?'is-active':''} aria-pressed={filter===c} onClick={()=>setFilter(c)}>{c}</button>)}
  </div>}
  {saveMessage&&<p className="vl-events-save-message" role="status">{saveMessage}</p>}
  {loading&&<div className="vl-events-grid" aria-busy="true"><span className="sr-only" role="status">Carregando agenda…</span>{[0,1,2].map(i=><div className="vl-event vl-skel-card" key={i} aria-hidden="true"><div className="vl-skel vl-skel-media vl-skel-169"/><div className="vl-skel-lines"><i className="vl-skel"/><i className="vl-skel"/><i className="vl-skel"/></div></div>)}</div>}
  {!loading&&error&&<div className="empty"><h3>Não foi possível carregar a agenda.</h3><p>{error}</p></div>}
  {!loading&&!error&&!events.length&&!teasers.length&&<div className="empty"><h3>Nenhum evento próximo.</h3><p>Novos eventos aparecerão aqui quando forem publicados.</p></div>}
  {!loading&&!error&&events.length>0&&!visible.length&&<div className="empty"><h3>Nenhum evento neste filtro.</h3><p>Escolha outra opção para ver os demais eventos.</p></div>}
  {!loading&&!error&&(visible.length>0||(filter==='all'&&teasers.length>0))&&<div className="vl-events-grid">{filter==='all'&&teasers.map(t=>{const isSaved=saved.has(t.id);return <article className="vl-event is-teaser" key={'teaser-'+t.id}><a className="vl-event-card-link" href={`/${citySlug}/evento/${t.page_slug||t.id}`} aria-label={`Ver evento em breve ${t.title}`}>{t.image_url?<span className="vl-event-media" style={{"--img":`url(${JSON.stringify(t.image_url)})`}}><img src={t.image_url} alt="" loading="lazy"/></span>:<div className="vl-event-placeholder" aria-hidden="true"><Icon name="clock" size={30}/></div>}<div className="vl-event-body"><div className="vl-event-date-row"><span className="vl-event-date">{t.teaser_reveal_at?`Revelação em ${revealLabel(t.teaser_reveal_at)}`:'Detalhes em breve'}</span><span className="vl-event-teaser-badge"><Icon name="clock" size={12}/> Em breve</span></div><h3>{t.title}</h3>{t.category&&<span className="section-kicker">{t.category}</span>}<p className="vl-event-description">Os detalhes deste evento serão revelados em breve.</p><div className="vl-event-foot"><span className="vl-events-link">Saiba mais →</span></div></div></a><button type="button" className={`vl-event-save ${isSaved?'is-active':''}`} aria-pressed={isSaved} aria-label={isSaved?`Cancelar aviso de ${t.title}`:`Me avise sobre ${t.title}`} onClick={()=>toggleSave(t)}><Icon name="heart" size={18} filled={isSaved}/></button></article>})}{visible.map(event=>{const isSaved=saved.has(event.id);const excerpt=excerptLines(event.description,2);return <article className={`vl-event ${event.featured?'is-featured':''}`} key={event.id}><a className="vl-event-card-link" href={`/${citySlug}/evento/${event.id}`} aria-label={`Ver evento ${event.title}`}>{event.image_url?<span className="vl-event-media" style={{"--img":`url(${JSON.stringify(event.image_url)})`}}><img src={event.image_url} alt="" loading="lazy"/></span>:<div className="vl-event-placeholder" aria-hidden="true"><Icon name="calendar" size={30}/></div>}<div className="vl-event-body"><div className="vl-event-date-row"><span className="vl-event-date">{formatDateRange(event.event_date,event.event_end_date)}</span>{event.featured&&<span className="vl-event-featured-badge"><Icon name="star" size={12} filled/> Destaque</span>}</div><h3>{event.title}</h3>{event.category&&<span className="section-kicker">{event.category}</span>}<p className="vl-event-description">{excerpt||'Confira todos os detalhes deste evento.'}</p><div className="vl-event-meta">{event.start_time&&<span><Icon name="clock" size={14}/> {String(event.start_time).slice(0,5)}{event.end_time?`–${String(event.end_time).slice(0,5)}`:''}</span>}{event.location&&<span><Icon name="pin" size={14}/> {event.location}</span>}</div><div className="vl-event-foot"><span className="vl-events-link">Ver evento →</span>{isFreeEvent(event)?<span className="vl-event-price is-free">Gratuito</span>:<span className="vl-event-price"><small>A partir de</small><b>{formatPrice(event)}</b></span>}</div></div></a><button type="button" className={`vl-event-save ${isSaved?'is-active':''}`} aria-pressed={isSaved} aria-label={isSaved?`Remover ${event.title} dos salvos`:`Salvar ${event.title}`} onClick={()=>toggleSave(event)}><Icon name="heart" size={18} filled={isSaved}/></button></article>})}</div>}
 </main>
 </>
}
