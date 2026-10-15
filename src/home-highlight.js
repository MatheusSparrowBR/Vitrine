// Destaque de evento na home: escolha do destaque ativo e textos exibidos (sem interface, fáceis de testar).
import { countdownParts, normalizeEventTheme, safeUrl } from './event-theme.js'
import { countdownToReveal, normalizeTeaser, revealLabel } from './event-teaser.js'
import { eventWhenLabel } from './event-utils.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Um destaque por vez: o que está no período e começou por último.
export function pickActiveHighlight(rows, now = Date.now()) {
  return (Array.isArray(rows) ? rows : [])
    .filter(row => new Date(row.starts_at).getTime() <= now && new Date(row.ends_at).getTime() > now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())[0] || null
}

// O que a home mostra. "teaser" é um evento em modo Em breve: sem data, local nem preço.
export function highlightView({ mode, kind, event }, citySlug = 'laguna') {
  const href = `/${citySlug}/evento/${event.page_slug || event.id}`
  if (kind === 'teaser') {
    const teaser = normalizeTeaser(event.teaser)
    const when = revealLabel(event.teaser_reveal_at)
    return {
      mode,
      badge: teaser.headline,
      title: event.title,
      imageUrl: teaser.background.imageUrl || safeUrl(event.image_url),
      accent: teaser.accent,
      when: when ? `Revelação em ${when}` : 'Novidades em breve',
      place: '',
      countdown: countdownToReveal(event.teaser_reveal_at),
      href,
      cta: teaser.ticketUrl ? { label: 'Comprar ingresso', href: teaser.ticketUrl, external: true } : { label: 'Saiba mais', href, external: false },
    }
  }
  const theme = normalizeEventTheme(event.page_theme)
  const ticket = safeUrl(event.external_url)
  return {
    mode,
    badge: 'EVENTO EM DESTAQUE',
    title: event.title,
    imageUrl: (theme.enabled && theme.bannerUrl) || safeUrl(event.image_url),
    accent: theme.enabled ? theme.accent : '#216df3',
    when: eventWhenLabel(event),
    place: event.location || '',
    countdown: countdownParts(event),
    href,
    cta: ticket ? { label: 'Comprar ingresso', href: ticket, external: true } : { label: 'Ver evento', href, external: false },
  }
}

export function countdownShort(parts) {
  if (!parts) return ''
  return parts.days > 0 ? `Faltam ${parts.days}d ${parts.hours}h` : `Faltam ${parts.hours}h ${parts.minutes}min`
}

// Busca o destaque ativo da cidade e os dados públicos do evento (ou da página Em breve).
export async function loadHomeHighlight(db, cityId) {
  if (!db || !UUID.test(String(cityId || ''))) return null
  const now = new Date().toISOString()
  const { data: rows } = await db.from('home_highlights')
    .select('event_id,mode,starts_at,ends_at')
    .eq('city_id', cityId)
    .lte('starts_at', now)
    .gt('ends_at', now)
    .order('starts_at', { ascending: false })
    .limit(5)
  const active = pickActiveHighlight(rows)
  if (!active) return null
  const { data: event } = await db.from('events')
    .select('id,title,image_url,event_date,event_end_date,start_time,location,external_url,page_slug,page_theme')
    .eq('id', active.event_id)
    .maybeSingle()
  if (event) return { mode: active.mode, kind: 'event', event }
  const { data: teaser } = await db.from('public_event_teasers')
    .select('id,title,image_url,page_slug,teaser,teaser_reveal_at,teaser_auto_reveal')
    .eq('id', active.event_id)
    .maybeSingle()
  return teaser ? { mode: active.mode, kind: 'teaser', event: teaser } : null
}
