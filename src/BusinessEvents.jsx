import { useEffect, useState } from 'react'
import { supabase as db } from './supabase-client.js'
import { projectTodayISO } from './promotion-service.js'
import { eventWhenLabel } from './event-share-card.js'
import './business-events.css'

// Próximos eventos ligados à empresa. Não aparece nada quando não há evento.
export default function BusinessEvents({ businessId, citySlug = 'laguna' }) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    let live = true
    if (!db || !businessId) return undefined
    db.from('events')
      .select('id,title,image_url,event_date,event_end_date,start_time,location')
      .eq('business_id', businessId)
      .eq('active', true)
      .gte('event_end_date', projectTodayISO())
      .order('event_date', { ascending: true })
      .limit(6)
      .then(({ data }) => { if (live) setEvents(data || []) })
    return () => { live = false }
  }, [businessId])

  if (!events.length) return null

  return (
    <section className="mbp-panel business-events" aria-label="Próximos eventos da empresa">
      <div className="mbp-title"><span>AGENDA</span><h2>Próximos eventos</h2></div>
      <div className="business-events-list">
        {events.map(event => (
          <a className="business-event-card" key={event.id} href={`/${citySlug}/evento/${event.id}`}>
            <span className="business-event-thumb">{event.image_url ? <img src={event.image_url} alt="" loading="lazy" /> : '📅'}</span>
            <span className="business-event-copy">
              <strong>{event.title}</strong>
              <small>{eventWhenLabel(event)}{event.location ? ` · ${event.location}` : ''}</small>
            </span>
            <span className="business-event-arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </div>
    </section>
  )
}
