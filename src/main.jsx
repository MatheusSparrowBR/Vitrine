import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

const fallbackCategories = [
  ['Restaurantes', '🍽️'], ['Lojas', '🛍️'], ['Serviços', '🧰'], ['Saúde', '🩺'],
  ['Beleza', '✨'], ['Turismo', '📍'], ['Automóveis', '🚗'], ['Imóveis', '🏠'], ['Pets', '🐾'], ['Outros', '✦']
]

function App() {
  const [session, setSession] = useState(null)
  const [city, setCity] = useState(null)
  const [categories, setCategories] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [posts, setPosts] = useState([])
  const [ads, setAds] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home')
  const [authOpen, setAuthOpen] = useState(false)
  const [businessOpen, setBusinessOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadDirectory()
  }, [])

  async function loadDirectory() {
    setLoading(true)
    if (!supabase) {
      setCity({ id: 'demo', name: 'Laguna', state: 'SC' })
      setCategories(fallbackCategories.map(([name, icon], i) => ({ id: String(i), name, icon })))
      setLoading(false)
      return
    }
    const [citiesRes, categoriesRes, businessesRes, postsRes, adsRes] = await Promise.all([
      supabase.from('cities').select('*').eq('slug', 'laguna').maybeSingle(),
      supabase.from('categories').select('*').eq('active', true).order('sort_order'),
      supabase.from('businesses').select('*, categories(name,slug), cities(name,state)').eq('status', 'active').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(24),
      supabase.from('posts').select('*, businesses(name,slug)').eq('status', 'published').order('published_at', { ascending: false }).limit(8),
      supabase.from('advertisements').select('*, businesses(name,slug)').eq('active', true).order('created_at', { ascending: false }).limit(3),
    ])
    if (citiesRes.data) setCity(citiesRes.data)
    if (categoriesRes.data?.length) setCategories(categoriesRes.data)
    if (businessesRes.data) setBusinesses(businessesRes.data)
    if (postsRes.data) setPosts(postsRes.data)
    if (adsRes.data) setAds(adsRes.data)
    setLoading(false)
  }

  const filteredBusinesses = useMemo(() => {
    const term = query.trim().toLowerCase()
    return businesses.filter((business) => {
      const matchesQuery = !term || [business.name, business.description, business.neighborhood, business.address]
        .filter(Boolean).some((value) => value.toLowerCase().includes(term))
      const matchesCategory = !category || business.categories?.slug === category
      return matchesQuery && matchesCategory
    })
  }, [businesses, query, category])

  function go(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setToast('Você saiu da conta.')
  }

  const featured = filteredBusinesses.filter((item) => item.featured).slice(0, 4)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container nav-row">
          <button className="brand" onClick={() => go('home')} aria-label="VitrineLocal">
            <span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span>
          </button>
          <div className="location-chip">📍 {city?.name || 'Laguna'} - {city?.state || 'SC'}</div>
          <nav className="nav-actions">
            <button className="ghost-btn" onClick={() => go('empresas')}>Explorar</button>
            <button className="ghost-btn" onClick={() => go('promocoes')}>Promoções</button>
            <button className="outline-btn" onClick={() => session ? setBusinessOpen(true) : setAuthOpen(true)}>Cadastrar empresa</button>
            {session ? <button className="avatar-btn" onClick={() => go('painel')}>Minha conta</button> : <button className="primary-btn small" onClick={() => setAuthOpen(true)}>Entrar</button>}
          </nav>
        </div>
      </header>

      <main>
        {view === 'home' && <Home />}
        {view === 'empresas' && <BusinessesPage />}
        {view === 'promocoes' && <PromotionsPage />}
        {view === 'painel' && <DashboardPage />}
        {view === 'empresa' && <BusinessPage />}
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div><div className="footer-brand">VitrineLocal</div><p>A vitrine digital que conecta moradores e comércio local.</p></div>
          <div><strong>Para moradores</strong><span>Encontrar empresas</span><span>Ver promoções</span><span>Descobrir a cidade</span></div>
          <div><strong>Para empresas</strong><span>Cadastre seu negócio</span><span>Divulgue ofertas</span><span>Veja seus resultados</span></div>
          <div><strong>Começando por</strong><span>Laguna - SC</span><span className="muted">Arquitetura pronta para novas cidades</span></div>
        </div>
      </footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={() => { setAuthOpen(false); setToast('Conta conectada com sucesso.'); }} />}
      {businessOpen && <BusinessModal session={session} city={city} categories={categories} onClose={() => setBusinessOpen(false)} onSaved={() => { setBusinessOpen(false); loadDirectory(); setToast('Empresa enviada para análise.'); }} />}
      {toast && <button className="toast" onClick={() => setToast('')}>{toast} <span>×</span></button>}
      {!supabase && <div className="dev-banner">Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para ativar o backend.</div>}
    </div>
  )

  function Home() {
    return <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">A cidade na palma da mão</div>
            <h1>Descubra o que <span>Laguna</span> tem de melhor.</h1>
            <p>Encontre empresas, serviços, promoções, eventos e novidades perto de você.</p>
            <div className="searchbox">
              <span>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="O que você procura hoje?" />
              <button onClick={() => go('empresas')}>Buscar</button>
            </div>
            <div className="hero-trust"><span>●</span> Começando em Laguna, expandindo para outras cidades.</div>
          </div>
          <div className="hero-card">
            <div className="mini-header"><span>🔥 Em alta hoje</span><span>Laguna</span></div>
            <div className="pulse-row"><div className="pulse-icon">📣</div><div><strong>Promoções locais</strong><p>Ofertas descobertas pela comunidade</p></div></div>
            <div className="pulse-row"><div className="pulse-icon">🏪</div><div><strong>{businesses.length} empresas no catálogo</strong><p>Cadastre a sua empresa gratuitamente</p></div></div>
            <button className="hero-card-btn" onClick={() => session ? setBusinessOpen(true) : setAuthOpen(true)}>Quero colocar minha empresa →</button>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head"><div><span className="section-kicker">Explore</span><h2>Encontre por categoria</h2></div><button className="link-btn" onClick={() => go('empresas')}>Ver todas →</button></div>
        <div className="category-grid">{(categories.length ? categories : fallbackCategories.map(([name, icon], i) => ({ id: i, name, icon }))).map((item) => <button className="category-card" key={item.id} onClick={() => { setCategory(item.slug || item.name.toLowerCase()); go('empresas') }}><span className="category-icon">{item.icon || '✦'}</span><strong>{item.name}</strong><span>Explorar</span></button>)}</div>
      </section>

      {featured.length > 0 && <section className="section soft-section"><div className="container"><div className="section-head"><div><span className="section-kicker">Destaques</span><h2>Empresas em evidência</h2></div><button className="link-btn" onClick={() => go('empresas')}>Explorar negócios →</button></div><BusinessGrid items={featured} /></div></section>}

      <section className="container section">
        <div className="section-head"><div><span className="section-kicker">Conteúdo local</span><h2>O que está acontecendo?</h2></div></div>
        <div className="content-grid">
          <div className="feed-list">{posts.length ? posts.map((post) => <article className="feed-card" key={post.id}><div className="feed-tag">{post.type === 'promotion' ? 'PROMOÇÃO' : post.type === 'event' ? 'EVENTO' : 'LAGUNA'}</div><h3>{post.title}</h3><p>{post.content || 'Confira esta novidade da cidade.'}</p><div className="feed-meta">{post.businesses?.name || 'VitrineLocal'} · {post.published_at ? new Date(post.published_at).toLocaleDateString('pt-BR') : 'agora'}</div></article>) : <EmptyFeed />}</div>
          <aside className="side-card"><div className="side-card-title">📢 Divulgue sua empresa</div><h3>Transforme uma oferta em conteúdo.</h3><p>Crie sua presença na VitrineLocal e prepare-se para alcançar a audiência da cidade.</p><button className="primary-btn full" onClick={() => session ? setBusinessOpen(true) : setAuthOpen(true)}>Começar gratuitamente</button></aside>
        </div>
      </section>

      {ads.length > 0 && <section className="container section"><div className="section-head"><div><span className="section-kicker">Patrocinado</span><h2>Negócios em destaque</h2></div></div><div className="ads-grid">{ads.map((ad) => <a className="ad-card" href={ad.target_url || '#'} key={ad.id}><div className="ad-label">PATROCINADO</div><h3>{ad.title}</h3><p>{ad.description}</p><span>Conhecer →</span></a>)}</div></section>}
    </>
  }

  function BusinessesPage() {
    return <section className="container page-section"><div className="page-title"><span className="section-kicker">Catálogo local</span><h1>Empresas em {city?.name || 'Laguna'}</h1><p>Encontre negócios e serviços da cidade.</p></div><div className="toolbar"><div className="searchbox compact"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar empresa, serviço ou bairro" /></div><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas as categorias</option>{categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></div><BusinessGrid items={filteredBusinesses} emptyMessage="Ainda não há empresas publicadas nesta cidade. Seja a primeira!" /><button className="floating-add" onClick={() => session ? setBusinessOpen(true) : setAuthOpen(true)}>＋ Cadastrar empresa</button></section>
  }

  function PromotionsPage() {
    const promos = businesses.filter((business) => false)
    return <section className="container page-section"><div className="page-title"><span className="section-kicker">Ofertas</span><h1>Promoções da cidade</h1><p>Ofertas publicadas por empresas locais aparecem aqui.</p></div><div className="empty-state"><div className="empty-icon">🔥</div><h3>Estamos preparando esta vitrine.</h3><p>O cadastro de empresas já está funcionando. Assim que as primeiras promoções forem aprovadas, elas aparecerão nesta área.</p><button className="primary-btn" onClick={() => session ? setBusinessOpen(true) : setAuthOpen(true)}>Cadastrar empresa</button></div></section>
  }

  function DashboardPage() {
    return <section className="container page-section"><div className="dashboard-top"><div><span className="section-kicker">Área da empresa</span><h1>Minha conta</h1><p>{session?.user?.email || 'Visitante'}</p></div><button className="outline-btn" onClick={logout}>Sair</button></div><div className="stats-grid"><div><span>Empresas</span><strong>0</strong><small>aguardando seu primeiro cadastro</small></div><div><span>Visualizações</span><strong>0</strong><small>o painel será preenchido com dados reais</small></div><div><span>Cliques no WhatsApp</span><strong>0</strong><small>rastreamento preparado</small></div><div><span>Plano</span><strong>Grátis</strong><small>comece sem custo</small></div></div><div className="dashboard-card"><div><span className="section-kicker">Próximo passo</span><h2>Coloque sua empresa na VitrineLocal</h2><p>Cadastre os dados básicos agora. Depois vamos adicionar fotos, produtos, promoções, IA e métricas.</p></div><button className="primary-btn" onClick={() => setBusinessOpen(true)}>Cadastrar empresa</button></div></section>
  }

  function BusinessPage() { return <section className="container page-section"><div className="empty-state"><div className="empty-icon">🏪</div><h3>Perfil de empresa</h3><p>O perfil público individual será ativado nesta próxima etapa do MVP.</p><button className="primary-btn" onClick={() => go('empresas')}>Voltar para empresas</button></div></section> }
}

function BusinessGrid({ items, emptyMessage = 'Nenhuma empresa encontrada.' }) {
  if (!items?.length) return <div className="empty-state inline"><div className="empty-icon">🏪</div><h3>{emptyMessage}</h3><p>Os primeiros negócios aprovados aparecerão aqui.</p></div>
  return <div className="business-grid">{items.map((item) => <article className="business-card" key={item.id}><div className="business-cover">{item.cover_url ? <img src={item.cover_url} alt="" /> : <div className="cover-placeholder">{item.name.slice(0,1).toUpperCase()}</div>}{item.verified && <span className="verified">✓ Verificada</span>}</div><div className="business-body"><div className="business-category">{item.categories?.name || 'Empresa local'}</div><h3>{item.name}</h3><p>{item.short_description || item.description || 'Conheça este negócio da cidade.'}</p><div className="business-footer"><span>📍 {item.neighborhood || 'Laguna'}</span>{item.whatsapp && <a href={`https://wa.me/${item.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">WhatsApp →</a>}</div></div></article>)}</div>
}

function EmptyFeed() { return <div className="empty-state inline"><div className="empty-icon">📰</div><h3>O feed local está começando.</h3><p>Assim que os primeiros conteúdos forem publicados, as novidades da cidade aparecerão aqui.</p></div> }

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault(); setError('')
    if (!supabase) return setError('Configure as variáveis do Supabase no ambiente do projeto.')
    setBusy(true)
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (result.error) setError(result.error.message)
    else onSuccess()
    setBusy(false)
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="modal-kicker">VitrineLocal</div><h2>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h2><p>{mode === 'login' ? 'Gerencie sua presença e divulgue sua empresa.' : 'Comece grátis e coloque sua empresa na vitrine da cidade.'}</p><form onSubmit={submit}>{mode === 'signup' && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" required /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" minLength={6} required />{error && <div className="form-error">{error}</div>}<button className="primary-btn full" disabled={busy}>{busy ? 'Conectando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button></form><button className="switch-mode" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button></div></div>
}

function BusinessModal({ session, city, categories, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', short_description: '', description: '', category_id: categories[0]?.id || '', whatsapp: '', instagram_url: '', address: '', neighborhood: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(e) {
    e.preventDefault(); setError('')
    if (!supabase || !session?.user) return setError('Você precisa estar conectado para cadastrar uma empresa.')
    setBusy(true)
    const { error: insertError } = await supabase.from('businesses').insert({ ...form, owner_id: session.user.id, city_id: city.id, slug: `${slugify(form.name)}-${Math.random().toString(36).slice(2, 7)}` })
    if (insertError) setError(insertError.message)
    else onSaved()
    setBusy(false)
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal wide" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="modal-kicker">Nova empresa · {city?.name || 'Laguna'}</div><h2>Cadastre seu negócio</h2><p>O cadastro entra em análise antes de aparecer publicamente.</p><form className="form-grid" onSubmit={submit}><input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nome da empresa" required /><select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} required>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><input value={form.short_description} onChange={(e) => update('short_description', e.target.value)} placeholder="Descrição curta" /><input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="WhatsApp com DDD" /><input value={form.instagram_url} onChange={(e) => update('instagram_url', e.target.value)} placeholder="Link do Instagram" /><input value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} placeholder="Bairro" /><input className="span-2" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Endereço" /><textarea className="span-2" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Conte um pouco sobre a empresa" rows="4" />{error && <div className="form-error span-2">{error}</div>}<div className="form-actions span-2"><button type="button" className="outline-btn" onClick={onClose}>Cancelar</button><button className="primary-btn" disabled={busy}>{busy ? 'Enviando...' : 'Enviar para análise'}</button></div></form></div></div>
}

function slugify(value) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }

createRoot(document.getElementById('root')).render(<App />)
