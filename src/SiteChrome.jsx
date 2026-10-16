// Peças comuns a todas as páginas públicas: rodapé, menu inferior do celular e a trilha "você está aqui".
import React, { useEffect, useState } from 'react'
import Icon from './ui-icons.jsx'
import { CONTATO, currentCitySlug, loadActiveCities, loadJobsCount } from './site-context.js'
import './site-chrome.css'

export function useCityInfo() {
  const [citySlug] = useState(currentCitySlug)
  const [cities, setCities] = useState([])
  const [jobs, setJobs] = useState(0)
  useEffect(() => {
    let live = true
    loadActiveCities().then((list) => { if (live) setCities(list) })
    loadJobsCount(citySlug).then((n) => { if (live) setJobs(n) })
    return () => { live = false }
  }, [citySlug])
  const city = cities.find((c) => c.slug === citySlug) || null
  return { citySlug, city, cities, jobs }
}

// Trilha no topo das páginas: "← Laguna › Empresas › Pizzaria". Item com current = página atual (sem link).
// back = para onde a seta volta (padrão: o item com link mais próximo do fim).
export function PageTrail({ items = [], back = null, className = '' }) {
  const links = items.filter(Boolean)
  if (!links.length) return null
  const alvo = back || [...links].reverse().find((item) => item.href && !item.current) || null
  return (
    <nav className={`vl-trail ${className}`} aria-label="Você está aqui">
      {alvo?.href && <a className="vl-trail-back" href={alvo.href} aria-label={`Voltar para ${alvo.label}`}><Icon name="arrowLeft" size={16} /></a>}
      <ol>
        {links.map((item, i) => (
          <li key={i}>{item.href && !item.current ? <a href={item.href}>{item.label}</a> : <span aria-current={item.current ? 'page' : undefined}>{item.label}</span>}</li>
        ))}
      </ol>
    </nav>
  )
}

// Menu fixo do celular: sempre os mesmos 4 atalhos, em todas as páginas.
export function MobileTabBar() {
  const { citySlug } = useCityInfo()
  const path = location.pathname.replace(/\/+$/, '') || '/'
  const base = `/${citySlug}`
  const buscando = path.startsWith(`${base}/empresas`) || path.includes('/empresa/') || path.startsWith(`${base}/promocoes`) || path.startsWith(`${base}/vagas`)
  const tabs = [
    { id: 'inicio', label: 'Início', icon: 'home', href: base, on: path === base || path === '/' },
    { id: 'buscar', label: 'Buscar', icon: 'search', href: `${base}/empresas?buscar=1`, on: buscando },
    { id: 'eventos', label: 'Eventos', icon: 'calendar', href: `${base}/eventos`, on: path.startsWith(`${base}/evento`) },
    { id: 'salvos', label: 'Salvos', icon: 'heart', href: '/usuario/perfil?mode=personal&tab=favorites', on: path.startsWith('/usuario/perfil') },
  ]
  return (
    <nav className="vl-tabbar" aria-label="Atalhos">
      {tabs.map((t) => (
        <a key={t.id} href={t.href} className={t.on ? 'is-active' : ''} aria-current={t.on ? 'page' : undefined}>
          <Icon name={t.icon} size={22} filled={t.on && t.id === 'salvos'} /><span>{t.label}</span>
        </a>
      ))}
    </nav>
  )
}

export function SiteFooter() {
  const { citySlug, city, cities, jobs } = useCityInfo()
  const base = `/${citySlug}`
  const nomes = cities.filter((c) => c.id !== 'fallback').map((c) => c.name)
  const estado = city?.state || cities[0]?.state || 'SC'
  return (
    <footer className="vl-footer">
      <div className="vl-footer-grid">
        <div className="vl-footer-brand">
          <a href={base} aria-label="VitrineLocal início"><img src="/vitrine-local-header-logo.svg" alt="VitrineLocal — A cidade em um só lugar" width="190" height="44" /></a>
          <p>Empresas, promoções e eventos da sua cidade, em um só lugar.</p>
          {nomes.length > 0 && <p className="vl-footer-cities"><Icon name="pin" size={14} /> {nomes.join(' · ')} — {estado}</p>}
        </div>
        <div>
          <b>Explorar</b>
          <a href={`${base}/empresas`}>Empresas</a>
          <a href={`${base}/promocoes`}>Promoções</a>
          <a href={`${base}/eventos`}>Eventos</a>
          {jobs > 0 && <a href={`${base}/vagas`}>Vagas</a>}
        </div>
        <div>
          <b>Para empresas</b>
          <a href="/conta/nova">Cadastrar empresa</a>
          <a href="/planos">Planos</a>
          <a href="/conta/publicidade">Publicidade</a>
          <a href="/login">Área da empresa</a>
        </div>
        <div className="vl-footer-contact">
          <b>Fale com a gente</b>
          <a href={`mailto:${CONTATO.email}`}><Icon name="mail" size={16} /> {CONTATO.email}</a>
          <a href={CONTATO.instagramUrl} target="_blank" rel="noreferrer"><Icon name="instagram" size={16} /> {CONTATO.instagram}</a>
        </div>
      </div>
      <div className="vl-footer-bottom">
        <span>© {new Date().getFullYear()} VitrineLocal</span>
        <span className="vl-footer-legal"><a href="/privacidade">Privacidade</a><a href="/termos">Termos de uso</a></span>
      </div>
    </footer>
  )
}
