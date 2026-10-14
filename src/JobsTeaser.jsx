import { useEffect, useState } from 'react'
import{supabase as sharedSupabase}from'./supabase-client.js'
import Icon from './ui-icons.jsx'
import './city-jobs.css'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = sharedSupabase

// Cartão da home com o total de vagas abertas da cidade. Não aparece quando não há vaga.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function JobsTeaser({ cityId, citySlug = 'laguna', cityName = 'Laguna' }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let live = true
    // A home usa um id provisório ('fallback') até a cidade carregar; só consulta com o UUID real.
    if (!db || !UUID.test(String(cityId || ''))) return undefined
    db.from('job_postings')
      .select('id,businesses!inner(city_id)', { count: 'exact', head: true })
      .eq('businesses.city_id', cityId)
      .eq('status', 'published')
      .then(({ count: total }) => { if (live) setCount(total || 0) })
    return () => { live = false }
  }, [cityId])

  if (!count) return null

  return (
    <section className="lvp-wrap city-jobs-teaser-section" aria-label={`Vagas abertas em ${cityName}`}>
      <a className="city-jobs-teaser" href={`/${citySlug}/vagas`}>
        <span className="city-jobs-teaser-icon"><Icon name="briefcase" size={22} /></span>
        <span className="city-jobs-teaser-copy">
          <small>OPORTUNIDADES</small>
          <strong>{count === 1 ? '1 vaga aberta' : `${count} vagas abertas`} em {cityName}</strong>
          <span>Candidate-se direto pelo WhatsApp das empresas</span>
        </span>
        <span className="city-jobs-teaser-cta">Ver vagas <Icon name="arrowRight" size={14} /></span>
      </a>
    </section>
  )
}
