// Cartão de compartilhamento da tela Em breve. Separado de event-teaser.js para a home não carregar o gerador de cartões.
import { renderShareCard, SHARE_CARD_SITE } from './promotion-share-card.js'
import { normalizeTeaser, revealLabel } from './event-teaser.js'

// Cartão de compartilhamento da tela Em breve: selo, nome do evento e data de revelação.
export function teaserShareCardModel(row, cityName = '') {
  const teaser = normalizeTeaser(row?.teaser)
  const when = revealLabel(row?.teaser_reveal_at)
  return {
    kicker: teaser.headline,
    title: String(row?.title || 'Evento').trim(),
    business: '',
    location: cityName ? `${cityName} · ${SHARE_CARD_SITE}` : SHARE_CARD_SITE,
    discountText: '',
    priceText: '',
    originalText: '',
    validText: when ? `Revelação em ${when}` : 'Novidades em breve',
  }
}

// A capa principal do evento tem prioridade no cartão compartilhável.
 // O fundo personalizado da tela Em breve só é usado quando o evento não possui capa.
export function teaserShareCardImageUrl(row) {
  const coverUrl = String(row?.image_url || '').trim()
  if (coverUrl) return coverUrl
  return normalizeTeaser(row?.teaser).background.imageUrl || ''
}

export function renderTeaserShareCard(row, cityName = '') {
  return renderShareCard(teaserShareCardModel(row, cityName), { imageUrl: teaserShareCardImageUrl(row) })
}
