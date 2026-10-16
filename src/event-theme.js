// Página personalizada de evento: normalização, validação e cálculos (sem interface, fáceis de testar).
// Tudo que vem do banco passa por normalizeEventTheme antes de ser exibido.

import { normalizeFacilities } from './event-facilities.js'

export const THEME_LIMITS = { videos: 4, tickets: 10, lineup: 30, sponsors: 24, gallery: 30, faq: 20, nearby: 8 }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_BG = '#0b1424'
const DEFAULT_ACCENT = '#216df3'
export const DEFAULT_TITLE_COLOR = '#09294d'

const text = (value, max = 200) => String(value ?? '').trim().slice(0, max)

export function hexColor(value, fallback) {
  const v = String(value || '').trim()
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback
}

// Só links https (e http para sites antigos); qualquer outro esquema é descartado.
export function safeUrl(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  try {
    const url = new URL(v)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

// Endereço de incorporação do YouTube (modo de privacidade), ou vazio se o link não for de vídeo do YouTube.
export function youtubeEmbedUrl(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  let id = ''
  try {
    const url = new URL(v)
    const host = url.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') id = url.pathname.slice(1)
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || ''
      else {
        const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)
        id = match ? match[1] : ''
      }
    }
  } catch {
    return ''
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : ''
}

export function pageSlug(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

export function isValidPageSlug(value) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 60
}

function luminance(hex) {
  const channel = i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// Texto branco ou escuro, o que tiver mais contraste com o fundo.
export function readableTextOn(hex) {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#0b1424') ? '#ffffff' : '#0b1424'
}

const list = (value, max, map) => (Array.isArray(value) ? value : []).slice(0, max).map(map).filter(Boolean)

export function normalizeEventTheme(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const bg = source.background && typeof source.background === 'object' ? source.background : {}
  const type = ['color', 'gradient', 'image'].includes(bg.type) ? bg.type : 'color'
  const overlay = Math.min(0.85, Math.max(0, Number(bg.overlay ?? 0.45) || 0))
  const links = source.links && typeof source.links === 'object' ? source.links : {}
  const venueMap = source.venueMap && typeof source.venueMap === 'object' ? source.venueMap : {}
  return {
    enabled: source.enabled === true,
    partnerBadge: source.partnerBadge === true,
    countdown: source.countdown === true,
    background: {
      type,
      color: hexColor(bg.color, DEFAULT_BG),
      color2: hexColor(bg.color2, '#216df3'),
      imageUrl: safeUrl(bg.imageUrl),
      overlay,
    },
    accent: hexColor(source.accent, DEFAULT_ACCENT),
    titleColor: hexColor(source.titleColor, DEFAULT_TITLE_COLOR),
    bannerUrl: safeUrl(source.bannerUrl),
    // Lista de vídeos; o campo antigo videoUrl (um vídeo só) vira o primeiro item.
    videos: list(Array.isArray(source.videos) && source.videos.length ? source.videos : source.videoUrl ? [{ url: source.videoUrl }] : [], THEME_LIMITS.videos, v => {
      const url = text(typeof v === 'string' ? v : v?.url, 300)
      return youtubeEmbedUrl(url) ? { url, title: text(v?.title, 80) } : null
    }),
    tickets: list(source.tickets, THEME_LIMITS.tickets, t => (text(t?.name, 80) ? { name: text(t.name, 80), price: text(t.price, 30), note: text(t.note, 120) } : null)),
    lineup: list(source.lineup, THEME_LIMITS.lineup, a => (text(a?.name, 80) ? { time: text(a.time, 20), name: text(a.name, 80), photoUrl: safeUrl(a.photoUrl), description: text(a.description, 240) } : null)),
    sponsors: list(source.sponsors, THEME_LIMITS.sponsors, s => (text(s?.name, 80) || safeUrl(s?.logoUrl) ? { name: text(s.name, 80), logoUrl: safeUrl(s.logoUrl), url: safeUrl(s.url) } : null)),
    gallery: list(source.gallery, THEME_LIMITS.gallery, g => safeUrl(typeof g === 'string' ? g : g?.url) || null),
    faq: list(source.faq, THEME_LIMITS.faq, f => (text(f?.q, 160) && text(f?.a, 600) ? { q: text(f.q, 160), a: text(f.a, 600) } : null)),
    links: { instagram: safeUrl(links.instagram), spotify: safeUrl(links.spotify), website: safeUrl(links.website) },
    // Onde comer e ficar: empresas da plataforma escolhidas pelo admin, sem repetir.
    nearby: list(source.nearby, THEME_LIMITS.nearby, n => (UUID.test(String(n?.businessId || '')) ? { businessId: String(n.businessId).toLowerCase(), note: text(n.note, 140) } : null))
      .filter((n, i, all) => all.findIndex(other => other.businessId === n.businessId) === i),
    venueMap: { imageUrl: safeUrl(venueMap.imageUrl), caption: text(venueMap.caption, 160) },
    // Facilidades marcadas pelo admin (Wi-Fi, banheiros, estacionamento…).
    facilities: normalizeFacilities(source.facilities),
  }
}

// Variáveis de CSS aplicadas na página do evento quando o tema está ativo.
export function themeStyle(theme) {
  const { background: bg, accent } = theme
  const shade = `rgba(5,11,20,${bg.overlay})`
  const surface = bg.type === 'image' && bg.imageUrl
    ? `linear-gradient(${shade},${shade}), url("${bg.imageUrl.replace(/"/g, '%22')}") center / cover fixed`
    : bg.type === 'gradient'
      ? `linear-gradient(160deg, ${bg.color}, ${bg.color2})`
      : bg.color
  const base = bg.type === 'image' ? '#0b1424' : bg.color
  return {
    '--event-bg': surface,
    '--event-fg': bg.type === 'image' ? '#ffffff' : readableTextOn(base),
    '--event-accent': accent,
    '--event-accent-fg': readableTextOn(accent),
    '--event-title': theme.titleColor,
  }
}

// Aviso para o editor quando a cor de destaque fica difícil de ler sobre o fundo.
export function accentWarning(theme) {
  const base = theme.background.type === 'image' ? '#0b1424' : theme.background.color
  return contrastRatio(theme.accent, base) < 1.6 ? 'A cor de destaque está muito parecida com o fundo. Os botões podem ficar difíceis de ver.' : ''
}

// O título fica dentro do cartão branco da página: avisa quando a cor some no branco.
export function titleWarning(theme) {
  return contrastRatio(theme.titleColor, '#ffffff') < 3 ? 'A cor do título está clara demais para o fundo branco do cartão.' : ''
}

// Tempo até o início do evento, ou null quando já começou.
export function countdownParts(event, now = Date.now()) {
  if (!event?.event_date) return null
  const time = event.start_time ? String(event.start_time).slice(0, 5) : '00:00'
  const start = new Date(`${event.event_date}T${time}:00-03:00`).getTime()
  const diff = start - now
  if (!Number.isFinite(diff) || diff <= 0) return null
  const minutes = Math.floor(diff / 60000)
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 }
}
