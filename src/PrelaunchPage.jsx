import React from 'react'

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

      <div className="vl-prelaunch-actions">
        <a className="vl-prelaunch-primary" href="/usuario/cadastro">Cadastrar minha empresa <span aria-hidden="true">→</span></a>
        <a className="vl-prelaunch-secondary" href="/usuario/login">Já tenho uma conta</a>
      </div>

      <div className="vl-prelaunch-plan-link">
        <span>Quer conhecer os planos para empresas?</span>
        <a href="/planos">Ver planos</a>
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
