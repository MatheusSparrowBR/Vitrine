import { JOB_DESCRIPTION_MAX, JOB_TITLE_MAX, JOB_TYPES } from './job-utils.js'
import './job-postings.css'

export const EMPTY_JOB_FORM = { title: '', description: '', employment_type: 'efetivo', starts_at: '', ends_at: '' }

// Formulário de vaga. O pai controla o estado e envia o salvamento.
export default function JobPostingForm({ form, setForm, saving, onSubmit, onCancel, submitLabel = 'Publicar vaga' }) {
  const update = field => event => setForm({ ...form, [field]: event.target.value })
  return (
    <form className="job-form" onSubmit={onSubmit}>
      <div className="job-form-grid">
        <label className="job-form-full">
          <span>Título da vaga</span>
          <input required maxLength={JOB_TITLE_MAX} value={form.title} onChange={update('title')} placeholder="Ex.: Atendente de balcão" />
        </label>
        <label>
          <span>Tipo de contrato</span>
          <select value={form.employment_type} onChange={update('employment_type')}>
            {JOB_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Início das inscrições</span>
          <input type="datetime-local" required value={form.starts_at} onChange={update('starts_at')} />
        </label>
        <label>
          <span>Término das inscrições</span>
          <input type="datetime-local" required value={form.ends_at} onChange={update('ends_at')} />
          <small>A vaga some do site no horário escolhido.</small>
        </label>
        <label className="job-form-full">
          <span>Descrição</span>
          <textarea rows={4} maxLength={JOB_DESCRIPTION_MAX} value={form.description} onChange={update('description')} placeholder="Atividades, horário, requisitos e benefícios." />
        </label>
      </div>
      <p className="job-form-note">Os candidatos entram em contato pelo WhatsApp da empresa. O VitrineLocal não recebe currículos nem dados pessoais.</p>
      <div className="job-form-actions">
        {onCancel && <button type="button" className="job-btn secondary" onClick={onCancel} disabled={saving}>Cancelar</button>}
        <button type="submit" className="job-btn primary" disabled={saving}>{saving ? 'Salvando…' : submitLabel}</button>
      </div>
    </form>
  )
}
