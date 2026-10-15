// Modo "Em breve" do evento: configuração, regra de revelação e contador (sem interface, fáceis de testar).
import { hexColor, safeUrl, themeStyle } from './event-theme.js'
import { renderShareCard, SHARE_CARD_SITE } from './promotion-share-card.js'

const text = (value, max) => String(value ?? '').trim().slice(0, max)

export function normalizeTeaser(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const bg = source.background && typeof source.background === 'object' ? source.background : {}
  return {
    headline: text(source.headline, 40) || 'EM BREVE',
    message: text(source.message, 220),
    background: {
      type: ['color', 'gradient', 'image'].includes(bg.type) ? bg.type : 'gradient',
      color: hexColor(bg.color, '#0b1424'),
      color2: hexColor(bg.color2, '#216df3'),
      imageUrl: safeUrl(bg.imageUrl),
      overlay: Math.min(0.85, Math.max(0, Number(bg.overlay ?? 0.5) || 0)),
    },
    accent: hexColor(source.accent, '#f5b841'),
    // Link de venda de ingressos: com ele, a página Em breve mostra o botão "Comprar seu ingresso".
    ticketUrl: safeUrl(source.ticketUrl),
  }
}

// Mesma regra do banco (event_teaser_active): ligado e ainda antes da revelação automática.
export function isTeaserActive(row, now = Date.now()) {
  if (!row?.teaser_enabled) return false
  if (row.teaser_auto_reveal === false || !row.teaser_reveal_at) return true
  const reveal = new Date(row.teaser_reveal_at).getTime()
  return !Number.isFinite(reveal) || reveal > now
}

// Variáveis de CSS da tela Em breve (o texto fica direto sobre o fundo, então usa a cor de contraste).
export function teaserStyle(teaser) {
  return themeStyle({ background: teaser.background, accent: teaser.accent, titleColor: '#ffffff' })
}

export function revealLabel(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `${day} às ${time}`
}

// Tempo até a revelação, ou null quando não há data ou ela já passou.
export function countdownToReveal(iso, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  if (!iso || !Number.isFinite(diff) || diff <= 0) return null
  const minutes = Math.floor(diff / 60000)
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 }
}

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

// Converte datetime-local (horário de São Paulo) para ISO, e o contrário para preencher o campo.
export function revealInputToISO(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(`${value}:00-03:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function revealISOToInput(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return local.toISOString().slice(0, 16)
}
