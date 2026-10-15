import { eventWhenLabel, isFreeEvent } from './event-utils.js'
import { renderShareCard, SHARE_CARD_SITE } from './promotion-share-card.js'

// Mantido aqui por compatibilidade; a função mora em event-utils.js (sem o gerador de cartões).
export { eventWhenLabel }

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
