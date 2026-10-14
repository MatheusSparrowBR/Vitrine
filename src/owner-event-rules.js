import { projectTodayISO } from './promotion-service.js'

// Regras dos eventos enviados por empresas (sem interface, fáceis de testar).

export const EVENT_PLAN_NOTICE = 'Publicar eventos na agenda da cidade está disponível nos planos Pro e Premium.'

// Situação do evento para o dono da empresa.
export function ownerEventStatus(event, today = projectTodayISO()) {
  if (event.review_status === 'pending') return ['Em análise', 'paused']
  if (event.review_status === 'rejected') return ['Recusado: edite e reenvie', 'closed']
  if (event.event_end_date && event.event_end_date < today) return ['Encerrado', 'closed']
  return event.active ? ['Publicado', 'live'] : ['Pausado pela VitrineLocal', 'paused']
}

// Mensagem de erro do formulário, ou vazio quando o evento está válido.
export function validateEventDraft(form, today = projectTodayISO()) {
  if (String(form.title || '').trim().length < 3) return 'Informe o nome do evento (mínimo de 3 caracteres).'
  if (!form.event_date) return 'Informe a data de início.'
  const end = form.event_end_date || form.event_date
  if (end < form.event_date) return 'A data de fim não pode ser antes do início.'
  if (end < today) return 'A data do evento já passou.'
  if (form.price !== '' && !(Number(form.price) >= 0)) return 'Informe um preço válido ou deixe em branco para evento gratuito.'
  if (form.external_url && !/^https?:\/\//i.test(form.external_url.trim())) return 'O link deve começar com http:// ou https://.'
  return ''
}
