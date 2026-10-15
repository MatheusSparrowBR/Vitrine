import { useEffect, useState } from 'react'
import { supabase as db } from './supabase-client.js'
import { getEventFavoriteIds, setEventFavorite, loginPathForIntent } from './event-favorites.js'
import ShareCardButton from './ShareCardButton.jsx'
import { countdownToReveal, normalizeTeaser, revealLabel, teaserStyle } from './event-teaser.js'
import { renderTeaserShareCard } from './event-teaser-card.js'
import './event-teaser.css'

const unit = (n, one, many) => (n === 1 ? one : many)

// Tela "Em breve" de um evento ainda não revelado. Só recebe dados públicos (public_event_teasers).
export default function EventTeaserPage({ row, city, preview = false }) {
  const teaser = normalizeTeaser(row.teaser)
  const [parts, setParts] = useState(() => countdownToReveal(row.teaser_reveal_at))
  const [saved, setSaved] = useState(false)
  const [note, setNote] = useState('')
  const auto = row.teaser_auto_reveal !== false
  const when = revealLabel(row.teaser_reveal_at)

  useEffect(() => {
    if (preview) return undefined
    document.title = `Em breve: ${row.title} | VitrineLocal`
    let live = true
    getEventFavoriteIds(db, [row.id]).then(result => { if (live) setSaved(result.ids.has(row.id)) })
    return () => { live = false }
  }, [row.id, row.title, preview])

  useEffect(() => {
    const timer = setInterval(() => {
      const next = countdownToReveal(row.teaser_reveal_at)
      setParts(next)
      // Revelação automática: ao zerar, recarrega para mostrar a página completa.
      if (!next && auto && row.teaser_reveal_at && !preview) location.reload()
    }, 30000)
    return () => clearInterval(timer)
  }, [row.teaser_reveal_at, auto, preview])

  async function notifyMe() {
    if (preview) return
    setNote('')
    try {
      const result = await setEventFavorite(db, row.id, !saved)
      if (result.requiresAuth) { location.assign(loginPathForIntent('event')); return }
      setSaved(!saved)
      setNote(!saved ? 'Pronto! Você vai receber um aviso quando os detalhes forem revelados.' : 'Aviso cancelado.')
    } catch (error) {
      setNote(error?.message || 'Não foi possível salvar agora.')
    }
  }

  return (
    <main className={`ev-teaser-page${preview ? ' is-preview' : ''}`} style={teaserStyle(teaser)}>
      <div className="ev-teaser-inner">
        {!preview && <a className="ev-teaser-back" href={`/${city.slug}/eventos`}>← Eventos em {city.name}</a>}
        {row.image_url && <img className="ev-teaser-image" src={row.image_url} alt="" />}
        <span className="ev-teaser-headline">{teaser.headline}</span>
        <h1>{row.title}</h1>
        {teaser.message && <p className="ev-teaser-message">{teaser.message}</p>}
        {when && <p className="ev-teaser-when">{auto ? 'Revelação em' : 'Previsão de revelação:'} <b>{when}</b></p>}
        {parts && (
          <div className="ev-teaser-countdown" role="timer" aria-label="Tempo até a revelação">
            <span><b>{parts.days}</b><small>{unit(parts.days, 'dia', 'dias')}</small></span>
            <span><b>{parts.hours}</b><small>{unit(parts.hours, 'hora', 'horas')}</small></span>
            <span><b>{parts.minutes}</b><small>{unit(parts.minutes, 'minuto', 'minutos')}</small></span>
          </div>
        )}
        <div className="ev-teaser-actions">
          <button type="button" className={`ev-teaser-notify${saved ? ' is-active' : ''}`} onClick={notifyMe} aria-pressed={saved}>
            {saved ? '✓ Você será avisado' : '🔔 Me avise quando revelar'}
          </button>
          {teaser.ticketUrl && (
            <a className="ev-teaser-ticket" href={teaser.ticketUrl} target="_blank" rel="noreferrer" onClick={preview ? e => e.preventDefault() : undefined}>🎟️ Comprar seu ingresso</a>
          )}
          <ShareCardButton
            buildBlob={() => renderTeaserShareCard(row, city.name)}
            fileName={`em-breve-${row.title}`}
            shareTitle={`Em breve: ${row.title}`}
            shareText={`Em breve: ${row.title}${when ? ` · revelação em ${when}` : ''}`}
            shareUrl={preview ? `https://vitrinelocal.net/${city.slug}/evento/${row.page_slug || row.id}` : location.href}
            ariaLabel={`Criar cartão para compartilhar: ${row.title}`}
            label="↗ Compartilhar cartão"
            className="ev-teaser-share-wrap"
            buttonClassName="ev-teaser-share"
          />
        </div>
        {note && <p className="ev-teaser-note" role="status">{note}</p>}
      </div>
    </main>
  )
}
