import React,{useEffect,useMemo,useState}from'react'
import{createPortal}from'react-dom'
import{supabase as db}from'./supabase-client.js'
import Icon from './ui-icons.jsx'
import{FALLBACK_CITY,RESERVED_PATHS,loadActiveCities,loadJobsCount}from'./site-context.js'
import'./site-header.css'

const CITY_CHILDREN=new Set(['empresas','promocoes','eventos','vagas'])
function pathParts(){return location.pathname.split('/').filter(Boolean).map(x=>{try{return decodeURIComponent(x)}catch{return x}})}
function getPathCitySlug(){const parts=pathParts();const first=parts[0]?.toLowerCase();return first&&!RESERVED_PATHS.has(first)?first:null}
function getStoredCity(){try{return localStorage.getItem('vl_city_slug')||null}catch{return null}}
function setStoredCity(slug){try{localStorage.setItem('vl_city_slug',slug)}catch{}}
const BUSINESS_LINKS=[['Cadastrar empresa','/conta/nova','store'],['Planos','/planos','star'],['Publicidade','/conta/publicidade','tag'],['Área da empresa','/login','user']]

export default function SiteHeader(){
 const[path,setPath]=useState(location.pathname),[cities,setCities]=useState([FALLBACK_CITY]),[citySlug,setCitySlug]=useState(getPathCitySlug()||getStoredCity()||'laguna'),[session,setSession]=useState(null),[role,setRole]=useState('user'),[mobileOpen,setMobileOpen]=useState(false),[jobs,setJobs]=useState(0)
 const loadRole=async currentSession=>{if(!db||!currentSession?.user?.id){setRole('user');return}const{data,error}=await db.from('profiles').select('role').eq('id',currentSession.user.id).maybeSingle();setRole(error?'user':data?.role||'user')}
 useEffect(()=>{const sync=()=>{setPath(location.pathname);setMobileOpen(false);const fromPath=getPathCitySlug();if(fromPath){setCitySlug(fromPath);setStoredCity(fromPath)}};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync)},[])
 useEffect(()=>{let live=true;if(!db)return()=>{};(async()=>{try{const[{data:{session:s}},citiesData]=await Promise.all([db.auth.getSession(),loadActiveCities()]);if(!live)return;setSession(s||null);if(citiesData?.length)setCities(citiesData);const fromPath=getPathCitySlug(),next=fromPath||getStoredCity()||citiesData?.[0]?.slug||'laguna';setCitySlug(next);setStoredCity(next)}catch{if(live)setSession(null)}})();const sub=db.auth.onAuthStateChange((_event,s)=>setSession(s||null));return()=>{live=false;sub?.data?.subscription?.unsubscribe()}},[])
 useEffect(()=>{let live=true;loadJobsCount(citySlug).then(n=>{if(live)setJobs(n)});return()=>{live=false}},[citySlug])
 useEffect(()=>{let live=true;setRole('user');if(!session?.user?.id)return()=>{};(async()=>{try{await loadRole(session);if(!live)return}catch{if(live)setRole('user')}})();return()=>{live=false}},[session?.user?.id])
 useEffect(()=>{const fecha=e=>{document.querySelectorAll('.vl-site-biz[open]').forEach(d=>{if(!d.contains(e.target))d.removeAttribute('open')})};document.addEventListener('click',fecha);return()=>document.removeEventListener('click',fecha)},[])
 useEffect(()=>{document.body.classList.toggle('vl-menu-open',mobileOpen);const onKey=e=>{if(e.key==='Escape')setMobileOpen(false)};window.addEventListener('keydown',onKey);return()=>{window.removeEventListener('keydown',onKey);document.body.classList.remove('vl-menu-open')}},[mobileOpen])
 const city=useMemo(()=>cities.find(c=>c.slug===citySlug)||cities[0]||FALLBACK_CITY,[cities,citySlug]),cityBase=`/${city?.slug||'laguna'}`
 const accountHref=role==='admin'?'/conta':'/usuario/perfil'
 const openAccount=async e=>{e.preventDefault();if(!session?.user?.id){location.assign('/login');return}try{const[{data:profile,error:profileError},{data:businesses,error:businessError}]=await Promise.all([db.from('profiles').select('role').eq('id',session.user.id).maybeSingle(),db.from('businesses').select('status').eq('owner_id',session.user.id)]);if(profileError||businessError)throw profileError||businessError;const hasActiveBusiness=(businesses||[]).some(row=>row.status==='active');const target=profile?.role==='admin'||hasActiveBusiness?'/conta':'/usuario/perfil?mode=personal';location.assign(target)}catch{location.assign(accountHref)}}
 const isActive=key=>{if(key==='home')return path===cityBase||path==='/';if(key==='businesses')return path.startsWith(`${cityBase}/empresa`);if(key==='jobs')return path.startsWith(`${cityBase}/vagas`);if(key==='promotions')return path.startsWith(`${cityBase}/promocoes`);if(key==='events')return path.startsWith(`${cityBase}/evento`);if(key==='business-area')return path==='/planos'||path.startsWith('/conta/nova')||path==='/conta/publicidade';if(key==='admin')return path.startsWith('/admin');if(key==='account')return path.startsWith('/conta')||path.startsWith('/usuario/perfil')||path==='/login';return false}
 const initials=(session?.user?.email||'U').slice(0,1).toUpperCase()
 const goCity=nextSlug=>{setCitySlug(nextSlug);setStoredCity(nextSlug);const parts=pathParts();const child=parts[0]?.toLowerCase()!==nextSlug.toLowerCase()&&!RESERVED_PATHS.has(parts[0]?.toLowerCase())?parts[1]?.toLowerCase():null;if(child&&CITY_CHILDREN.has(child))location.href=`/${nextSlug}/${child}`;else if(path==='/planos'||path.startsWith('/admin')||path.startsWith('/conta')||path.startsWith('/usuario')||path==='/login'||path==='/privacidade'||path==='/termos'||path==='/atualizar-senha')setMobileOpen(false);else location.href=`/${nextSlug}`}
 const logout=async()=>{if(db)await db.auth.signOut();setSession(null);setRole('user');setMobileOpen(false);location.href=cityBase}
 const links=[['businesses','Empresas',`${cityBase}/empresas`],['promotions','Promoções',`${cityBase}/promocoes`],['events','Eventos',`${cityBase}/eventos`],...(jobs>0?[['jobs','Vagas',`${cityBase}/vagas`]]:[])]
 const citySelect=<label className="vl-site-city" aria-label="Escolher cidade"><span className="vl-site-city-pin"><Icon name="pin" size={14}/></span><select value={city?.slug||'laguna'} onChange={e=>goCity(e.target.value)}>{cities.map(c=><option key={c.id} value={c.slug}>{c.name} - {c.state||'SC'}</option>)}</select><span className="vl-site-city-chevron"><Icon name="chevronDown" size={14}/></span></label>
 return <header className="vl-site-header vl-site-header-2026"><div className="vl-site-header-inner">
  <a className="vl-site-brand" href={cityBase} aria-label="VitrineLocal início"><img className="vl-site-brand-logo" src="/vitrine-local-header-logo.svg" alt="VitrineLocal — A cidade em um só lugar"/></a>
  {citySelect}
  <nav className="vl-site-nav" aria-label="Navegação principal">
   {links.map(([key,label,href])=><a key={key} className={`vl-site-nav-link ${isActive(key)?'active':''}`} href={href} aria-current={isActive(key)?'page':undefined}>{label}</a>)}
   {role==='admin'&&<a className={`vl-site-nav-link vl-site-admin-link ${isActive('admin')?'active':''}`} href="/admin">Admin</a>}
  </nav>
  <div className="vl-site-actions">
   <a className="vl-site-search" href={`${cityBase}/empresas?buscar=1`} aria-label="Buscar empresas"><Icon name="search" size={18}/></a>
   {session?<><a className={`vl-site-account ${isActive('account')?'active':''}`} href={accountHref} onClick={openAccount}><span className="vl-site-avatar">{initials}</span><span>Minha conta</span></a><button className="vl-site-logout" type="button" onClick={logout}>Sair</button></>:<a className={`vl-site-login ${isActive('account')?'active':''}`} href="/login">Entrar</a>}
   <details className={`vl-site-biz ${isActive('business-area')?'active':''}`}><summary>Para empresas <Icon name="chevronDown" size={13}/></summary><div className="vl-site-biz-menu">{BUSINESS_LINKS.map(([label,href,icon])=><a key={href} href={href}><Icon name={icon} size={16}/>{label}</a>)}</div></details>
   <button className="vl-site-menu-toggle" type="button" onClick={()=>setMobileOpen(v=>!v)} aria-expanded={mobileOpen} aria-controls="vl-site-mobile-panel" aria-label={mobileOpen?'Fechar menu':'Abrir menu'}><Icon name={mobileOpen?'close':'menu'} size={20}/></button>
  </div>
 </div>
 {mobileOpen&&createPortal(<><button type="button" className="vl-site-mobile-backdrop" aria-label="Fechar menu" onClick={()=>setMobileOpen(false)}/><div className="vl-mobile-2026" id="vl-site-mobile-panel" role="dialog" aria-modal="true" aria-label="Menu"><div className="vl-mobile-2026-head"><img src="/vitrine-local-header-logo.svg" alt="VitrineLocal"/><button type="button" className="vl-mobile-2026-close" onClick={()=>setMobileOpen(false)} aria-label="Fechar menu"><Icon name="close" size={20}/></button></div>
  <nav aria-label="Mais opções">
   <a className={isActive('promotions')?'active':''} href={`${cityBase}/promocoes`}><Icon name="tag" size={18}/>Promoções</a>
   {jobs>0&&<a className={isActive('jobs')?'active':''} href={`${cityBase}/vagas`}><Icon name="briefcase" size={18}/>Vagas</a>}
   {role==='admin'&&<a className={isActive('admin')?'active':''} href="/admin"><Icon name="grid" size={18}/>Administração</a>}
  </nav>
  <div className="vl-site-mobile-group"><strong>Sua conta</strong>
   {session?<><a className="vl-site-mobile-account" href={accountHref} onClick={openAccount}><span className="vl-site-avatar">{initials}</span>Minha conta</a><button type="button" className="vl-site-mobile-logout" onClick={logout}>Sair da conta</button></>:<a className="vl-site-mobile-login" href="/login"><Icon name="user" size={18}/>Entrar ou criar conta</a>}
  </div>
  <div className="vl-site-mobile-group"><strong>Para empresas</strong>{BUSINESS_LINKS.filter(([,href])=>href!=='/login'||!session).map(([label,href,icon])=><a key={href} href={href}><Icon name={icon} size={18}/>{label}</a>)}</div>
 </div></>,document.body)}
 </header>
}
