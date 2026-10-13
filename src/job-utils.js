// Regras das vagas de emprego (sem dependências de interface, fáceis de testar).

export const JOB_TITLE_MAX = 120
export const JOB_DESCRIPTION_MAX = 1000
export const JOB_TYPES = [
  ['efetivo', 'Efetivo'],
  ['temporario', 'Temporário'],
  ['freelance', 'Freelance'],
  ['estagio', 'Estágio'],
]
export const JOB_PLAN_NOTICE = 'Vagas de emprego estão disponíveis nos planos Pro e Premium.'

const SAO_PAULO_OFFSET = '-03:00'

export function jobTypeLabel(value) {
  return JOB_TYPES.find(([key]) => key === value)?.[1] || 'Vaga'
}

// Converte o valor de um campo datetime-local (horário de São Paulo) para ISO. Devolve null se inválido.
export function localDateTimeToISO(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(`${value}:00${SAO_PAULO_OFFSET}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

// Mensagem de erro do formulário, ou string vazia quando a vaga está válida.
export function validateJobDraft(draft, now = Date.now()) {
  const title = String(draft?.title || '').trim()
  if (title.length < 3) return 'Informe o título da vaga (mínimo de 3 caracteres).'
  if (title.length > JOB_TITLE_MAX) return `O título deve ter no máximo ${JOB_TITLE_MAX} caracteres.`
  if (String(draft?.description || '').length > JOB_DESCRIPTION_MAX) return `A descrição deve ter no máximo ${JOB_DESCRIPTION_MAX} caracteres.`
  if (!JOB_TYPES.some(([key]) => key === draft?.employment_type)) return 'Escolha o tipo de contrato.'
  const start = localDateTimeToISO(draft?.starts_at)
  const end = localDateTimeToISO(draft?.ends_at)
  if (!start || !end) return 'Informe a data de início e a data de término.'
  if (new Date(end) <= new Date(start)) return 'A data de término deve ser depois do início.'
  if (new Date(end).getTime() <= now) return 'A data de término já passou.'
  return ''
}

export function isJobCurrent(job, now = Date.now()) {
  if (job?.status !== 'published') return false
  const start = new Date(job.starts_at).getTime()
  const end = new Date(job.ends_at).getTime()
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && end > now
}

export const JOB_FILTERS = [
  ['all', 'Todas'],
  ['active', 'Ativas'],
  ['scheduled', 'Agendadas'],
  ['expired', 'Vencidas'],
  ['paused', 'Pausadas'],
  ['closed', 'Encerradas'],
]

// Situação da vaga para o painel do admin. Encerrada e pausada têm prioridade sobre o prazo.
export function jobStatusBucket(job, now = Date.now()) {
  if (job?.status === 'closed') return 'closed'
  if (job?.status === 'paused') return 'paused'
  const start = new Date(job?.starts_at).getTime()
  const end = new Date(job?.ends_at).getTime()
  if (end <= now) return 'expired'
  if (start > now) return 'scheduled'
  return 'active'
}

// Link do WhatsApp da empresa com uma mensagem pronta sobre a vaga. Vazio quando não há número válido.
export function jobWhatsappUrl(whatsapp, title) {
  const digits = String(whatsapp || '').replace(/\D/g, '')
  if (digits.length < 10) return ''
  const number = digits.startsWith('55') ? digits : `55${digits}`
  const text = `Olá! Vi a vaga "${title}" no VitrineLocal e gostaria de saber mais.`
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

export function formatJobPeriod(job) {
  const format = value => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `${format(job.starts_at)} a ${format(job.ends_at)}`
}
