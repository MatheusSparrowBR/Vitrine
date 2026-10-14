import { isFreeEvent } from './event-utils.js'
import { renderShareCard, SHARE_CARD_SITE } from './promotion-share-card.js'

const shortDate = value => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '')

// Quando acontece, em uma linha: "18/10 às 20:00" ou "18/10 a 20/10 às 20:00".
export function eventWhenLabel(event) {
  const start = shortDate(event?.event_date)
  const end = event?.event_end_date && event.event_end_date !== event.event_date ? shortDate(event.event_end_date) : ''
  const time = event?.start_time ? String(event.start_time).slice(0, 5) : ''
  return [end ? `${start} a ${end}` : start, time ? `às ${time}` : ''].filter(Boolean).join(' ')
}

// Textos do cartão de evento, no mesmo formato do cartão de promoção.
export function eventShareCardModel(event, { cityName = '', businessName = '' } = {}) {
  const price = Number(event?.price)
  return {
    kicker: 'EVENTO',
    title: String(event?.title || 'Evento').trim(),
    business: String(event?.location || businessName || '').trim(),
    location: cityName ? `${cityName} · ${SHARE_CARD_SITE}` : SHARE_CARD_SITE,
    discountText: '',
    priceText: isFreeEvent(event) ? 'Entrada gratuita' : Number.isFinite(price) ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '',
    originalText: '',
    validText: eventWhenLabel(event),
  }
}

export function renderEventShareCard(event, meta = {}) {
  return renderShareCard(eventShareCardModel(event, meta), { imageUrl: event?.image_url || '' })
}
