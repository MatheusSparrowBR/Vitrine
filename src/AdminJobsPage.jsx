import { useEffect, useState } from 'react'
import JobPostingForm, { EMPTY_JOB_FORM } from './JobPostingForm.jsx'
import { formatJobPeriod, isJobCurrent, jobTypeLabel, localDateTimeToISO, validateJobDraft } from './job-utils.js'
import './job-postings.css'

// Admin publica vagas em nome de uma empresa e resolve denúncias. O banco só aceita se o plano da empresa incluir vagas.
export default function AdminJobsPage({ supabase }) {
  const [businesses, setBusinesses] = useState([])
  const [businessId, setBusinessId] = useState('')
  const [jobs, setJobs] = useState([])
  const [reports, setReports] = useState([])
  const [form, setForm] = useState(EMPTY_JOB_FORM)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', error: false })

  const notify = (text, error = false) => setMessage({ text: String(text || ''), error })

  async function loadBusinesses() {
    const { data, error } = await supabase.from('businesses').select('id,name,status').order('name')
    if (error) return notify(error.message, true)
    setBusinesses(data || [])
  }

  async function loadJobs(id) {
    if (!id) return setJobs([])
    const { data, error } = await supabase.from('job_postings')
      .select('id,title,employment_type,starts_at,ends_at,status,source')
      .eq('business_id', id)
      .order('created_at', { ascending: false })
    if (error) return notify(error.message, true)
    setJobs(data || [])
  }

  async function loadReports() {
    const { data, error } = await supabase.from('job_reports')
      .select('id,reason,created_at,job_id,job_postings(id,title,status,business_id)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return notify(error.message, true)
    setReports(data || [])
  }

  useEffect(() => { loadBusinesses(); loadReports() }, [])
  useEffect(() => { loadJobs(businessId); setEditing(false) }, [businessId])

  async function publish(event) {
    event.preventDefault()
    if (saving || !businessId) return
    const problem = validateJobDraft(form)
    if (problem) return notify(problem, true)
    setSaving(true)
    notify('')
    const { error } = await supabase.from('job_postings').insert({
      business_id: businessId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      employment_type: form.employment_type,
      starts_at: localDateTimeToISO(form.starts_at),
      ends_at: localDateTimeToISO(form.ends_at),
      status: 'published',
      source: 'admin',
    })
    setSaving(false)
    if (error) {
      return notify(error.code === '42501'
        ? 'Esta empresa não tem o recurso de vagas. Ela precisa estar no plano Pro ou Premium.'
        : error.message || 'Não foi possível publicar a vaga.', true)
    }
    setEditing(false)
    setForm(EMPTY_JOB_FORM)
    notify('Vaga publicada. A empresa deve ser avisada.')
    loadJobs(businessId)
  }

  async function setJobStatus(job, status) {
    const { error } = await supabase.from('job_postings').update({ status, updated_at: new Date().toISOString() }).eq('id', job.id)
    if (error) return notify(error.message, true)
    notify(status === 'paused' ? 'Vaga pausada.' : 'Vaga encerrada.')
    loadJobs(businessId)
    loadReports()
  }

  async function dismissReport(report) {
    const { error } = await supabase.from('job_reports').delete().eq('id', report.id)
    if (error) return notify(error.message, true)
    notify('Denúncia arquivada.')
    loadReports()
  }

  return (
    <div className="job-section">
      {message.text && <div className={`job-alert ${message.error ? 'error' : 'success'}`}>{message.text}</div>}

      <section className="account-card job-card">
        <div className="job-card-head">
          <div>
            <span className="account-eyebrow">PUBLICAR EM NOME DA EMPRESA</span>
            <h2>Escolha a empresa</h2>
            <p>Só publique com a autorização da empresa. A vaga fica marcada como "Publicada pela VitrineLocal".</p>
          </div>
        </div>
        <label className="job-select">
          <span>Empresa</span>
          <select value={businessId} onChange={event => setBusinessId(event.target.value)}>
            <option value="">Selecione uma empresa</option>
            {businesses.map(business => <option key={business.id} value={business.id}>{business.name}{business.status !== 'active' ? ' (inativa)' : ''}</option>)}
          </select>
        </label>

        {businessId && !editing && <button type="button" className="job-btn primary" onClick={() => { setEditing(true); notify('') }}>＋ Nova vaga para esta empresa</button>}
        {businessId && editing && (
          <JobPostingForm form={form} setForm={setForm} saving={saving} onSubmit={publish} onCancel={() => { setEditing(false); setForm(EMPTY_JOB_FORM) }} />
        )}

        {businessId && jobs.length === 0 && <p className="job-empty">Esta empresa ainda não tem vagas.</p>}
        {jobs.length > 0 && (
          <div className="job-list">
            {jobs.map(job => (
              <article className="job-row" key={job.id}>
                <div className="job-row-main">
                  <strong>{job.title}</strong>
                  <span>{jobTypeLabel(job.employment_type)} · {formatJobPeriod(job)}</span>
                  {job.source === 'admin' && <small>Publicada pela VitrineLocal</small>}
                </div>
                <span className={`job-status ${isJobCurrent(job) ? 'live' : job.status}`}>{isJobCurrent(job) ? 'No ar' : job.status}</span>
                <div className="job-row-actions">
                  {job.status === 'published' && <button type="button" className="job-btn secondary" onClick={() => setJobStatus(job, 'paused')}>Pausar</button>}
                  {job.status !== 'closed' && <button type="button" className="job-btn secondary" onClick={() => setJobStatus(job, 'closed')}>Encerrar</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="account-card job-card">
        <div className="job-card-head">
          <div>
            <span className="account-eyebrow">DENÚNCIAS</span>
            <h2>Vagas denunciadas</h2>
            <p>Pause a vaga se houver golpe ou irregularidade, e depois arquive a denúncia.</p>
          </div>
        </div>
        {reports.length === 0 && <p className="job-empty">Nenhuma denúncia pendente.</p>}
        {reports.length > 0 && (
          <div className="job-list">
            {reports.map(report => (
              <article className="job-row" key={report.id}>
                <div className="job-row-main">
                  <strong>{report.job_postings?.title || 'Vaga removida'}</strong>
                  <span>{report.reason}</span>
                  <small>{new Date(report.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · vaga {report.job_postings?.status || '—'}</small>
                </div>
                <div className="job-row-actions">
                  {report.job_postings?.status === 'published' && (
                    <button type="button" className="job-btn secondary" onClick={() => setJobStatus({ id: report.job_postings.id }, 'paused')}>Pausar vaga</button>
                  )}
                  <button type="button" className="job-btn ghost" onClick={() => dismissReport(report)}>Arquivar denúncia</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
