import { useEffect, useState } from 'react'
import { supabase as db } from './supabase-client.js'
import { getOpenStatus } from './business-hours-utils.js'

const whatsappUrl = (phone, text) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 10) return ''
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}?text=${encodeURIComponent(text)}`
}

// "Onde comer e ficar": empresas escolhidas pelo admin, na ordem definida no editor.
// Empresas inativas ou removidas não voltam da consulta e somem. Sem empresas, não mostra nada.
export default function EventNearbyPlaces({ items, citySlug = 'laguna', eventTitle = '' }) {
  const [businesses, setBusinesses] = useState([])
  const ids = items.map(item => item.businessId)
  const key = ids.join(',')

  useEffect(() => {
    let live = true
    if (!db || !ids.length) { setBusinesses([]); return undefined }
    db.from('public_business_directory')
      .select('id,name,slug,logo_url,cover_url,category_name,whatsapp,opening_hours')
      .in('id', ids)
      .then(({ data }) => { if (live) setBusinesses(data || []) })
    return () => { live = false }
  }, [key])

  const byId = new Map(businesses.map(business => [business.id, business]))
  const places = items.map(item => ({ ...item, business: byId.get(item.businessId) })).filter(place => place.business)
  if (!places.length) return null

  return (
    <section className="vl-event-profile-section ev-section ev-nearby-section">
      <span className="vl-event-profile-section-kicker">Perto do evento</span>
      <h2>Onde comer e ficar</h2>
      <div className="ev-nearby">
        {places.map(({ business, note }) => {
          const image = business.logo_url || business.cover_url
          const open = getOpenStatus(business.opening_hours)
          const whatsapp = whatsappUrl(business.whatsapp, `Olá! Vi vocês na página do evento "${eventTitle}" no VitrineLocal.`)
          return (
            <article className="ev-nearby-card" key={business.id}>
              <span className="ev-nearby-image">{image ? <img src={image} alt="" loading="lazy" /> : '🏪'}</span>
              <div className="ev-nearby-copy">
                <strong>{business.name}</strong>
                <span>{business.category_name || 'Empresa local'}{open?.open ? <b className="ev-nearby-open"> · Aberto agora</b> : null}</span>
                {note && <p>{note}</p>}
                <div className="ev-nearby-actions">
                  <a href={`/${citySlug}/empresa/${encodeURIComponent(business.slug)}`}>Ver empresa</a>
                  {whatsapp && <a className="is-whatsapp" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
