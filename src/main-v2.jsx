import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import AdminDashboard from './AdminDashboard.jsx'
import AdminTools from './admin-tools.jsx'
import './core.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null
const CITY_STORAGE = 'vitrinelocal:selected-city'
const DEFAULT_CITY = 'laguna'
const COMMUNITY_BUCKET = 'community-submissions'
const BUSINESS_BUCKET = 'business-media'
const PREMIUM_BUCKET = 'premium-banners'
const imageTypes = new Set(['image/jpeg','image/png','image/webp','image/gif'])
const videoTypes = new Set(['video/mp4','video/webm','video/quicktime'])

const fallbackCategories = [
  ['Restaurantes','🍽️'],['Lojas','🛍️'],['Serviços','🧰'],['Saúde','❤️'],['Beleza','✨'],
  ['Turismo','📍'],['Automóveis','🚗'],['Imóveis','🏠'],['Pets','🐾'],['Outros','✦'],
]

const slugify = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
const money = value => value == null || value === '' ? '—' : `R$ ${Number(value).toFixed(2).replace('.',',')}`
const formatDate = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—'
const safe = (value = '') => String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[c])

function parseRoute(pathname = window.location.pathname) {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (!parts.length) return { kind: 'root', citySlug: null, businessSlug: null }
  if (parts[0] === 'admin') return { kind: 'admin', citySlug: null, businessSlug: null }
  if (parts[0] === 'planos') return { kind: 'plans', citySlug: null, businessSlug: null }
  const citySlug = parts[0].toLowerCase()
  if (parts[1] === 'promocoes') return { kind: 'promotions', citySlug, businessSlug: null }
  if (parts[1] === 'empresas') return { kind: 'businesses', citySlug, businessSlug: null }
  if (parts[1] === 'empresa' && parts[2]) return { kind: 'business', citySlug, businessSlug: parts[2] }
  return { kind: 'home', citySlug, businessSlug: null }
}

function App() {
  const [route, setRoute] = useState(() => parseRoute())
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('user')
  const [cities, setCities] = useState([])
  const [city, setCity] = useState(null)
  const [categories, setCategories] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [posts, setPosts] = useState([])
  const [promotions, setPromotions] = useState([])
  const [ads, setAds] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [businessOpen, setBusinessOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [adminToolsOpen, setAdminToolsOpen] = useState(false)
  const [toast, setToast] = useState({message:'',error:false})
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    const onPop = () => setRoute(parseRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let alive = true
    supabase.auth.getSession().then(({data}) => { if(alive) setSession(data.session || null) })
    const { data } = supabase.auth.onAuthStateChange((_event,next) => setSession(next || null))
    return () => { alive = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user?.id) { setRole('user'); setRoleLoading(false); return }
    let alive = true
    setRoleLoading(true)
    supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle().then(({data,error}) => {
      if (!alive) return
      setRole(error ? 'user' : (data?.role || 'user'))
      setRoleLoading(false)
    })
    return () => { alive = false }
  }, [session?.user?.id])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.from('cities').select('id,name,state,slug,country,active').eq('active',true).order('name').then(({data}) => {
      if (!alive) return
      const rows = data || []
      setCities(rows)
      const saved = localStorage.getItem(CITY_STORAGE)
      const preferred = route.citySlug || saved || DEFAULT_CITY
      const active = rows.find(c => c.slug === preferred) || rows.find(c => c.slug === DEFAULT_CITY) || rows[0] || null
      setCity(active)
      if (active) {
        localStorage.setItem(CITY_STORAGE, active.slug)
        if (route.kind === 'root') {
          window.history.replaceState({},'',`/${active.slug}`)
          setRoute({kind:'home',citySlug:active.slug,businessSlug:null})
        }
      }
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!cities.length) return
    const target = route.citySlug || localStorage.getItem(CITY_STORAGE) || DEFAULT_CITY
    const active = cities.find(c => c.slug === target) || cities.find(c => c.slug === DEFAULT_CITY) || cities[0]
    setCity(active || null)
    if (active) localStorage.setItem(CITY_STORAGE, active.slug)
  }, [route.citySlug, cities])

  useEffect(() => {
    if (!supabase || !city?.id || ['admin','plans','root'].includes(route.kind)) return
    let alive = true
    setLoading(true)
    setCategory('')
    const load = async () => {
      const businessPromise = supabase.from('businesses').select('*,categories(name,slug,icon),cities(name,state,slug)').eq('city_id',city.id).eq('status','active').order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(60)
      const [catRes,businessRes,postRes] = await Promise.all([
        supabase.from('categories').select('*').eq('active',true).order('sort_order').order('name'),
        businessPromise,
        supabase.from('posts').select('*,businesses(name,slug)').eq('city_id',city.id).eq('status','published').order('published_at',{ascending:false}).limit(20),
      ])
      if (!alive) return
      setCategories(catRes.data?.length ? catRes.data : fallbackCategories.map(([name,icon],i)=>({id:`fallback-${i}`,name,icon,slug:slugify(name)})))
      const biz = businessRes.data || []
      setBusinesses(biz)
      setPosts(postRes.data || [])
      const ids = biz.map(b => b.id)
      if (ids.length) {
        const { data } = await supabase.from('promotions').select('*,businesses(name,slug)').in('business_id',ids).eq('status','published').order('created_at',{ascending:false}).limit(20)
        if (alive) setPromotions(data || [])
      } else setPromotions([])
      const { data: bannerData } = await supabase.from('advertisements').select('id,title,description,image_url,target_url,priority,starts_at,ends_at').eq('city_id',city.id).eq('placement','home_banner').eq('active',true).order('priority',{ascending:false}).order('created_at',{ascending:false}).limit(10)
      if (alive) {
        const now = Date.now()
        setAds((bannerData || []).filter(a => (!a.starts_at || new Date(a.starts_at).getTime() <= now) && (!a.ends_at || new Date(a.ends_at).getTime() >= now)))
        setLoading(false)
      }
    }
    load().catch(error => { if(alive){setLoading(false); notice(error.message || 'Erro ao carregar a cidade.',true)} })
    return () => { alive = false }
  }, [city?.id, route.kind])

  function notice(message,error=false) {
    setToast({message:String(message || ''),error})
    window.setTimeout(() => setToast({message:'',error:false}), 3500)
  }

  function navigate(kind='home', citySlug=city?.slug || DEFAULT_CITY, businessSlug=null) {
    const base = kind === 'plans' ? '/planos' : kind === 'admin' ? '/admin' : `/${encodeURIComponent(citySlug)}`
    const path = kind === 'businesses' ? `${base}/empresas` : kind === 'promotions' ? `${base}/promocoes` : kind === 'business' ? `${base}/empresa/${encodeURIComponent(businessSlug || '')}` : base
    window.history.pushState({},'',path)
    setRoute(parseRoute(path))
    window.scrollTo({top:0,behavior:'smooth'})
  }

  async function logout() {
    if (!supabase) return
    const {error} = await supabase.auth.signOut()
    if (error) return notice(error.message,true)
    setSession(null); setRole('user'); navigate('home'); notice('Você saiu da conta.')
  }

  const filteredBusinesses = useMemo(() => {
    const term = query.trim().toLowerCase()
    return businesses.filter(b => {
      const haystack = [b.name,b.short_description,b.description,b.neighborhood,b.address,b.categories?.name].filter(Boolean).join(' ').toLowerCase()
      return (!term || haystack.includes(term)) && (!category || b.categories?.slug === category)
    })
  }, [businesses,query,category])

  function openCompany() {
    if (!session) setAuthOpen(true); else setBusinessOpen(true)
  }

  return <div className="app">
    <header className="topbar"><div className="nav">
      <button className="brand" onClick={()=>navigate('home')}><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></button>
      {cities.length > 0 && <select className="city-select" aria-label="Selecionar cidade" value={city?.slug || ''} onChange={e=>navigate('home',e.target.value)}>{cities.map(c=><option value={c.slug} key={c.id}>📍 {c.name} - {c.state}</option>)}</select>}
      <div className="nav-spacer" />
      <nav className="nav-actions">
        <button onClick={()=>navigate('businesses')}>Explorar</button>
        <button onClick={()=>navigate('promotions')}>Promoções</button>
        <button onClick={()=>setCommunityOpen(true)}>Enviar conteúdo</button>
        <button onClick={()=>navigate('plans')}>Planos</button>
        {role === 'admin' && !roleLoading && <button onClick={()=>navigate('admin')}>Admin</button>}
        <button className="outline" onClick={openCompany}>Cadastrar empresa</button>
        {session ? <><button onClick={()=>navigate('account')}>Minha conta</button><button className="logout" onClick={logout}>SAIR DA CONTA</button></> : <button className="primary" onClick={()=>setAuthOpen(true)}>Entrar</button>}
      </nav>
    </div></header>

    {route.kind === 'home' && <Home city={city} categories={categories} businesses={businesses} posts={posts} ads={ads} query={query} setQuery={setQuery} navigate={navigate} openCompany={openCompany} openCommunity={()=>setCommunityOpen(true)} loading={loading} />}
    {route.kind === 'businesses' && <BusinessesPage city={city} categories={categories} items={filteredBusinesses} query={query} setQuery={setQuery} category={category} setCategory={setCategory} navigate={navigate} openCompany={openCompany} loading={loading} />}
    {route.kind === 'promotions' && <PromotionsPage city={city} promotions={promotions} navigate={navigate} />}
    {route.kind === 'business' && <BusinessProfile city={city} slug={route.businessSlug} navigate={navigate} />}
    {route.kind === 'plans' && <PlansPage supabase={supabase} openCompany={openCompany} onBack={()=>navigate('home')} />}
    {route.kind === 'account' && <OwnerDashboard supabase={supabase} session={session} city={city} categories={categories} onBack={()=>navigate('home')} onNotice={notice} />}
    {route.kind === 'admin' && (role === 'admin' ? <><AdminDashboard supabase={supabase} session={session} onBack={()=>navigate('home')} onToast={notice}/><button className="floating-admin-tools" onClick={()=>setAdminToolsOpen(true)}>⚙ Gestão da plataforma</button></> : <AccessDenied onBack={()=>navigate('home')} />)}
    {route.kind === 'root' && <div className="page"><div className="empty">Carregando cidade…</div></div>}

    {authOpen && <AuthModal onClose={()=>setAuthOpen(false)} onSuccess={message=>{setAuthOpen(false);notice(message)}} />}
    {businessOpen && <BusinessCreateModal session={session} city={city} cities={cities} categories={categories} onClose={()=>setBusinessOpen(false)} onSaved={()=>{setBusinessOpen(false);notice('Empresa enviada para análise.')}} />}
    {communityOpen && <CommunityModal session={session} city={city} onClose={()=>setCommunityOpen(false)} onSaved={()=>{setCommunityOpen(false);notice('Conteúdo enviado para moderação.')}} />}
    {adminToolsOpen && <AdminTools supabase={supabase} session={session} onClose={()=>setAdminToolsOpen(false)} onToast={notice} />}
    {toast.message && <button className={`toast ${toast.error?'error':''}`} onClick={()=>setToast({message:'',error:false})}>{toast.message}<span>×</span></button>}
    {(loading || roleLoading) && route.kind !== 'admin' && <div className="loader" />}
  </div>
}

function Home({city,categories,businesses,posts,ads,query,setQuery,navigate,openCompany,openCommunity,loading}) {
  const cats = categories.length ? categories : fallbackCategories.map(([name,icon],i)=>({id:i,name,icon,slug:slugify(name)}))
  return <>
    <section className="hero"><div className="hero-inner"><div>
      <div className="eyebrow">A cidade na palma da mão</div>
      <h1>Descubra o que <span>{city?.name || 'sua cidade'}</span> tem de melhor.</h1>
      <p>Encontre empresas, serviços, promoções, eventos e novidades perto de você.</p>
      <div className="searchbox"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="O que você procura hoje?"/><button onClick={()=>navigate('businesses')}>Buscar</button></div>
      <div className="hero-trust">● Conteúdo local de {city?.name || 'sua cidade'}.</div>
    </div><div className="hero-card"><div className="mini-header"><span>🔥 Em alta hoje</span><span>{city?.name || '—'}</span></div><div className="pulse-row"><div className="pulse-icon">📣</div><div><strong>Promoções locais</strong><p>Ofertas aprovadas por empresas locais</p></div></div><div className="pulse-row"><div className="pulse-icon">🏪</div><div><strong>{businesses.length} empresas no catálogo</strong><p>Cadastre sua empresa gratuitamente</p></div></div><button className="hero-cta" onClick={openCompany}>Quero colocar minha empresa →</button></div></div></section>
    {ads.length>0 && <section className="page section"><div className="section-head"><div><span className="section-kicker">Patrocinado</span><h2>Oferta em destaque</h2></div></div><PremiumBanner ad={ads[0]} /></section>}
    <section className="page section"><div className="section-head"><div><span className="section-kicker">Explore</span><h2>Encontre por categoria</h2></div><button className="link" onClick={()=>navigate('businesses')}>Ver todas →</button></div><div className="category-grid">{cats.map(c=><button className="category-card" key={c.id} onClick={()=>{navigate('businesses');}}><span className="category-icon">{c.icon || '✦'}</span><strong>{c.name}</strong><span>Explorar</span></button>)}</div></section>
    {businesses.some(b=>b.featured) && <section className="section soft"><div className="page"><div className="section-head"><div><span className="section-kicker">Destaques</span><h2>Empresas em evidência</h2></div></div><BusinessGrid items={businesses.filter(b=>b.featured).slice(0,4)} navigate={navigate} /></div></section>}
    <section className="page section"><div className="section-head"><div><span className="section-kicker">Conteúdo local</span><h2>O que está acontecendo?</h2></div></div><div className="content-grid"><div className="feed-list">{posts.length ? posts.map(p=><article className="content-card" key={p.id}><span className="section-kicker">{p.type==='community'?'COMUNIDADE':p.type==='event'?'EVENTO':p.type==='promotion'?'PROMOÇÃO':'LOCAL'}</span><h3>{p.title}</h3><p>{p.content || 'Confira esta novidade da cidade.'}</p>{p.image_url&&<img src={p.image_url} alt=""/>}{p.video_url&&<video src={p.video_url} controls playsInline/>}<small className="muted">{p.businesses?.name || 'VitrineLocal'} · {formatDate(p.published_at || p.created_at)}</small></article>) : <div className="empty"><h3>O feed local está começando.</h3><p>Novos conteúdos aparecerão aqui quando forem publicados.</p></div>}</div><aside className="side-card"><span className="section-kicker">Comunidade</span><h3>Tem algo acontecendo?</h3><p>Envie uma foto ou vídeo. Nossa equipe analisa antes de publicar.</p><button className="hero-cta" style={{background:'#1f6df2',color:'#fff'}} onClick={openCommunity}>Enviar conteúdo</button></aside></div></section>
    {loading && <section className="page section"><div className="empty">Atualizando dados de {city?.name || 'sua cidade'}…</div></section>}
  </>
}

function PremiumBanner({ad}) { return <a className="content-card" style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:16,textDecoration:'none',padding:0}} href={ad.target_url || '#'} target={ad.target_url ? '_blank' : undefined} rel={ad.target_url ? 'noreferrer' : undefined}><div style={{height:150,overflow:'hidden',background:'#e8eef6'}}>{ad.image_url?<img src={ad.image_url} alt={ad.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div className="cover-placeholder">V</div>}</div><div style={{padding:'20px 18px'}}><span className="section-kicker">★ PREMIUM · PATROCINADO</span><h3 style={{fontSize:22,margin:'8px 0'}}>{ad.title}</h3><p style={{margin:0}}>{ad.description || 'Conheça esta oferta em destaque.'}</p></div></a> }

function BusinessesPage({city,categories,items,query,setQuery,category,setCategory,navigate,openCompany,loading}) { return <main className="page"><div><span className="section-kicker">Catálogo local</span><h1>Empresas em {city?.name || 'sua cidade'}</h1><p className="muted">Encontre negócios, serviços e lugares da cidade.</p></div><div className="toolbar"><div className="searchbox compact"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa, serviço ou bairro"/></div><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>{loading?<div className="empty">Carregando empresas…</div>:<BusinessGrid items={items} navigate={navigate} emptyMessage="Ainda não há empresas publicadas nesta cidade."/>}<button className="hero-cta" style={{maxWidth:260,background:'#1f6df2',color:'#fff'}} onClick={openCompany}>＋ Cadastrar empresa</button></main> }
function BusinessGrid({items,navigate,emptyMessage='Nenhuma empresa encontrada.'}) { if(!items.length)return <div className="empty"><h3>{emptyMessage}</h3><p>Os primeiros negócios aprovados aparecerão aqui.</p></div>; return <div className="business-grid">{items.map(b=><article className="business-card" key={b.id} onClick={()=>navigate('business',b.cities?.slug || undefined,b.slug)} style={{cursor:'pointer'}}><div className="business-cover">{b.cover_url?<img src={b.cover_url} alt=""/>:<div className="cover-placeholder">{b.name?.slice(0,1).toUpperCase()}</div>}{b.verified&&<span className="verified">✓ Verificada</span>}</div><div className="business-body"><div className="business-category">{b.categories?.name || 'Empresa local'}</div><h3>{b.name}</h3><p>{b.short_description || b.description || 'Conheça este negócio da cidade.'}</p><div className="business-footer"><span>📍 {b.neighborhood || b.cities?.name}</span>{b.whatsapp&&<span className="wa">WhatsApp →</span>}</div></div></article>)}</div> }

function PromotionsPage({city,promotions,navigate}) { return <main className="page"><span className="section-kicker">Ofertas locais</span><h1>Promoções em {city?.name || 'sua cidade'}</h1><p className="muted">Ofertas publicadas e aprovadas pelas empresas participantes.</p>{promotions.length?<div className="promotion-grid">{promotions.map(p=><article className="promotion-card" key={p.id}><div className="business-cover">{p.image_url?<img src={p.image_url} alt=""/>:<div className="cover-placeholder">🔥</div>}</div><div className="business-body"><div className="business-category">OFERTA</div><h3>{p.title}</h3><p>{p.description || 'Confira esta promoção.'}</p><div style={{display:'flex',gap:8,alignItems:'center'}}>{p.original_price&&<del>{money(p.original_price)}</del>}<strong>{money(p.price)}</strong></div><button className="link" onClick={()=>navigate('business',city?.slug,p.businesses?.slug)}>Ver empresa →</button></div></article>)}</div>:<div className="empty"><h3>A vitrine de ofertas está começando.</h3><p>Assim que houver promoções aprovadas, elas aparecerão aqui.</p></div>}</main> }

function BusinessProfile({city,slug,navigate}) { const [data,setData]=useState(null),[loading,setLoading]=useState(true); useEffect(()=>{let alive=true;(async()=>{if(!supabase||!slug||!city?.id){setLoading(false);return}const {data:b,error}=await supabase.from('businesses').select('*,categories(name,slug,icon),cities(name,state,slug)').eq('city_id',city.id).eq('slug',slug).eq('status','active').maybeSingle();if(error||!b){if(alive)setLoading(false);return}const [photos,items,promos]=await Promise.all([supabase.from('business_photos').select('*').eq('business_id',b.id).order('sort_order'),supabase.from('business_items').select('*').eq('business_id',b.id).eq('active',true).order('sort_order'),supabase.from('promotions').select('*').eq('business_id',b.id).eq('status','published').order('created_at',{ascending:false})]);if(alive){setData({...b,photos:photos.data||[],items:items.data||[],promotions:promos.data||[]});setLoading(false)}})();return()=>{alive=false}},[slug,city?.id]);if(loading)return <main className="page"><div className="empty">Carregando perfil…</div></main>;if(!data)return <main className="page"><div className="empty"><h3>Empresa não encontrada</h3><button className="btn primary" onClick={()=>navigate('businesses')}>Voltar para empresas</button></div></main>;const wa=data.whatsapp?.replace(/\D/g,'');return <main className="page"><button className="link" onClick={()=>navigate('businesses')}>← Voltar</button><div className="profile-cover" style={{marginTop:12}}>{data.cover_url?<img src={data.cover_url} alt=""/>:<div className="cover-placeholder">{data.name?.slice(0,1)}</div>}</div><div className="profile-head"><div><span className="section-kicker">{data.categories?.name || 'Empresa local'}</span><h1>{data.name}</h1><p>{data.short_description || data.description}</p></div>{data.verified&&<span className="verified" style={{position:'static'}}>✓ Empresa verificada</span>}</div><div className="profile-actions">{wa&&<a className="primary" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}`}>WhatsApp</a>}{data.instagram_url&&<a className="outline" target="_blank" rel="noreferrer" href={data.instagram_url}>Instagram</a>}{data.website_url&&<a className="outline" target="_blank" rel="noreferrer" href={data.website_url}>Site</a>}</div><div className="profile-columns"><article className="profile-card"><span className="section-kicker">Sobre</span><h2>Conheça a empresa</h2><p>{data.description || data.short_description || 'Descrição não informada.'}</p><p>📍 {data.address || 'Endereço não informado'}{data.neighborhood?` · ${data.neighborhood}`:''}</p></article><article className="profile-card"><span className="section-kicker">Horários</span><h2>Funcionamento</h2><HoursView hours={data.opening_hours}/></article></div>{data.latitude&&data.longitude&&<article className="profile-card" style={{marginTop:16}}><h2>Localização</h2><iframe title="Mapa da empresa" src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.longitude-0.006}%2C${data.latitude-0.006}%2C${data.longitude+0.006}%2C${data.latitude+0.006}&layer=mapnik&marker=${data.latitude}%2C${data.longitude}`} style={{width:'100%',height:280,border:0,borderRadius:12}}/><p><a href={`https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`} target="_blank" rel="noreferrer">Abrir no Google Maps →</a></p></article>}{data.photos.length>0&&<><div className="section-head" style={{marginTop:28}}><h2>Galeria</h2></div><div className="profile-gallery">{data.photos.map(p=>p.media_type==='video'?<video key={p.id} src={p.url} controls playsInline/>:<img key={p.id} src={p.url} alt={p.alt_text || data.name}/>)}</div></>}{data.items.length>0&&<section className="section"><div className="section-head"><h2>Produtos e serviços</h2></div><div className="item-grid">{data.items.map(i=><article className="item-card" key={i.id}>{i.image_url&&<img src={i.image_url} alt=""/>}<div className="item-card-body"><span className="section-kicker">{i.type==='service'?'Serviço':'Produto'}</span><h3>{i.name}</h3><p>{i.description}</p>{i.price!=null&&<strong>{money(i.price)}</strong>}</div></article>)}</div></section>}{data.promotions.length>0&&<section className="section"><div className="section-head"><h2>Promoções</h2></div><div className="promotion-grid">{data.promotions.map(p=><article className="promotion-card" key={p.id}><div className="business-body"><h3>{p.title}</h3><p>{p.description}</p>{p.price!=null&&<strong>{money(p.price)}</strong>}</div></article>)}</div></section>}</main> }
function HoursView({hours}){if(!hours||!Object.keys(hours).length)return <p className="muted">Horários não informados.</p>;const labels={monday:'Segunda',tuesday:'Terça',wednesday:'Quarta',thursday:'Quinta',friday:'Sexta',saturday:'Sábado',sunday:'Domingo'};return <div className="mini-list">{Object.entries(labels).map(([key,label])=>{const h=hours[key]||{};return <div className="mini-row" key={key}><span>{label}</span><strong>{h.closed?'Fechado':(h.open&&h.close?`${h.open} – ${h.close}`:'Não informado')}</strong></div>})}</div>}

function PlansPage({supabase,openCompany,onBack}){const [plans,setPlans]=useState([]),[loading,setLoading]=useState(true);useEffect(()=>{let alive=true;(async()=>{const {data}=await supabase.from('plans').select('code,name,price_monthly,features').eq('active',true).order('price_monthly');if(alive){setPlans(data||[]);setLoading(false)}})();return()=>{alive=false}},[supabase]);return <main className="page"><button className="link" onClick={onBack}>← Voltar</button><div style={{maxWidth:760,marginTop:18}}><span className="section-kicker">Planos VitrineLocal</span><h1>Escolha como sua empresa quer aparecer na cidade.</h1><p className="muted">Comece gratuitamente e evolua conforme sua presença e audiência crescem.</p></div>{loading?<div className="empty">Carregando planos…</div>:<div className="promotion-grid" style={{marginTop:22}}>{plans.map(p=><article className="promotion-card" key={p.code} style={p.code==='premium'?{borderColor:'#1f6df2'}:{}}><div className="business-body"><span className="section-kicker">{p.code==='premium'?'Máxima exposição':p.code==='pro'?'Mais escolhido':'Comece agora'}</span><h2>{p.name}</h2><div style={{fontSize:31,fontWeight:900}}>{money(p.price_monthly)}<span style={{fontSize:11,fontWeight:600}}>/mês</span></div><p>{p.code==='free'?'Para colocar sua empresa no mapa sem mensalidade.':p.code==='pro'?'Para negócios que querem crescer dentro da plataforma.':'Para empresas que querem máxima presença e divulgação.'}</p><ul>{Object.entries(p.features||{}).filter(([,v])=>v).slice(0,8).map(([k,v])=><li key={k}>{typeof v==='number'?`${v} ${k==='photos'?'mídias':'conteúdos com IA por mês'}`:k.replaceAll('_',' ')}</li>)}</ul><button className="hero-cta" style={{background:'#1f6df2',color:'#fff'}} onClick={openCompany}>{p.code==='free'?'Começar gratuitamente':'Tenho interesse'}</button></div></article>)}</div>}</main> }

function AuthModal({onClose,onSuccess}){const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');async function submit(e){e.preventDefault();setError('');if(!supabase){setError('Supabase não configurado.');return}setBusy(true);const result=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});if(result.error)setError(result.error.message);else onSuccess(mode==='login'?'Login realizado com sucesso.':'Conta criada. Verifique seu e-mail se a confirmação estiver ativada.');setBusy(false)}return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={onClose}>×</button><span className="section-kicker">VitrineLocal</span><h2>{mode==='login'?'Entre na sua conta':'Crie sua conta'}</h2><p>{mode==='login'?'Acesse seu painel e gerencie sua empresa.':'Comece gratuitamente.'}</p><form onSubmit={submit}>{mode==='signup'&&<label className="field"><span>Nome</span><input value={name} onChange={e=>setName(e.target.value)} required/></label>}<label className="field"><span>E-mail</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label className="field"><span>Senha</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required/></label>{error&&<p style={{color:'#a22'}}>{error}</p>}<button className="btn primary" disabled={busy}>{busy?'Aguarde…':mode==='login'?'Entrar':'Criar conta'}</button></form><button className="link" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Ainda não tenho conta':'Já tenho conta'}</button></div></div>}

function BusinessCreateModal({session,city,cities,categories,onClose,onSaved}){const [form,setForm]=useState({name:'',category_id:'',city_id:city?.id||'',short_description:'',description:'',phone:'',whatsapp:'',instagram_url:'',website_url:'',address:'',neighborhood:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');const set=(k,v)=>setForm(f=>({...f,[k]:v}));async function submit(e){e.preventDefault();setError('');if(!supabase||!session?.user){setError('Entre na sua conta.');return}if(!form.city_id){setError('Selecione a cidade da empresa.');return}setBusy(true);const {error:insertError}=await supabase.from('businesses').insert({...form,owner_id:session.user.id,slug:`${slugify(form.name)}-${Math.random().toString(36).slice(2,7)}`,status:'pending',opening_hours:{}});if(insertError)setError(insertError.message);else onSaved();setBusy(false)}return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={onClose}>×</button><span className="section-kicker">Novo negócio</span><h2>Cadastre sua empresa</h2><p>A empresa ficará vinculada à cidade escolhida e só aparecerá depois da aprovação.</p><form className="form-grid" onSubmit={submit}><label className="field"><span>Nome</span><input value={form.name} onChange={e=>set('name',e.target.value)} required/></label><label className="field"><span>Categoria</span><select value={form.category_id} onChange={e=>set('category_id',e.target.value)} required><option value="">Selecione</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field full"><span>Cidade da empresa *</span><select value={form.city_id} onChange={e=>set('city_id',e.target.value)} required><option value="">Selecione a cidade</option>{cities.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name} - {c.state}</option>)}</select></label><label className="field"><span>Telefone</span><input value={form.phone} onChange={e=>set('phone',e.target.value)}/></label><label className="field"><span>WhatsApp</span><input value={form.whatsapp} onChange={e=>set('whatsapp',e.target.value)}/></label><label className="field"><span>Instagram URL</span><input type="url" value={form.instagram_url} onChange={e=>set('instagram_url',e.target.value)}/></label><label className="field"><span>Site URL</span><input type="url" value={form.website_url} onChange={e=>set('website_url',e.target.value)}/></label><label className="field"><span>Bairro</span><input value={form.neighborhood} onChange={e=>set('neighborhood',e.target.value)}/></label><label className="field full"><span>Endereço</span><input value={form.address} onChange={e=>set('address',e.target.value)}/></label><label className="field full"><span>Descrição curta</span><input value={form.short_description} onChange={e=>set('short_description',e.target.value)}/></label><label className="field full"><span>Descrição completa</span><textarea value={form.description} onChange={e=>set('description',e.target.value)}/></label>{error&&<div className="field full"><span style={{color:'#a22'}}>{error}</span></div>}<div className="form-actions field full"><button className="btn" type="button" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={busy}>{busy?'Enviando…':'Enviar para análise'}</button></div></form></div></div>}

function CommunityModal({session,city,onClose,onSaved}){const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');async function submit(e){e.preventDefault();setError('');if(!supabase||!city?.id){setError('Cidade ou Supabase indisponível.');return}if(!file){setError('Selecione uma foto ou vídeo.');return}if(!session?.user){setError('Entre na conta para enviar conteúdo.');return}if(file.size>100*1024*1024){setError('O arquivo excede 100 MB.');return}setBusy(true);try{const isImage=imageTypes.has(file.type);if(!isImage&&!videoTypes.has(file.type))throw new Error('Formato não suportado.');const ext=file.name.split('.').pop()?.toLowerCase()||'bin';const path=`${session.user.id}/${crypto.randomUUID()}.${ext}`;const upload=await supabase.storage.from(COMMUNITY_BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false});if(upload.error)throw upload.error;const {error:insertError}=await supabase.from('community_submissions').insert({user_id:session.user.id,city_id:city.id,title:title.trim()||'Conteúdo da comunidade',description:description.trim()||null,image_path:isImage?path:null,video_path:isImage?null:path,status:'pending'});if(insertError){await supabase.storage.from(COMMUNITY_BUCKET).remove([path]).catch(()=>{});throw insertError}onSaved()}catch(err){setError(err.message||'Erro no envio.')}finally{setBusy(false)}}return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={onClose}>×</button><span className="section-kicker">Comunidade · {city?.name}</span><h2>Envie uma ocorrência</h2><form onSubmit={submit}><label className="field"><span>Título</span><input value={title} onChange={e=>setTitle(e.target.value)} /></label><label className="field"><span>Descrição</span><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4}/></label><label className="field"><span>Foto ou vídeo</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>{file&&<small className="muted">{file.name} · {(file.size/1024/1024).toFixed(2)} MB</small>}{error&&<p style={{color:'#a22'}}>{error}</p>}<button className="btn primary" disabled={busy}>{busy?'Enviando…':'Enviar para moderação'}</button></form></div></div>}

function OwnerDashboard({supabase,session,city,categories,onBack,onNotice}){const [businesses,setBusinesses]=useState([]),[selected,setSelected]=useState(null),[data,setData]=useState(null),[plan,setPlan]=useState(null),[stats,setStats]=useState({profile_view:0,whatsapp_click:0,instagram_click:0,website_click:0,map_click:0}),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[draft,setDraft]=useState(null),[fileType,setFileType]=useState('gallery'),[showItemForm,setShowItemForm]=useState(false),[itemDraft,setItemDraft]=useState({type:'product',name:'',description:'',price:'',active:true});const days={monday:'Segunda',tuesday:'Terça',wednesday:'Quarta',thursday:'Quinta',friday:'Sexta',saturday:'Sábado',sunday:'Domingo'};
  async function load(){if(!session?.user?.id){setLoading(false);return}setLoading(true);const {data:b}=await supabase.from('businesses').select('*,categories(id,name),cities(id,name,state,slug)').eq('owner_id',session.user.id).order('created_at',{ascending:false});setBusinesses(b||[]);const chosen=selected||b?.[0]||null;if(chosen){setSelected(chosen);const [p,i,ph,e,s]=await Promise.all([supabase.from('promotions').select('*').eq('business_id',chosen.id).order('created_at',{ascending:false}),supabase.from('business_items').select('*').eq('business_id',chosen.id).order('sort_order'),supabase.from('business_photos').select('*').eq('business_id',chosen.id).order('sort_order'),supabase.from('analytics_events').select('event_type').eq('business_id',chosen.id).gte('created_at',new Date(Date.now()-30*86400000).toISOString()),supabase.from('subscriptions').select('status,starts_at,ends_at,plans(code,name,price_monthly,features)').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle()]);setData({promotions:p.data||[],items:i.data||[],photos:ph.data||[]});const counts={profile_view:0,whatsapp_click:0,instagram_click:0,website_click:0,map_click:0};(e.data||[]).forEach(x=>{if(counts[x.event_type]!=null)counts[x.event_type]+=1});setStats(counts);setPlan(s.data?.plans || {code:'free',name:'Grátis',price_monthly:0,features:{photos:5}});setDraft({...chosen,opening_hours:chosen.opening_hours||{}})}setLoading(false)}useEffect(()=>{load()},[session?.user?.id,selected?.id]);async function save(){if(!draft)return;setSaving(true);const payload={name:draft.name,category_id:draft.category_id,short_description:draft.short_description,description:draft.description,phone:draft.phone,whatsapp:draft.whatsapp,instagram_url:draft.instagram_url,facebook_url:draft.facebook_url,website_url:draft.website_url,address:draft.address,neighborhood:draft.neighborhood,latitude:draft.latitude===''?null:Number(draft.latitude),longitude:draft.longitude===''?null:Number(draft.longitude),opening_hours:draft.opening_hours||{}};const {error}=await supabase.from('businesses').update(payload).eq('id',draft.id);if(error)onNotice(error.message,true);else{onNotice('Dados da empresa atualizados.');await load()}setSaving(false)}async function upload(kind,file){if(!file||!selected)return;const allowed=kind==='gallery'?([...imageTypes,...videoTypes]):[...imageTypes];if(!allowed.includes(file.type))return onNotice('Formato não suportado.',true);if(file.size>50*1024*1024)return onNotice('Arquivo acima de 50 MB.',true);const ext=file.name.split('.').pop()?.toLowerCase()||'bin';const path=`business/${selected.id}/${kind}-${crypto.randomUUID()}.${ext}`;const up=await supabase.storage.from(BUSINESS_BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false});if(up.error)return onNotice(up.error.message,true);const url=supabase.storage.from(BUSINESS_BUCKET).getPublicUrl(path).data.publicUrl;if(kind==='logo'||kind==='cover'){const payload=kind==='logo'?{logo_url:url,logo_path:path}:{cover_url:url,cover_path:path};const {error}=await supabase.from('businesses').update(payload).eq('id',selected.id);if(error){await supabase.storage.from(BUSINESS_BUCKET).remove([path]);return onNotice(error.message,true)}}else{const {error}=await supabase.from('business_photos').insert({business_id:selected.id,url,storage_path:path,media_type:imageTypes.has(file.type)?'image':'video',alt_text:file.name,sort_order:(data?.photos?.length||0)});if(error){await supabase.storage.from(BUSINESS_BUCKET).remove([path]);return onNotice(error.message,true)}}onNotice('Mídia enviada.');await load()}async function removePhoto(p){if(!window.confirm('Excluir esta mídia?'))return;const {error}=await supabase.from('business_photos').delete().eq('id',p.id);if(error)return onNotice(error.message,true);if(p.storage_path)await supabase.storage.from(BUSINESS_BUCKET).remove([p.storage_path]).catch(()=>{});await load()}async function saveItem(){if(!selected)return;const payload={business_id:selected.id,type:itemDraft.type,name:itemDraft.name,description:itemDraft.description||null,price:itemDraft.price===''?null:Number(itemDraft.price),active:Boolean(itemDraft.active),sort_order:data?.items?.length||0};const {error}=await supabase.from('business_items').insert(payload);if(error)return onNotice(error.message,true);setItemDraft({type:'product',name:'',description:'',price:'',active:true});setShowItemForm(false);onNotice('Produto/serviço adicionado.');await load()}async function createPromotion(){if(!selected)return;const title=window.prompt('Título da promoção');if(!title)return;const description=window.prompt('Descrição da promoção')||null;const {error}=await supabase.from('promotions').insert({business_id:selected.id,title,description,status:'pending_review'});if(error)return onNotice(error.message,true);onNotice('Promoção enviada para revisão.');await load()};if(!session)return <main className="page"><div className="empty"><h3>Entre para acessar sua conta</h3></div></main>;return <main className="page"><div className="dashboard-header"><div><span className="section-kicker">Área do comerciante</span><h1>Minha conta</h1><p className="muted">{session.user.email}</p></div><button className="btn" onClick={onBack}>Voltar ao site</button></div>{loading?<div className="empty">Carregando seus dados…</div>:<>{businesses.length===0?<div className="empty"><h3>Você ainda não possui uma empresa.</h3></div>:<><div className="stats"><div className="stat"><span>Visualizações</span><strong>{stats.profile_view}</strong><small>últimos 30 dias</small></div><div className="stat"><span>WhatsApp</span><strong>{stats.whatsapp_click}</strong><small>cliques</small></div><div className="stat"><span>Instagram</span><strong>{stats.instagram_click}</strong><small>cliques</small></div><div className="stat"><span>Plano</span><strong>{plan?.name||'Grátis'}</strong><small>{money(plan?.price_monthly||0)}/mês</small></div></div><div className="owner-layout"><aside className="panel"><h3>Minhas empresas</h3><div className="business-picker">{businesses.map(b=><button className={selected?.id===b.id?'active':''} key={b.id} onClick={()=>setSelected(b)}><strong>{b.name}</strong><small className="muted">{b.cities?.name} · {b.status}</small></button>)}</div></aside><section className="panel">{draft&&<><div style={{display:'flex',justifyContent:'space-between',gap:10}}><div><span className="section-kicker">Perfil da empresa</span><h3>{draft.name}</h3></div><span className="muted">Cidade: {draft.cities?.name || city?.name}</span></div><div className="form-grid"><label className="field"><span>Nome</span><input value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label className="field"><span>Categoria</span><select value={draft.category_id||''} onChange={e=>setDraft({...draft,category_id:e.target.value})}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field full"><span>Descrição curta</span><input value={draft.short_description||''} onChange={e=>setDraft({...draft,short_description:e.target.value})}/></label><label className="field full"><span>Descrição</span><textarea value={draft.description||''} onChange={e=>setDraft({...draft,description:e.target.value})}/></label><label className="field"><span>Telefone</span><input value={draft.phone||''} onChange={e=>setDraft({...draft,phone:e.target.value})}/></label><label className="field"><span>WhatsApp</span><input value={draft.whatsapp||''} onChange={e=>setDraft({...draft,whatsapp:e.target.value})}/></label><label className="field"><span>Instagram</span><input value={draft.instagram_url||''} onChange={e=>setDraft({...draft,instagram_url:e.target.value})}/></label><label className="field"><span>Site</span><input value={draft.website_url||''} onChange={e=>setDraft({...draft,website_url:e.target.value})}/></label><label className="field"><span>Bairro</span><input value={draft.neighborhood||''} onChange={e=>setDraft({...draft,neighborhood:e.target.value})}/></label><label className="field full"><span>Endereço</span><input value={draft.address||''} onChange={e=>setDraft({...draft,address:e.target.value})}/></label><label className="field"><span>Latitude</span><input type="number" step="any" value={draft.latitude??''} onChange={e=>setDraft({...draft,latitude:e.target.value})}/></label><label className="field"><span>Longitude</span><input type="number" step="any" value={draft.longitude??''} onChange={e=>setDraft({...draft,longitude:e.target.value})}/></label></div><div className="upload-box" style={{marginTop:14}}><strong>Logo / capa</strong><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><label className="small-btn">Logo<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>upload('logo',e.target.files?.[0])}/></label><label className="small-btn">Capa<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>upload('cover',e.target.files?.[0])}/></label></div></div><div className="upload-box" style={{marginTop:10}}><strong>Galeria</strong><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>upload('gallery',e.target.files?.[0])}/><div className="gallery-owner">{data?.photos?.map(p=><figure key={p.id}>{p.media_type==='video'?<video src={p.url} controls playsInline/>:<img src={p.url} alt=""/>}<figcaption><button className="small-btn danger-text" onClick={()=>removePhoto(p)}>Excluir</button></figcaption></figure>)}</div></div><div className="upload-box" style={{marginTop:10}}><strong>Horários</strong>{Object.entries(days).map(([key,label])=>{const h=draft.opening_hours?.[key]||{open:'',close:'',closed:false};return <div key={key} style={{display:'grid',gridTemplateColumns:'90px 1fr 1fr 90px',gap:8,alignItems:'center',marginTop:6}}><span style={{fontSize:11}}>{label}</span><input type="time" value={h.open||''} onChange={e=>setDraft({...draft,opening_hours:{...draft.opening_hours,[key]:{...h,open:e.target.value}}})}/><input type="time" value={h.close||''} onChange={e=>setDraft({...draft,opening_hours:{...draft.opening_hours,[key]:{...h,close:e.target.value}}})}/><label style={{fontSize:10}}><input type="checkbox" checked={Boolean(h.closed)} onChange={e=>setDraft({...draft,opening_hours:{...draft.opening_hours,[key]:{...h,closed:e.target.checked}}})}/> Fechado</label></div>})}</div><div className="form-actions"><button className="btn" onClick={createPromotion}>＋ Nova promoção</button><button className="btn" onClick={()=>setShowItemForm(!showItemForm)}>＋ Produto/serviço</button><button className="btn primary" disabled={saving} onClick={save}>{saving?'Salvando…':'Salvar alterações'}</button></div>{showItemForm&&<div className="upload-box"><div className="form-grid"><label className="field"><span>Tipo</span><select value={itemDraft.type} onChange={e=>setItemDraft({...itemDraft,type:e.target.value})}><option value="product">Produto</option><option value="service">Serviço</option></select></label><label className="field"><span>Nome</span><input value={itemDraft.name} onChange={e=>setItemDraft({...itemDraft,name:e.target.value})}/></label><label className="field full"><span>Descrição</span><textarea value={itemDraft.description} onChange={e=>setItemDraft({...itemDraft,description:e.target.value})}/></label><label className="field"><span>Preço</span><input type="number" step="0.01" value={itemDraft.price} onChange={e=>setItemDraft({...itemDraft,price:e.target.value})}/></label></div><button className="btn primary" onClick={saveItem}>Salvar item</button></div>}{data?.items?.length>0&&<div className="section"><h3>Produtos e serviços cadastrados</h3><div className="mini-list">{data.items.map(i=><div className="mini-row" key={i.id}><span>{i.name} · {i.type==='service'?'Serviço':'Produto'}</span><strong>{i.price!=null?money(i.price):''}</strong></div>)}</div></div>}<div className="section"><h3>Uso do plano</h3><p className="muted">{data?.photos?.length || 0} mídias usadas de {plan?.features?.photos || 5} disponíveis.</p><button className="btn primary" onClick={()=>window.alert('O upgrade será conectado ao pagamento na próxima etapa.')}>Fazer upgrade</button></div></>}</section></div></>}</>}</main> }

function AccessDenied({onBack}){return <main className="page"><div className="empty"><h1>Acesso restrito</h1><p>Esta área é exclusiva para administradores.</p><button className="btn primary" onClick={onBack}>Voltar ao site</button></div></main>}

createRoot(document.getElementById('root')).render(<App />)
