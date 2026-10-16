import { useEffect, useState } from 'react'
import{supabase as sharedSupabase}from'./supabase-client.js'
import { loadPublicPlans } from './plan-presentation.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = sharedSupabase

export default function PrelaunchPlansPage(){
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = 'Planos para empresas | VitrineLocal' }, [])

  useEffect(() => {
    let live = true
    loadPublicPlans(db).then(list => {
      if (!live) return
      setPlans(list)
      setLoading(false)
    })
    return () => { live = false }
  }, [])

  return <main className="vl-prelaunch-plans" aria-labelledby="vl-prelaunch-plans-title">
    <div className="vl-prelaunch-plans-orb vl-prelaunch-plans-orb-a" aria-hidden="true" />
    <div className="vl-prelaunch-plans-orb vl-prelaunch-plans-orb-b" aria-hidden="true" />

    <header className="vl-prelaunch-plans-head">
      <a className="vl-prelaunch-plans-back" href="/">← Voltar para o lançamento</a>
      <img className="vl-prelaunch-plans-logo" src="/vitrine-local-header-logo.svg" alt="VitrineLocal" />
      <span className="vl-prelaunch-plans-kicker">PLANOS PARA EMPRESAS</span>
      <h1 id="vl-prelaunch-plans-title">Escolha o plano ideal para o seu negócio</h1>
      <p>Conheça as opções que estarão disponíveis para as empresas no lançamento da VitrineLocal.</p>
    </header>

    <section className="vl-prelaunch-plan-grid" aria-label="Planos VitrineLocal">
      {loading && <p className="vl-prelaunch-plans-loading">Carregando planos…</p>}
      {!loading && plans.length === 0 && <p className="vl-prelaunch-plans-loading">Os planos estão sendo atualizados. Fale com a gente pelo e-mail contato@vitrinelocal.net.</p>}
      {plans.map(plan => <article key={plan.code} className={`vl-prelaunch-plan-card vl-prelaunch-plan-card-${plan.code}`}>
        <span className="vl-prelaunch-plan-label">{plan.label}</span>
        <h2>{plan.name}</h2>
        <p className="vl-prelaunch-plan-description">{plan.description}</p>
        <div className="vl-prelaunch-plan-price"><strong>{plan.price}</strong><span>/mês</span></div>
        <ul>
          {plan.features.map(feature => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}
        </ul>
        {plan.code === 'free'
          ? <a className="vl-prelaunch-plan-action secondary" href="/usuario/cadastro">Cadastrar empresa</a>
          : <a className="vl-prelaunch-plan-action" href={`mailto:contato@vitrinelocal.net?subject=Interesse%20no%20plano%20${encodeURIComponent(plan.name)}`}>Tenho interesse</a>}
      </article>)}
    </section>

    <section className="vl-prelaunch-plans-note">
      <strong>Pré-lançamento</strong>
      <p>Os planos e valores acima são apresentados para você conhecer a proposta comercial. A contratação será liberada junto com o lançamento oficial.</p>
    </section>

    <footer className="vl-prelaunch-plans-footer">
      <a href="https://www.instagram.com/vitrinelocaal/" target="_blank" rel="noreferrer">@vitrinelocaal</a>
      <span>•</span>
      <a href="mailto:contato@vitrinelocal.net">contato@vitrinelocal.net</a>
    </footer>
  </main>
}
