import React,{useEffect} from 'react'
import './home-test.css'

const categories=[
 {name:'Restaurantes',icon:'🍴',count:'18 opções'},
 {name:'Lojas',icon:'🛍️',count:'24 opções'},
 {name:'Serviços',icon:'🔧',count:'17 opções'},
 {name:'Saúde',icon:'❤',count:'11 opções'},
 {name:'Turismo',icon:'📍',count:'9 opções'},
 {name:'Beleza',icon:'✦',count:'12 opções'},
]

const businesses=[
 {name:'Bistrô Laguna',category:'Restaurante',rating:'4,9',meta:'Centro · Laguna',image:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=82'},
 {name:'Medeiros Materiais',category:'Construção',rating:'4,8',meta:'Progresso · Laguna',image:'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=1200&q=82'},
 {name:'Pizzaria da Lagoa',category:'Pizzaria',rating:'4,9',meta:'Mar Grosso · Laguna',image:'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1200&q=82'},
]

const promotions=[
 {title:'Ofertas e novidades perto de você',copy:'Descubra promoções publicadas por empresas da sua cidade.',label:'PROMOÇÕES',action:'Explorar ofertas'},
 {title:'O que acontece em Laguna',copy:'Veja eventos, experiências e atividades que movimentam a cidade.',label:'AGENDA',action:'Ver eventos'},
]

export default function HomeTestPage(){
 useEffect(()=>{
  const previousTitle=document.title
  const canonical=document.querySelector('link[rel="canonical"]')
  const previousCanonical=canonical?.getAttribute('href')||null
  document.title='Home Lab | VitrineLocal'
  if(canonical)canonical.setAttribute('href',window.location.origin+'/home-teste')
  let robots=document.querySelector('meta[name="robots"]')
  const created=!robots
  if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots)}
  const previousRobots=robots.getAttribute('content')
  robots.setAttribute('content','noindex,nofollow,noarchive')
  return()=>{
   document.title=previousTitle
   if(canonical){
    if(previousCanonical)canonical.setAttribute('href',previousCanonical)
    else canonical.removeAttribute('href')
   }
   if(robots){
    if(created)robots.remove()
    else if(previousRobots)robots.setAttribute('content',previousRobots)
   }
  }
 },[])

 return <div className="home-lab-page">
  <div className="home-lab-banner">
   <div>
    <span>LABORATÓRIO DE UX</span>
    <strong>Home de teste</strong>
    <p>Esta página é independente da Home oficial. Tudo aqui pode ser alterado sem mexer em <code>/</code>.</p>
   </div>
   <a href="/laguna">← Voltar para a Home oficial</a>
  </div>

  <header className="home-lab-header">
   <a href="/laguna" className="home-lab-logo" aria-label="VitrineLocal">
    <span>V</span><strong>Vitrine<span>Local</span></strong>
   </a>
   <div className="home-lab-city">📍 Laguna <span>⌄</span></div>
   <nav>
    <a href="#categorias">Categorias</a>
    <a href="#destaques">Destaques</a>
    <a href="#ofertas">Ofertas</a>
    <a href="#agenda">Agenda</a>
   </nav>
   <a href="/usuario/login" className="home-lab-account">Entrar</a>
  </header>

  <main>
   <section className="home-lab-hero">
    <div className="home-lab-container home-lab-hero-grid">
     <div className="home-lab-hero-copy">
      <span className="lab-eyebrow">A CIDADE NA PALMA DA MÃO</span>
      <h1>Descubra o que <em>Laguna</em> tem de melhor.</h1>
      <p>Empresas, serviços, promoções e eventos locais em um só lugar.</p>
      <div className="home-lab-search">
       <span>⌕</span>
       <input aria-label="Busca de teste" placeholder="O que você está procurando?" />
       <button>Buscar</button>
      </div>
      <div className="home-lab-quick">
       <span>Buscas rápidas</span>
       <a href="#destaques">Restaurantes</a>
       <a href="#destaques">Lojas</a>
       <a href="#agenda">Eventos</a>
      </div>
     </div>
     <div className="home-lab-hero-panel">
      <div className="lab-panel-top"><span>AGORA EM LAGUNA</span><b>12°C</b></div>
      <div className="lab-weather">☀️ <strong>Céu parcialmente nublado</strong></div>
      <div className="lab-stat-row"><span>Empresas cadastradas</span><strong>15+</strong></div>
      <div className="lab-stat-row"><span>Promoções ativas</span><strong>8</strong></div>
      <a href="#categorias" className="lab-panel-button">Explorar a cidade →</a>
     </div>
    </div>
   </section>

   <section id="categorias" className="home-lab-section">
    <div className="home-lab-container">
     <div className="lab-section-head"><div><span className="lab-eyebrow">EXPLORE</span><h2>Encontre por categoria</h2><p>Escolha um caminho e descubra negócios locais.</p></div><a href="#destaques">Ver todas →</a></div>
     <div className="home-lab-category-grid">
      {categories.map(category=><a href="#destaques" className="home-lab-category" key={category.name}><span>{category.icon}</span><strong>{category.name}</strong><small>{category.count}</small></a>)}
     </div>
    </div>
   </section>

   <section id="destaques" className="home-lab-section lab-muted">
    <div className="home-lab-container">
     <div className="lab-section-head"><div><span className="lab-eyebrow">EM DESTAQUE</span><h2>Negócios que merecem uma visita</h2><p>Perfis reais para testar cards, fotos e hierarquia de informação.</p></div><a href="#destaques">Explorar empresas →</a></div>
     <div className="home-lab-business-grid">
      {businesses.map(item=><article className="home-lab-business" key={item.name}><div className="business-image" style={{backgroundImage:`url("${item.image}")`}}></div><div className="business-body"><span>{item.category}</span><h3>{item.name}</h3><p>{item.meta}</p><strong>★ {item.rating}</strong><a href="#destaques">Ver empresa →</a></div></article>)}
     </div>
    </div>
   </section>

   <section id="ofertas" className="home-lab-section">
    <div className="home-lab-container">
     <div className="lab-section-head"><div><span className="lab-eyebrow">O QUE ESTÁ ACONTECENDO</span><h2>Descubra mais da cidade</h2><p>Blocos independentes para testar diferentes abordagens de conteúdo.</p></div></div>
     <div className="home-lab-promo-grid">
      {promotions.map(item=><article className="home-lab-promo" key={item.label}><span>{item.label}</span><h3>{item.title}</h3><p>{item.copy}</p><a href="#agenda">{item.action} →</a></article>)}
     </div>
    </div>
   </section>

   <section id="agenda" className="home-lab-section lab-dark">
    <div className="home-lab-container home-lab-agenda">
     <div><span className="lab-eyebrow">AGENDA LOCAL</span><h2>Seu próximo lugar pode estar aqui.</h2><p>Teste chamadas, calendário, eventos e outras experiências neste bloco.</p></div>
     <a href="#categorias" className="lab-dark-button">Testar outra seção →</a>
    </div>
   </section>
  </main>

  <footer className="home-lab-footer">
   <div className="home-lab-container"><strong>VitrineLocal Home Lab</strong><span>Ambiente experimental · não indexado · não altera a Home oficial</span></div>
  </footer>
 </div>
}
