import React,{useEffect,useState} from 'react'
import './events.css'

export default function EventsPage({supabase,city,onBack}){
  const [events,setEvents]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let live=true
    async function load(){
      if(!supabase||!city?.id){setLoading(false);return}
      setLoading(true);setError('')
      const today=new Date().toISOString().slice(0,10)
      const {data,error}=await supabase.from('events').select('id,title,description,image_url,event_date,start_time,end_time,location,address,category,price,external_url,featured').eq('city_id',city.id).eq('active',true).gte('event_date',today).order('featured',{ascending:false}).order('event_date').order('start_time')
      if(!live)return
      if(error)setError(error.message)
      setEvents(data||[])
      setLoading(false)
    }
    load()
    return()=>{live=false}
  },[supabase,city?.id])

  const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'long'}):'Data não informada'
  const formatPrice=value=>value==null?'Gratuito':`R$ ${Number(value).toFixed(2).replace('.',',')}`

  return <main className="vl-events-page">
    <button className="link" onClick={onBack}>← Voltar</button>
    <div className="section-head">
      <div>
        <span className="section-kicker">Agenda da cidade</span>
        <h1>Eventos em {city?.name||'sua cidade'}</h1>
        <p className="muted">Confira os próximos eventos cadastrados na cidade.</p>
      </div>
    </div>
    {loading&&<div className="empty"><h3>Carregando agenda…</h3></div>}
    {!loading&&error&&<div className="empty"><h3>Não foi possível carregar a agenda.</h3><p>{error}</p></div>}
    {!loading&&!error&&!events.length&&<div className="empty"><h3>Nenhum evento próximo.</h3><p>Novos eventos aparecerão aqui quando forem publicados.</p></div>}
    {!loading&&!error&&events.length>0&&<div className="vl-events-grid">{events.map(event=><article className="vl-event" key={event.id}>
      {event.image_url?<img src={event.image_url} alt="" loading="lazy"/>:<div className="vl-event-placeholder" aria-hidden="true">📅</div>}
      <div className="vl-event-body">
        <span className="vl-event-date">{formatDate(event.event_date)}</span>
        <h3>{event.title}</h3>
        {event.category&&<span className="section-kicker">{event.category}</span>}
        {event.description&&<p>{event.description}</p>}
        <div className="vl-event-meta">
          {event.start_time&&<>🕐 {String(event.start_time).slice(0,5)}{event.end_time?`–${String(event.end_time).slice(0,5)}`:''}<br/></>}
          {event.location&&<>📍 {event.location}<br/></>}
          {event.address&&<>{event.address}<br/></>}
          {formatPrice(event.price)}
        </div>
        {event.external_url&&<a className="vl-events-link" href={event.external_url} target="_blank" rel="noreferrer">Mais informações →</a>}
      </div>
    </article>)}</div>}
  </main>
}
