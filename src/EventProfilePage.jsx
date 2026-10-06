import React,{useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {projectTodayISO} from './promotion-service.js'
import './event-profile.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null

const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}):'Data não informada'
const formatShortDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}):''
const formatTime=value=>value?String(value).slice(0,5):''
const formatPrice=value=>value==null||value===''?'Gratuito':`R$ ${Number(value).toFixed(2).replace('.',',')}`
const mapsUrl=(location,address)=>{const query=[location,address].filter(Boolean).join(', ');return query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:''}

function Description({text}){
 if(!text)return <p className="vl-event-profile-muted">As informações detalhadas deste evento serão divulgadas em breve.</p>
 return <div className="vl-event-profile-description">{String(text).split(/\n+/).map((line,i)=>{const value=line.trim();if(!value)return <div className="vl-event-profile-spacer" key={i}/>;if(/^#{2,3}\s/.test(value))return <h3 key={i}>{value.replace(/^#{2,3}\s+/,'')}</h3>;if(/^\*\*.*\*\*$/.test(value))return <strong key={i}>{value.slice(2,-2)}</strong>;if(/^\*\s+/.test(value))return <div className="vl-event-profile-bullet" key={i}>• {value.replace(/^\*\s+/,'')}</div>;return <p key={i}>{value.replace(/\*\*/g,'')}</p>})}</div>
}

export default function EventProfilePage({citySlug='laguna',eventId='',onBack}){
 const [city,setCity]=useState(null),[event,setEvent]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let live=true;(async()=>{if(!db){setError('Configuração do banco indisponível.');setLoading(false);return}const{data:c,error:ce}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle();if(!live)return;if(ce||!c){setError('Cidade não encontrada.');setLoading(false);return}setCity(c);const{data:e,error:ee}=await db.from('events').select('id,title,description,image_url,event_date,event_end_date,start_time,end_time,location,address,category,price,external_url,featured,active').eq('id',eventId).eq('city_id',c.id).eq('active',true).maybeSingle();if(!live)return;if(ee||!e){setError('Evento não encontrado.');setLoading(false);return}setEvent(e);setLoading(false)})();return()=>{live=false}},[citySlug,eventId])
 const dateLabel=useMemo(()=>{if(!event)return '';if(!event.event_end_date||event.event_end_date===event.event_date)return formatDate(event.event_date);return `${formatShortDate(event.event_date)} até ${formatDate(event.event_end_date)}`},[event])
 if(loading)return <main className="vl-event-profile-page"><div className="vl-event-profile-loading">Carregando evento…</div></main>
 if(error)return <main className="vl-event-profile-page"><div className="vl-event-profile-error"><a href={`/${citySlug}`}>← Voltar para {citySlug}</a><h1>{error}</h1><p>Não foi possível carregar este evento.</p></div></main>
 const map=mapsUrl(event.location,event.address)
 return <main className="vl-event-profile-page"><div className="vl-event-profile-container"><div className="vl-event-profile-breadcrumbs"><a href={`/${city.slug}/eventos`}>← Eventos em {city.name}</a><span>/</span><strong>{event.title}</strong></div><div className="vl-event-profile-layout"><section className="vl-event-profile-main"><div className="vl-event-profile-hero">{event.image_url?<img src={event.image_url} alt={event.title} loading="eager"/>:<div className="vl-event-profile-placeholder">📅</div>}{event.featured&&<span className="vl-event-profile-featured">⭐ Evento em destaque</span>}</div><div className="vl-event-profile-title"><span className="vl-event-profile-kicker">{event.category||'Evento'}</span><h1>{event.title}</h1><p>Em {city.name}, {city.state}</p></div><div className="vl-event-profile-actions">{event.external_url&&<a className="vl-event-profile-primary" href={event.external_url} target="_blank" rel="noreferrer">Mais informações / ingressos →</a>}<button type="button" onClick={()=>{if(navigator.share)navigator.share({title:event.title,text:`Confira ${event.title} em ${city.name}`,url:location.href});else navigator.clipboard?.writeText(location.href)}}>↗ Compartilhar</button></div><section className="vl-event-profile-section"><span className="vl-event-profile-section-kicker">Sobre o evento</span><h2>Todos os detalhes</h2><Description text={event.description}/></section></section><aside className="vl-event-profile-side"><section className="vl-event-profile-card"><span className="vl-event-profile-card-icon">📅</span><strong>Quando</strong><p>{dateLabel}</p>{event.start_time&&<p>{formatTime(event.start_time)}{event.end_time?` — ${formatTime(event.end_time)}`:''}</p>}</section><section className="vl-event-profile-card"><span className="vl-event-profile-card-icon">📍</span><strong>Onde</strong><p>{event.location||'Local não informado'}</p>{event.address&&<p>{event.address}</p>}{map&&<a className="vl-event-profile-map" href={map} target="_blank" rel="noreferrer">Ver no mapa →</a>}</section><section className="vl-event-profile-card"><span className="vl-event-profile-card-icon">🎟️</span><strong>Informações</strong><p><b>{formatPrice(event.price)}</b></p>{event.category&&<p>{event.category}</p>}</section></aside></div></div></main>
}
