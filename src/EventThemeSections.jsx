import { useEffect, useState } from 'react'
import { countdownParts, youtubeEmbedUrl } from './event-theme.js'
import './event-theme.css'

// Contagem regressiva até o início do evento. Some quando o evento começa.
export function EventCountdown({ event }) {
  const [parts, setParts] = useState(() => countdownParts(event))
  useEffect(() => {
    const timer = setInterval(() => setParts(countdownParts(event)), 30000)
    return () => clearInterval(timer)
  }, [event])
  if (!parts) return null
  const unit = (n, one, many) => (n === 1 ? one : many)
  return (
    <div className="ev-countdown" role="timer" aria-label="Tempo até o início do evento">
      <span className="ev-countdown-label">Faltam</span>
      <span className="ev-countdown-box"><b>{parts.days}</b><small>{unit(parts.days, 'dia', 'dias')}</small></span>
      <span className="ev-countdown-box"><b>{parts.hours}</b><small>{unit(parts.hours, 'hora', 'horas')}</small></span>
      <span className="ev-countdown-box"><b>{parts.minutes}</b><small>{unit(parts.minutes, 'minuto', 'minutos')}</small></span>
    </div>
  )
}

function Section({ kicker, title, children, className = '' }) {
  return (
    <section className={`vl-event-profile-section ev-section ${className}`.trim()}>
      <span className="vl-event-profile-section-kicker">{kicker}</span>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

// Seções extras da página personalizada, na ordem em que aparecem.
export default function EventThemeSections({ theme, eventTitle = '' }) {
  const videos = theme.videos.map(video => ({ ...video, embed: youtubeEmbedUrl(video.url) })).filter(video => video.embed)
  const { links } = theme
  const hasLinks = links.instagram || links.spotify || links.website
  return (
    <>
      {videos.length > 0 && (
        <Section kicker={videos.length > 1 ? 'Vídeos' : 'Vídeo'} title="Assista" className="ev-video-section">
          <div className={`ev-videos${videos.length > 1 ? ' is-multiple' : ''}`}>
            {videos.map((video, i) => (
              <figure className="ev-video-item" key={i}>
                <div className="ev-video">
                  <iframe src={video.embed} title={`Vídeo: ${video.title || eventTitle}`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                </div>
                {video.title && <figcaption>{video.title}</figcaption>}
              </figure>
            ))}
          </div>
        </Section>
      )}

      {theme.tickets.length > 0 && (
        <Section kicker="Ingressos" title="Lotes e setores">
          <ul className="ev-tickets">
            {theme.tickets.map((ticket, i) => (
              <li key={i}><div><strong>{ticket.name}</strong>{ticket.note && <small>{ticket.note}</small>}</div>{ticket.price && <b>{ticket.price}</b>}</li>
            ))}
          </ul>
        </Section>
      )}

      {theme.lineup.length > 0 && (
        <Section kicker="Programação" title="Line-up">
          <ol className="ev-lineup">
            {theme.lineup.map((act, i) => (
              <li key={i}>
                {act.photoUrl ? <img src={act.photoUrl} alt="" loading="lazy" /> : <span className="ev-lineup-placeholder" aria-hidden="true">♪</span>}
                <div>{act.time && <time>{act.time}</time>}<strong>{act.name}</strong>{act.description && <p>{act.description}</p>}</div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {theme.gallery.length > 0 && (
        <Section kicker="Galeria" title="Fotos">
          <div className="ev-gallery">
            {theme.gallery.map((url, i) => <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Foto ${i + 1} de ${eventTitle}`} loading="lazy" /></a>)}
          </div>
        </Section>
      )}

      {theme.faq.length > 0 && (
        <Section kicker="Dúvidas" title="Perguntas frequentes">
          <div className="ev-faq">
            {theme.faq.map((item, i) => <details key={i}><summary>{item.q}</summary><p>{item.a}</p></details>)}
          </div>
        </Section>
      )}

      {hasLinks && (
        <Section kicker="Redes" title="Acompanhe o evento">
          <div className="ev-links">
            {links.instagram && <a href={links.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            {links.spotify && <a href={links.spotify} target="_blank" rel="noreferrer">Playlist no Spotify</a>}
            {links.website && <a href={links.website} target="_blank" rel="noreferrer">Site oficial</a>}
          </div>
        </Section>
      )}

      {theme.sponsors.length > 0 && (
        <Section kicker="Patrocínio" title="Patrocinadores e apoio" className="ev-sponsors-section">
          <div className="ev-sponsors">
            {theme.sponsors.map((sponsor, i) => {
              const content = sponsor.logoUrl ? <img src={sponsor.logoUrl} alt={sponsor.name || 'Patrocinador'} loading="lazy" /> : <span>{sponsor.name}</span>
              return sponsor.url
                ? <a key={i} href={sponsor.url} target="_blank" rel="noreferrer sponsored">{content}</a>
                : <div key={i}>{content}</div>
            })}
          </div>
        </Section>
      )}
    </>
  )
}
