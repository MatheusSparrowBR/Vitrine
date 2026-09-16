import React from 'react'

const plans=[
  {
    key:'free',
    label:'COMECE AQUI',
    name:'Grátis',
    description:'Presença básica e recursos essenciais para começar no VitrineLocal.',
    price:'R$ 0,00',
    suffix:'/mês',
    features:['Até 5 fotos/mídias','Até 10 produtos/serviços','Até 1 promoção']
  },
  {
    key:'pro',
    label:'RECOMENDADO',
    name:'Pro',
    description:'Mais destaque e recursos para crescer com sua empresa.',
    price:'R$ 29,90',
    suffix:'/mês',
    features:['Até 30 fotos/mídias','Até 50 produtos/serviços','Até 5 promoções','Analytics comercial','Destaque nas buscas','Selo de verificação']
  },
  {
    key:'premium',
    label:'MAIS COMPLETO',
    name:'Premium',
    description:'Máxima presença, reputação avançada e recursos exclusivos, incluindo resposta às avaliações e estatísticas avançadas.',
    price:'R$ 59,90',
    suffix:'/mês',
    features:['Até 100 fotos/mídias','Até 200 produtos/serviços','Até 20 promoções','Analytics comercial','Destaque nas buscas','Selo de verificação','Estatísticas avançadas','Presença no Instagram da cidade','Reputação + respostas às avaliações']
  }
]

export default function PrelaunchPlansPage(){
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
      {plans.map(plan=><article key={plan.key} className={`vl-prelaunch-plan-card vl-prelaunch-plan-card-${plan.key}`}>
        <span className="vl-prelaunch-plan-label">{plan.label}</span>
        <h2>{plan.name}</h2>
        <p className="vl-prelaunch-plan-description">{plan.description}</p>
        <div className="vl-prelaunch-plan-price"><strong>{plan.price}</strong><span>{plan.suffix}</span></div>
        <ul>
          {plan.features.map(feature=><li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}
        </ul>
        {plan.key==='free'
          ? <a className="vl-prelaunch-plan-action secondary" href="/usuario/cadastro">Cadastrar empresa</a>
          : <a className="vl-prelaunch-plan-action" href="mailto:contato@vitrinelocal.net?subject=Interesse%20no%20plano%20${encodeURIComponent(plan.name)}">Tenho interesse</a>}
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
