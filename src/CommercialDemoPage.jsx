import React from 'react'

const products = [
  { name: 'Burger Laguna', category: 'Mais pedido', price: 'R$ 34,90', icon: '🍔', note: 'Blend artesanal, queijo e molho da casa' },
  { name: 'Risoto do Mar', category: 'Especial da casa', price: 'R$ 46,90', icon: '🦐', note: 'Camarão, limão siciliano e parmesão' },
  { name: 'Drink Sunset', category: 'Bebida', price: 'R$ 24,90', icon: '🍹', note: 'Frutas cítricas e toque tropical' },
  { name: 'Cheesecake Local', category: 'Sobremesa', price: 'R$ 19,90', icon: '🍰', note: 'Cheesecake artesanal com frutas vermelhas' },
]

const services = [
  { name: 'Reservas para grupos', note: 'Mesas para aniversários e encontros' },
  { name: 'Eventos corporativos', note: 'Estrutura personalizada para empresas' },
  { name: 'Delivery', note: 'Pedidos e atendimento pelos canais da casa' },
]

const reviews = [
  { author: 'Mariana A.', rating: 5, text: 'Ambiente lindo, atendimento atencioso e comida excelente.' },
  { author: 'Rafael M.', rating: 5, text: 'A promoção apareceu para mim e foi uma ótima descoberta.' },
  { author: 'Camila S.', rating: 4, text: 'Experiência muito boa. Já indiquei para amigos.' },
]

const accountSections = [
  { id: 'overview', label: 'Visão geral', icon: '⌂' },
  { id: 'business', label: 'Meu negócio', icon: '▣' },
  { id: 'catalog', label: 'Produtos e serviços', icon: '◈' },
  { id: 'marketing', label: 'Promoções e eventos', icon: '✦' },
  { id: 'reviews', label: 'Avaliações', icon: '★' },
  { id: 'advertising', label: 'Publicidade Premium', icon: '◆' },
]

function Stars({ count = 5 }) {
  return <span className="vld-stars" aria-label={`${count} estrelas`}>{'★'.repeat(count)}</span>
}

function Metric({ value, label, detail }) {
  return (
    <div className="vld-metric">
      <strong>{value}</strong>
      <span>{label}</span>
      {detail && <small>{detail}</small>}
    </div>
  )
}

function DemoHeader({ view, setView }) {
  return (
    <header className="vld-demo-header">
      <div className="vld-demo-header-inner">
        <a className="vld-demo-brand" href="/demo" aria-label="VitrineLocal Demo">
          <span className="vld-demo-brand-mark">VL</span>
          <span><strong>VitrineLocal</strong><small>DEMO COMERCIAL</small></span>
        </a>
        <nav className="vld-demo-view-switch" aria-label="Modo da demonstração">
          <button className={view === 'public' ? 'active' : ''} onClick={() => setView('public')}>Experiência do consumidor</button>
          <button className={view === 'account' ? 'active' : ''} onClick={() => setView('account')}>Minha Conta Premium</button>
        </nav>
        <a className="vld-demo-exit" href="/laguna">Voltar ao VitrineLocal</a>
      </div>
    </header>
  )
}

function DemoPublicView({ setView }) {
  return (
    <main className="vld-demo-public">
      <section className="vld-demo-hero">
        <div className="vld-demo-hero-copy">
          <div className="vld-demo-kicker"><span>●</span> Empresa demonstrativa · Premium</div>
          <h1>Bistrô Laguna</h1>
          <p className="vld-demo-hero-subtitle">Gastronomia artesanal, experiências locais e aquele lugar que você quer voltar.</p>
          <div className="vld-demo-rating-row"><Stars/> <strong>4,9</strong> <span>· 127 avaliações</span></div>
          <div className="vld-demo-pills"><span>🍴 Restaurante</span><span>📍 Laguna · SC</span><span>Aberto hoje</span></div>
          <div className="vld-demo-hero-actions"><button className="vld-demo-primary">Ver promoção</button><button className="vld-demo-secondary">Entrar em contato</button></div>
          <div className="vld-demo-hero-links"><span>Instagram</span><span>WhatsApp</span><span>Como chegar</span></div>
        </div>
        <div className="vld-demo-hero-art" aria-label="Imagem demonstrativa do Bistrô Laguna">
          <div className="vld-demo-glow vld-demo-glow-one"/><div className="vld-demo-glow vld-demo-glow-two"/>
          <div className="vld-demo-restaurant-card"><span>BL</span><strong>Bistrô<br/>Laguna</strong><small>Sabores locais · desde 2018</small></div>
          <div className="vld-demo-floating-card"><strong>Hoje</strong><span>18:30 — 23:30</span></div>
        </div>
      </section>

      <section className="vld-demo-section vld-demo-premium-banner">
        <div><span className="vld-demo-mini-label">OFERTA EM DESTAQUE</span><h2>Festival de Sabores</h2><p>20% OFF de segunda a quinta em pratos selecionados.</p></div>
        <div className="vld-demo-banner-side"><span>Ative sua vontade de experimentar.</span><button>Quero conhecer</button></div>
      </section>

      <section className="vld-demo-section">
        <div className="vld-demo-section-heading"><div><span className="vld-demo-mini-label">CATÁLOGO</span><h2>Produtos que vendem a experiência</h2></div><span>Ver catálogo completo →</span></div>
        <div className="vld-demo-product-grid">{products.map(item => <article className="vld-demo-product" key={item.name}><div className="vld-demo-product-art"><span>{item.icon}</span><small>{item.category}</small></div><div className="vld-demo-product-body"><h3>{item.name}</h3><p>{item.note}</p><strong>{item.price}</strong></div></article>)}</div>
      </section>

      <section className="vld-demo-section vld-demo-two-col">
        <div className="vld-demo-panel">
          <div className="vld-demo-section-heading"><div><span className="vld-demo-mini-label">SERVIÇOS</span><h2>Mais do que um produto</h2></div></div>
          <div className="vld-demo-service-list">{services.map(item => <div className="vld-demo-service" key={item.name}><span>✓</span><div><strong>{item.name}</strong><p>{item.note}</p></div></div>)}</div>
        </div>
        <div className="vld-demo-panel vld-demo-event-panel"><span className="vld-demo-mini-label">EVENTO</span><div className="vld-demo-event-date"><strong>24</strong><span>SET</span></div><h2>Noite de Música ao Vivo</h2><p>Sexta-feira · 20h · entrada gratuita</p><button>Ver detalhes do evento →</button></div>
      </section>

      <section className="vld-demo-section vld-demo-review-section">
        <div className="vld-demo-section-heading"><div><span className="vld-demo-mini-label">REPUTAÇÃO</span><h2>O cliente também fala da sua marca</h2></div><div className="vld-demo-review-summary"><strong>4,9</strong><Stars/><span>127 avaliações</span></div></div>
        <div className="vld-demo-review-grid">{reviews.map(review => <article className="vld-demo-review" key={review.author}><div><strong>{review.author}</strong><Stars count={review.rating}/></div><p>“{review.text}”</p><span>Cliente verificado</span></article>)}</div>
      </section>

      <section className="vld-demo-section vld-demo-business-info">
        <div><span className="vld-demo-mini-label">INFORMAÇÕES DA EMPRESA</span><h2>Horários, contato e presença local</h2><p>Uma apresentação completa facilita a decisão de compra e reduz a distância entre descobrir e entrar em contato.</p></div>
        <div className="vld-demo-info-cards"><div><span>🕒</span><strong>Horários</strong><p>Seg–Qui 18:30–23:30<br/>Sex–Sáb 18:30–00:00</p></div><div><span>📍</span><strong>Localização</strong><p>Centro Histórico<br/>Laguna · Santa Catarina</p></div><div><span>💬</span><strong>Contato</strong><p>WhatsApp e Instagram<br/>Resposta em horário comercial</p></div></div>
      </section>

      <section className="vld-demo-cta"><div><span className="vld-demo-mini-label">VITRINELOCAL PARA EMPRESAS</span><h2>Essa pode ser a experiência da sua empresa.</h2><p>Agora veja o que uma empresa Premium consegue administrar dentro da plataforma.</p></div><button onClick={() => setView('account')}>Abrir Minha Conta Demo →</button></section>
    </main>
  )
}

function OverviewAccount({ setActive }) {
  return <>
    <div className="vld-account-welcome"><div><span className="vld-demo-mini-label">CONTA PREMIUM</span><h2>Olá, Bistrô Laguna 👋</h2><p>Veja como sua empresa está sendo apresentada e acompanhe sua presença no VitrineLocal.</p></div><button className="vld-demo-primary">Editar empresa</button></div>
    <div className="vld-account-metrics"><Metric value="2.843" label="visualizações" detail="últimos 30 dias"/><Metric value="286" label="interações" detail="+18% no período"/><Metric value="4,9" label="avaliação média" detail="127 avaliações"/><Metric value="17" label="ações de contato" detail="WhatsApp + Instagram"/></div>
    <div className="vld-account-grid">
      <section className="vld-account-card vld-account-performance"><div className="vld-account-card-heading"><div><span className="vld-demo-mini-label">DESEMPENHO</span><h3>Sua presença está ativa</h3></div><span className="vld-status-pill">● Premium ativo</span></div><div className="vld-sparkline"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="vld-chart-labels"><span>01 set</span><span>07</span><span>14</span><span>21</span><span>30 set</span></div></section>
      <section className="vld-account-card"><div className="vld-account-card-heading"><div><span className="vld-demo-mini-label">CHECKLIST</span><h3>Perfil completo</h3></div><strong>92%</strong></div><div className="vld-progress"><span style={{width:'92%'}}/></div><ul className="vld-checklist"><li>✓ Informações principais</li><li>✓ Horários</li><li>✓ Produtos e serviços</li><li>✓ Fotos e redes sociais</li><li>○ Adicionar mais fotos</li></ul></section>
    </div>
    <div className="vld-account-quick-actions">{[['catalog','◈','Atualizar catálogo','Produtos e serviços'],['marketing','✦','Criar promoção','Atraia novas visitas'],['reviews','★','Responder avaliações','Fortaleça sua reputação'],['advertising','◆','Impulsionar marca','Publicidade Premium']].map(([id,icon,title,note]) => <button key={id} onClick={() => setActive(id)}><span>{icon}</span><strong>{title}</strong><small>{note}</small><b>→</b></button>)}</div>
  </>
}

function AccountPanel({ active, setActive }) {
  const data = {
    business: { label:'Meu negócio', title:'Sua vitrine, sempre atualizada', text:'Edite apresentação, horários, contatos, fotos e posicionamento da empresa sem depender de terceiros.', rows:['Descrição da empresa','Horário de funcionamento','Endereço e canais de contato','Fotos, capa e redes sociais'] },
    catalog: { label:'Produtos e serviços', title:'Mostre o que sua empresa vende', text:'Cadastre produtos e serviços com nome, descrição, preço, imagem e informações relevantes.', rows:['Produtos em destaque','Serviços oferecidos','Categorias e preços','Itens disponíveis para descoberta'] },
    marketing: { label:'Promoções e eventos', title:'Crie motivos para o cliente voltar', text:'Divulgue ofertas e eventos com período, chamada e informações que ajudam a gerar interesse.', rows:['Promoção ativa: Festival de Sabores','Próximo evento: Noite de Música ao Vivo','Calendário de campanhas','Atalhos para divulgação'] },
    reviews: { label:'Avaliações', title:'Acompanhe o que os clientes dizem', text:'Monitore avaliações, entenda a percepção sobre a empresa e responda diretamente quando necessário.', rows:['4,9 de média','127 avaliações','Respostas recentes','Sinais de reputação'] },
    advertising: { label:'Publicidade Premium', title:'Dê mais presença para sua marca', text:'Solicite campanhas e espaços de publicidade para divulgar seu negócio dentro da plataforma.', rows:['Banner Premium ativo','Campanha de destaque local','Solicitação de mídia','Acompanhamento comercial'] },
  }[active]
  return <section className="vld-account-card vld-account-detail"><div className="vld-account-detail-icon">{active === 'business' ? '▣' : active === 'catalog' ? '◈' : active === 'marketing' ? '✦' : active === 'reviews' ? '★' : '◆'}</div><span className="vld-demo-mini-label">{data.label}</span><h2>{data.title}</h2><p>{data.text}</p><div className="vld-detail-row-list">{data.rows.map(row => <div key={row}><span>✓</span>{row}</div>)}</div><button className="vld-demo-primary" onClick={() => setActive('overview')}>Voltar para a visão geral</button></section>
}

function DemoAccountView() {
  const [active, setActive] = React.useState('overview')
  return <main className="vld-demo-account"><section className="vld-account-shell"><aside className="vld-account-sidebar"><div className="vld-account-business"><div className="vld-demo-brand-mark">BL</div><div><strong>Bistrô Laguna</strong><span>Plano Premium</span></div></div><nav aria-label="Navegação da conta demo">{accountSections.map(item => <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => setActive(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="vld-account-sidebar-footer"><span className="vld-status-dot"/> Conta demonstrativa<br/><small>nenhuma ação é enviada ou cobrada</small></div></aside><div className="vld-account-content">{active === 'overview' ? <OverviewAccount setActive={setActive}/> : <AccountPanel active={active} setActive={setActive}/>}</div></section></main>
}

export default function CommercialDemoPage() {
  const [view, setView] = React.useState('public')
  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const requested = query.get('view')
    if (requested === 'account') setView('account')
  }, [])
  return <div className="vld-demo-app"><DemoHeader view={view} setView={setView}/>{view === 'public' ? <DemoPublicView setView={setView}/> : <DemoAccountView/>}<footer className="vld-demo-footer"><span>VitrineLocal · Demo Comercial</span><span>Dados fictícios para apresentação empresarial</span></footer></div>
}
