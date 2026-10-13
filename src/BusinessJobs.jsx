import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { loginPathForIntent } from './business-relationship.js'
import Icon from './ui-icons.jsx'
import { isJobCurrent, jobDeadlineLabel, jobTypeLabel, jobWhatsappUrl } from './job-utils.js'
import './job-postings.css'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = URL && KEY ? createClient(URL, KEY) : null

// Vagas publicadas da empresa. Não aparece nada quando não há vaga ativa.
export default function BusinessJobs({ businessId, businessName, whatsapp }) {
  const [jobs, setJobs] = useState([])
  const [reporting, setReporting] = useState(null)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    let live = true
    if (!db || !businessId) return undefined
    db.from('job_postings')
      .select('id,title,description,employment_type,starts_at,ends_at,status,source')
      .eq('business_id', businessId)
      .eq('status', 'published')
      .order('ends_at', { ascending: true })
      .then(({ data }) => {
        if (live) setJobs((data || []).filter(job => isJobCurrent(job)))
      })
    db.auth.getSession().then(({ data }) => { if (live) setSession(data?.session || null) })
    return () => { live = false }
  }, [businessId])

  async function report(event, job) {
    event.preventDefault()
    if (sending) return
    const text = reason.trim()
    if (text.length < 3) return setNote('Descreva o motivo da denúncia (mínimo de 3 caracteres).')
    setSending(true)
    setNote('')
    const { error } = await db.from('job_reports').insert({ job_id: job.id, reason: text })
    setSending(false)
    if (error) return setNote('Não foi possível enviar a denúncia agora.')
    setReporting(null)
    setReason('')
    setNote('Obrigado. A VitrineLocal vai revisar a vaga.')
  }

  if (!jobs.length) return null

  return (
    <section className="mbp-panel job-public" aria-label={`Vagas de emprego em ${businessName}`}>
      <div className="mbp-title"><span>VAGAS ABERTAS</span><h2>Trabalhe com a gente</h2></div>
      <div className="job-public-list">
        {jobs.map(job => {
          const link = jobWhatsappUrl(whatsapp, job.title)
          return (
            <article className="job-public-card" key={job.id}>
              <div className="job-public-head">
                <strong>{job.title}</strong>
                <span className="job-public-type">{jobTypeLabel(job.employment_type)}</span>
              </div>
              <div className="job-public-meta">
                <span><Icon name="clock" size={13} /> {jobDeadlineLabel(job)}</span>
                {job.source === 'admin' && <span className="job-public-source">VitrineLocal</span>}
              </div>
              {job.description && <p className="job-public-desc">{job.description}</p>}
              {link && (
                <div className="job-public-apply-wrap">
                  <a className="job-public-apply" href={link} target="_blank" rel="noreferrer">
                    <Icon name="phone" size={15} /> Candidatar-se
                  </a>
                  <small>Abre o WhatsApp da empresa</small>
                </div>
              )}
              <button type="button" className="job-public-report" onClick={() => { setReporting(reporting === job.id ? null : job.id); setNote('') }}>
                Denunciar esta vaga
              </button>
              {reporting === job.id && (
                session ? (
                  <form className="job-report" onSubmit={event => report(event, job)}>
                    <label>
                      <span>Qual o problema com esta vaga?</span>
                      <textarea rows={3} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ex.: pedem pagamento ou dados pessoais" />
                    </label>
                    <button type="submit" className="job-btn primary" disabled={sending}>{sending ? 'Enviando…' : 'Enviar denúncia'}</button>
                  </form>
                ) : (
                  <p className="job-report-login">Para denunciar, <a href={loginPathForIntent('denunciar-vaga')}>entre na sua conta</a>.</p>
                )
              )}
            </article>
          )
        })}
      </div>
      {note && <small className="job-report-note" role="status">{note}</small>}
      <p className="job-public-disclaimer">A seleção é feita pela empresa.</p>
    </section>
  )
}
