import { useEffect, useMemo, useState } from 'react'
import{supabase as sharedSupabase}from'./supabase-client.js'
import { PublicHeader } from './PublicCatalogPages.jsx'
import Icon from './ui-icons.jsx'
import { isJobCurrent, JOB_TYPES, jobDeadlineLabel, jobTypeLabel, jobWhatsappUrl } from './job-utils.js'
import './core.css'
import './job-postings.css'
import './city-jobs.css'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = sharedSupabase

// Vagas abertas das empresas da cidade. O banco só devolve vagas de empresas com plano Pro ou Premium.
export default function CityJobsPage({ citySlug = 'laguna' }) {
  const [city, setCity] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('all')
  const [company, setCompany] = useState('all')

  useEffect(() => {
    let live = true
    ;(async () => {
      if (!db) {
        setCity({ id: 'fallback', name: 'Laguna', state: 'SC', slug: citySlug })
        setLoading(false)
        return
      }
      const { data: cityRow } = await db.from('cities').select('id,name,state,slug,active').eq('slug', citySlug).eq('active', true).maybeSingle()
      if (!live) return
      setCity(cityRow || null)
      if (!cityRow) return setLoading(false)
      const { data, error: jobsError } = await db.from('job_postings')
        .select('id,title,description,employment_type,starts_at,ends_at,status,source,businesses!inner(id,name,slug,whatsapp,city_id)')
        .eq('businesses.city_id', cityRow.id)
        .eq('status', 'published')
        .order('ends_at', { ascending: true })
        .limit(300)
      if (!live) return
      if (jobsError) setError('Não foi possível carregar as vagas agora.')
      setJobs((data || []).filter(job => isJobCurrent(job)))
      setLoading(false)
    })()
    return () => { live = false }
  }, [citySlug])

  const companies = useMemo(() => {
    const map = new Map()
    for (const job of jobs) map.set(job.businesses.id, job.businesses.name)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
  }, [jobs])

  const visible = jobs.filter(job => (type === 'all' || job.employment_type === type) && (company === 'all' || job.businesses.id === company))
  const cityName = city?.name || 'sua cidade'
  const base = `/${city?.slug || citySlug}`

  return (
    <div className="app">
      <PublicHeader city={city || { slug: citySlug, name: cityName }} />
      <main className="page city-jobs">
        <div className="page-tools"><a className="back-link" href={base}>← Voltar para {cityName}</a></div>
        <span className="section-kicker">OPORTUNIDADES</span>
        <h1>Vagas em {cityName}</h1>
        <p>Vagas publicadas por empresas da cidade. Candidate-se direto pelo WhatsApp da empresa.</p>

        {loading && <div className="empty"><h3>Carregando vagas…</h3></div>}
        {!loading && error && <div className="empty"><h3>{error}</h3></div>}

        {!loading && !error && jobs.length === 0 && (
          <div className="empty city-jobs-empty">
            <h3>Nenhuma vaga aberta no momento.</h3>
            <p>Novas vagas aparecem aqui quando as empresas publicarem.</p>
            <a className="city-jobs-btn" href={base}>Ver promoções e eventos</a>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <>
            <div className="city-jobs-filters" role="group" aria-label="Filtrar por tipo de contrato">
              <button type="button" className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>Todos os tipos</button>
              {JOB_TYPES.map(([key, label]) => (
                <button key={key} type="button" className={type === key ? 'active' : ''} onClick={() => setType(key)}>{label}</button>
              ))}
            </div>
            {companies.length > 1 && (
              <label className="city-jobs-company">
                <span>Empresa</span>
                <select value={company} onChange={event => setCompany(event.target.value)}>
                  <option value="all">Todas as empresas</option>
                  {companies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            )}

            {visible.length === 0 && <p className="city-jobs-none">Nenhuma vaga com esse filtro.</p>}

            <div className="city-jobs-grid">
              {visible.map(job => {
                const link = jobWhatsappUrl(job.businesses.whatsapp, job.title)
                const businessHref = `${base}/empresa/${encodeURIComponent(job.businesses.slug)}`
                return (
                  <article className="city-job-card" key={job.id}>
                    <div className="city-job-head">
                      <span className="city-job-type">{jobTypeLabel(job.employment_type)}</span>
                      <span className="city-job-deadline"><Icon name="clock" size={13} /> {jobDeadlineLabel(job)}</span>
                    </div>
                    <h2>{job.title}</h2>
                    <a className="city-job-company" href={businessHref}>{job.businesses.name} →</a>
                    {job.description && <p className="city-job-desc">{job.description}</p>}
                    <div className="city-job-actions">
                      {link
                        ? <a className="city-job-apply" href={link} target="_blank" rel="noreferrer"><Icon name="phone" size={15} /> Candidatar-se</a>
                        : <a className="city-job-apply muted" href={businessHref}>Ver empresa</a>}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
