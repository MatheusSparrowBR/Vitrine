import { useEffect, useState } from 'react'
import { supabase as db } from './supabase-client.js'
import { readableTextOn } from './event-theme.js'
import { countdownShort, highlightView, loadHomeHighlight } from './home-highlight.js'
import './home-event-highlight.css'

// Destaque ativo da cidade, pronto para exibir. Null quando não há destaque.
export function useHomeHighlight(cityId, citySlug) {
  const [view, setView] = useState(null)
  useEffect(() => {
    let live = true
    loadHomeHighlight(db, cityId).then(highlight => { if (live) setView(highlight ? highlightView(highlight, citySlug) : null) })
    return () => { live = false }
  }, [cityId, citySlug])
  return view
}

function Cta({ view, className }) {
  const style = { '--hl-accent': view.accent, '--hl-accent-fg': readableTextOn(view.accent) }
  return (
    <a className={className} style={style} href={view.cta.href} {...(view.cta.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {view.cta.label} →
    </a>
  )
}

// Faixa abaixo do topo da home: imagem, nome, data, contador e botão.
export function HomeEventStrip({ view }) {
  if (!view || view.mode !== 'strip') return null
  const countdown = countdownShort(view.countdown)
  return (
    <section className="lvp-wrap home-hl-strip-section" aria-label={`Evento em destaque: ${view.title}`}>
      <div className="home-hl-strip" style={{ '--hl-accent': view.accent }}>
        <a className="home-hl-strip-image" href={view.href} tabIndex={-1} aria-hidden="true">
          {view.imageUrl
            ? <>
                {/* Cópia desfocada atrás: a arte inteira aparece sem cortar o cartaz. */}
                <span className="home-hl-strip-blur" style={{ backgroundImage: `url("${view.imageUrl.replace(/"/g, '%22')}")` }} aria-hidden="true" />
                <img src={view.imageUrl} alt="" loading="lazy" />
              </>
            : <span>📅</span>}
        </a>
        <div className="home-hl-strip-copy">
          <small>{view.badge}</small>
          <a href={view.href}><strong>{view.title}</strong></a>
          <span>{[view.when, view.place].filter(Boolean).join(' · ')}</span>
          {countdown && <em>{countdown}</em>}
        </div>
        <Cta view={view} className="home-hl-cta" />
      </div>
    </section>
  )
}

// Topo da home com a arte do evento (patrocínio grande): camada de fundo com escurecimento.
export function HomeHeroTakeoverBg({ view }) {
  if (!view || view.mode !== 'hero' || !view.imageUrl) return null
  return <div className="home-hl-hero-bg" style={{ backgroundImage: `url("${view.imageUrl.replace(/"/g, '%22')}")` }} aria-hidden="true" />
}

// Etiqueta do evento dentro do topo, acima do título "Descubra o que…".
export function HomeHeroEventPill({ view }) {
  if (!view || view.mode !== 'hero') return null
  const countdown = countdownShort(view.countdown)
  return (
    <div className="home-hl-hero-pill" style={{ '--hl-accent': view.accent }}>
      <span className="home-hl-hero-badge">★ {view.badge}</span>
      <a className="home-hl-hero-title" href={view.href}>{view.title}</a>
      <span className="home-hl-hero-when">{[view.when, countdown].filter(Boolean).join(' · ')}</span>
      <Cta view={view} className="home-hl-cta" />
    </div>
  )
}
