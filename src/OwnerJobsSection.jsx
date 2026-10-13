import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import JobPostingForm, { EMPTY_JOB_FORM } from './JobPostingForm.jsx'
import { formatJobPeriod, isJobCurrent, jobTypeLabel, JOB_PLAN_NOTICE, localDateTimeToISO, validateJobDraft } from './job-utils.js'
import './job-postings.css'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = URL && KEY ? createClient(URL, KEY) : null

const STATUS_LABEL = { published: 'Publicada', paused: 'Pausada', closed: 'Encerrada' }

export default function OwnerJobsSection({ businessId, businessName }) {
  const [items, setItems] = useState([])
  const [allowed, setAllowed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_JOB_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', error: false })

  const notify = (text, error = false) => setMessage({ text: String(text || ''), error })

  async function load() {
    if (!db || !businessId) return
    setLoading(true)
    const [jobs, plan] = await Promise.all([
      db.from('job_postings')
        .select('id,title,description,employment_type,starts_at,ends_at,status,source,created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      db.rpc('business_plan_allows_jobs', { p_business_id: businessId }),
    ])
    if (jobs.error) notify(jobs.error.message, true)
    setItems(jobs.data || [])
    setAllowed(plan.error ? false : Boolean(plan.data))
    setLoading(false)
  }

  useEffect(() => { load() }, [businessId])

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    const problem = validateJobDraft(form)
    if (problem) return notify(problem, true)
    setSaving(true)
    notify('')
    const { error } = await db.from('job_postings').insert({
      business_id: businessId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      employment_type: form.employment_type,
      starts_at: localDateTimeToISO(form.starts_at),
      ends_at: localDateTimeToISO(form.ends_at),
      status: 'published',
      source: 'owner',
    })
    setSaving(false)
    if (error) return notify(error.message || 'Não foi possível publicar a vaga.', true)
    setEditing(false)
    setForm(EMPTY_JOB_FORM)
    notify('Vaga publicada.')
    load()
  }

  async function changeStatus(job, status) {
    const { error } = await db.from('job_postings').update({ status, updated_at: new Date().toISOString() }).eq('id', job.id)
    if (error) return notify(error.message, true)
    notify(status === 'closed' ? 'Vaga encerrada.' : status === 'paused' ? 'Vaga pausada.' : 'Vaga reativada.')
    load()
  }

  if (loading) return <div className="job-section"><div className="job-skeleton">Carregando vagas…</div></div>

  return (
    <div className="job-section">
      {message.text && <div className={`job-alert ${message.error ? 'error' : 'success'}`}>{message.text}</div>}

      <section className="account-card job-card">
        <div className="job-card-head">
          <div>
            <span className="account-eyebrow">VAGAS DE EMPREGO</span>
            <h2>Vagas da {businessName || 'sua empresa'}</h2>
            <p>As vagas aparecem no perfil público da empresa, com botão para o candidato chamar no WhatsApp.</p>
          </div>
          {allowed && !editing && <button type="button" className="job-btn primary" onClick={() => { setEditing(true); notify('') }}>＋ Nova vaga</button>}
        </div>

        {allowed === false && (
          <div className="job-upgrade">
            <strong>Recurso dos planos Pro e Premium</strong>
            <p>{JOB_PLAN_NOTICE}</p>
            <a className="job-btn primary" href={`/planos?business_id=${encodeURIComponent(businessId)}`}>Ver planos</a>
          </div>
        )}

        {allowed && editing && (
          <JobPostingForm
            form={form}
            setForm={setForm}
            saving={saving}
            onSubmit={submit}
            onCancel={() => { setEditing(false); setForm(EMPTY_JOB_FORM) }}
          />
        )}

        {items.length === 0 && <p className="job-empty">Nenhuma vaga cadastrada ainda.</p>}

        {items.length > 0 && (
          <div className="job-list">
            {items.map(job => {
              const live = isJobCurrent(job)
              return (
                <article className="job-row" key={job.id}>
                  <div className="job-row-main">
                    <strong>{job.title}</strong>
                    <span>{jobTypeLabel(job.employment_type)} · {formatJobPeriod(job)}</span>
                    {job.source === 'admin' && <small>Publicada pela VitrineLocal</small>}
                  </div>
                  <span className={`job-status ${live ? 'live' : job.status}`}>{live ? 'No ar' : STATUS_LABEL[job.status] || job.status}</span>
                  <div className="job-row-actions">
                    {job.status === 'published' && <button type="button" className="job-btn secondary" onClick={() => changeStatus(job, 'paused')}>Pausar</button>}
                    {job.status === 'paused' && allowed && <button type="button" className="job-btn secondary" onClick={() => changeStatus(job, 'published')}>Reativar</button>}
                    {job.status !== 'closed' && <button type="button" className="job-btn secondary" onClick={() => changeStatus(job, 'closed')}>Encerrar</button>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
