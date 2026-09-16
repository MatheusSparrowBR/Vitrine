import React from 'react'

function InstagramIcon(){
  return <svg className="vl-prelaunch-social-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/>
  </svg>
}

function MailIcon(){
  return <svg className="vl-prelaunch-social-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="m4.8 7 6 5a1.9 1.9 0 0 0 2.4 0l6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
}

export default function PrelaunchPage(){
  return <main className="vl-prelaunch" aria-labelledby="vl-prelaunch-title">
    <div className="vl-prelaunch-orb vl-prelaunch-orb-a" aria-hidden="true" />
    <div className="vl-prelaunch-orb vl-prelaunch-orb-b" aria-hidden="true" />
    <section className="vl-prelaunch-shell">
      <div className="vl-prelaunch-brand-wrap">
        <img className="vl-prelaunch-logo" src="/vitrine-local-header-logo.svg" alt="VitrineLocal" />
      </div>

      <span className="vl-prelaunch-badge">LANÇAMENTO EM BREVE</span>
      <h1 id="vl-prelaunch-title">A cidade em um só lugar.</h1>
      <p className="vl-prelaunch-lead">Estamos preparando a VitrineLocal para conectar pessoas, empresas, serviços, promoções e oportunidades da sua cidade em um só lugar.</p>

      <div className="vl-prelaunch-socials" aria-label="Canais de contato da VitrineLocal">
        <a className="vl-prelaunch-social" href="https://www.instagram.com/vitrinelocaal/" target="_blank" rel="noreferrer">
          <InstagramIcon />
          <span>@vitrinelocaal</span>
        </a>
        <a className="vl-prelaunch-social" href="mailto:contato@vitrinelocal.net">
          <MailIcon />
          <span>contato@vitrinelocal.net</span>
        </a>
      </div>

      <div className="vl-prelaunch-plan-link">
        <span>Quer conhecer os planos para empresas?</span>
        <a href="/em-breve/planos">Ver planos</a>
      </div>

      <div className="vl-prelaunch-divider" />

      <div className="vl-prelaunch-grid">
        <article>
          <strong>Para empresas</strong>
          <p>Prepare sua presença, cadastre sua empresa e organize sua vitrine antes do lançamento.</p>
        </article>
        <article>
          <strong>Para clientes</strong>
          <p>Em breve será mais fácil descobrir negócios, serviços, promoções e o que acontece na sua cidade.</p>
        </article>
        <article>
          <strong>VitrineLocal</strong>
          <p>Uma nova forma de aproximar quem procura de quem oferece.</p>
        </article>
      </div>
    </section>

    <footer className="vl-prelaunch-footer">
      <span>© {new Date().getFullYear()} VitrineLocal</span>
      <span>Em preparação para o lançamento</span>
    </footer>
  </main>
}
