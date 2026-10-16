import { useEffect, useRef, useState } from 'react'
import Icon from './ui-icons.jsx'

// Ações do evento em blocos do mesmo tamanho: ícone em cima, nome embaixo.
// "Agenda" junta o arquivo .ics (Apple, Outlook…) e o Google Agenda num menu só.
export default function EventActionBar({ saved, onToggleSave, onDownloadIcs, googleCalendarHref, directionsHref, onShare, shareLabel = 'Compartilhar' }) {
  const [agendaOpen, setAgendaOpen] = useState(false)
  const agendaRef = useRef(null)

  useEffect(() => {
    if (!agendaOpen) return undefined
    const closeOutside = e => { if (!agendaRef.current?.contains(e.target)) setAgendaOpen(false) }
    const closeOnEsc = e => { if (e.key === 'Escape') setAgendaOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEsc)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEsc)
    }
  }, [agendaOpen])

  return (
    <div className="ev-actions" role="group" aria-label="Ações do evento">
      <button type="button" className={`ev-action${saved ? ' is-active' : ''}`} aria-pressed={saved} onClick={onToggleSave}>
        <span className="ev-action-icon"><Icon name="heart" size={20} filled={saved} /></span>
        <span className="ev-action-label">{saved ? 'Salvo' : 'Salvar'}</span>
      </button>

      <div className="ev-action-wrap" ref={agendaRef}>
        <button type="button" className={`ev-action${agendaOpen ? ' is-open' : ''}`} aria-haspopup="menu" aria-expanded={agendaOpen} onClick={() => setAgendaOpen(open => !open)}>
          <span className="ev-action-icon"><Icon name="calendar" size={20} /></span>
          <span className="ev-action-label">Agenda</span>
        </button>
        {agendaOpen && (
          <div className="ev-action-menu" role="menu">
            <a role="menuitem" href={googleCalendarHref} target="_blank" rel="noreferrer" onClick={() => setAgendaOpen(false)}>Google Agenda</a>
            <button type="button" role="menuitem" onClick={() => { setAgendaOpen(false); onDownloadIcs() }}>Apple, Outlook e outros</button>
          </div>
        )}
      </div>

      {directionsHref && (
        <a className="ev-action" href={directionsHref} target="_blank" rel="noreferrer">
          <span className="ev-action-icon"><Icon name="pin" size={20} /></span>
          <span className="ev-action-label">Como chegar</span>
        </a>
      )}

      <button type="button" className="ev-action" onClick={onShare}>
        <span className="ev-action-icon"><Icon name="share" size={20} /></span>
        <span className="ev-action-label" aria-live="polite">{shareLabel}</span>
      </button>
    </div>
  )
}
