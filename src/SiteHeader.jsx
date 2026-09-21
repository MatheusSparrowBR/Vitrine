import React,{useEffect,useMemo,useState}from'react'
import{supabase as db}from'./supabase-client.js'
import Icon from './ui-icons.jsx'
import'./site-header.css'

const FALLBACK_CITY={id:'fallback',name:'Laguna',state:'SC',slug:'laguna',active:true}
const RESERVED=new Set(['login','planos','conta','admin','privacidade','termos','atualizar-senha','usuario'])
const CITY_CHILDREN=new Set(['empresas','promocoes','eventos'])
const CATEGORY_MENU=[['Restaurantes','store'],['Lojas','bag'],['Serviços','wrench'],['Saúde','heart'],['Beleza','star'],['Turismo','pin'],['Automóveis','briefcase'],['Imóveis','grid'],['Pets','heart'],['Outros','grid']]
const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
function pathParts(){return location.pathname.split('/').filter(Boolean).map(x=>{try{return decodeURIComponent(x)}catch{return x}})}
function getPathCitySlug(){const parts=pathParts();const first=parts[0]?.toLowerCase();return first&&!RESERVED.has(first)?first:null}
function getStoredCity(){try{return localStorage.getItem('vl_city_slug')||null}catch{return null}}
function setStoredCity(slug){try{localStorage.setItem('vl_city_slug',slug)}catch{}}

export default function SiteHeader(){
 const[path,setPath]=useState(location.pathname),[cities,setCities]=useState([FALLBACK_CITY]),[citySlug,setCitySlug]=useState(getPathCitySlug()||getStoredCity()||'laguna'),[session,setSession]=useState(null),[role,setRole]=useState('user'),[mobileOpen,setMobileOpen]=useState(false)
 const loadRole=async currentSession=>{if(!db||!currentSession?.user?.id){setRole('user');return}const{data,error}=await db.from('profiles').select('role').eq('id',currentSession.user.id).maybeSingle();setRole(error?'user':data?.role||'user')}
 useEffect(()=>{const sync=()=>{setPath(location.pathname);setMobileOpen(false);const fromPath=getPathCitySlug();if(fromPath){setCitySlug(fromPath);setStoredCity(fromPath)}};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync)},[])
 useEffect(()=>{let live=true;if(!db)return()=>{};(async()=>{try{const[{data:{session:s}},{data:citiesData}]=await Promise.all([db.auth.getSession(),db.from('cities').select('id,name,state,slug,active').eq('active',true).order('name')]);if(!live)return;setSession(s||null);if(citiesData?.length)setCities(citiesData);const fromPath=getPathCitySlug(),next=fromPath||getStoredCity()||citiesData?.[0]?.slug||'laguna';setCitySlug(next);setStoredCity(next)}catch{if(live)setSession(null)}})();const sub=db.auth.onAuthStateChange((_event,s)=>setSession(s||null));return()=>{live=false;sub?.data?.subscription?.unsubscribe()}},[])
 useEffect(()=>{let live=true;setRole('user');if(!session?.user?.id)return()=>{};(async()=>{try{await loadRole(session);if(!live)return}catch{if(live)setRole('user')}})();return()=>{live=false}},[session?.user?.id])
 const city=useMemo(()=>cities.find(c=>c.slug===citySlug)||cities[0]||FALLBACK_CITY,[cities,citySlug]),cityBase=`/${city?.slug||'laguna'}`
 const accountHref=role==='admin'||role==='business_owner'?'/conta':'/usuario/perfil'
 const openAccount=async e=>{e.preventDefault();if(!session?.user?.id){location.assign('/login');return}try{const[{data:profile,error:profileError},{count:businessCount,error:businessError}]=await Promise.all([db.from('profiles').select('role').eq('id',session.user.id).maybeSingle(),db.from('businesses').select('id',{count:'exact',head:true}).eq('owner_id',session.user.id)]);if(profileError||businessError)throw profileError||businessError;const target=profile?.role==='admin'||profile?.role==='business_owner'||(businessCount||0)>0?'/conta':'/usuario/perfil';location.assign(target)}catch{location.assign(accountHref)}}
 const isActive=key=>{if(key==='home')return path===cityBase||path==='/';if(key==='businesses')return path.startsWith(`${cityBase}/empresas`);if(key==='promotions')return path.startsWith(`${cityBase}/promocoes`);if(key==='events')return path.startsWith(`${cityBase}/eventos`);if(key==='plans')return path==='/planos';if(key==='admin')return path.startsWith('/admin');if(key==='account')return path.startsWith('/conta')||path.startsWith('/usuario/perfil')||path==='/login';return false}
 const initials=(session?.user?.email||'U').slice(0,1).toUpperCase()
 const goCity=nextSlug=>{setCitySlug(nextSlug);setStoredCity(nextSlug);const parts=pathParts();const child=parts[0]?.toLowerCase()===nextSlug.toLowerCase()?parts[1]?.toLowerCase():null;if(child&&CITY_CHILDREN.has(child))location.href=`/${nextSlug}/${child}`;else if(path==='/planos'||path.startsWith('/admin')||path.startsWith('/conta')||path.startsWith('/usuario/perfil')||path==='/login'||path==='/privacidade'||path==='/termos'||path==='/atualizar-senha')setMobileOpen(false);else location.href=`/${nextSlug}`}
 const logout=async()=>{if(db)await db.auth.signOut();setSession(null);setRole('user');setMobileOpen(false);location.href=cityBase}
 const links=[['businesses','Explorar',`${cityBase}/empresas`],['promotions','Promoções',`${cityBase}/promocoes`],['events','Eventos',`${cityBase}/eventos`],['plans','Planos','/planos']]
 return <><header className="vl-site-header"><div className="vl-site-header-inner">
  <a className="vl-site-brand" href={cityBase} aria-label="VitrineLocal início"><img className="vl-site-brand-logo" src="/vitrine-local-header-logo.svg" alt="VitrineLocal — A cidade em um só lugar"/></a>
  <label className="vl-site-city" aria-label="Selecionar cidade"><span className="vl-site-city-pin"><Icon name="pin" size={14}/></span><select value={city?.slug||'laguna'} onChange={e=>goCity(e.target.value)}>{cities.map(c=><option key={c.id} value={c.slug}>{c.name} - {c.state||'SC'}</option>)}</select><span className="vl-site-city-chevron"><Icon name="chevronDown" size={14}/></span></label>
  <nav className="vl-site-nav" aria-label="Navegação principal">
   {links.map(([key,label,href])=><a key={key} className={`vl-site-nav-link ${isActive(key)?'active':''}`} href={href}>{label}</a>)}
   <details className="vl-site-categories"><summary>Categorias <Icon name="chevronDown" size={12}/></summary><div className="vl-site-category-menu">{CATEGORY_MENU.map(([label,icon])=><a href={`${cityBase}/empresas?categoria=${encodeURIComponent(slugify(label))}`} key={label}><Icon name={icon} size={16}/><span>{label}</span></a>)}</div></details>
   {role==='admin'&&<a className={`vl-site-nav-link vl-site-admin-link ${isActive('admin')?'active':''}`} href="/admin">Admin</a>}
  </nav>
  <div className="vl-site-actions">
   {session?<><a className={`vl-site-account ${isActive('account')?'active':''}`} href={accountHref} onClick={openAccount}><span className="vl-site-avatar">{initials}</span><span>Minha conta</span></a><button className="vl-site-logout" type="button" onClick={logout}>Sair</button></>:<a className={`vl-site-login ${isActive('account')?'active':''}`} href="/login">Entrar</a>}
   <a className="vl-site-business-cta" href={session?'/conta?new=business':'/login?next=%2Fconta%3Fnew%3Dbusiness'}>Cadastrar empresa</a>
   <button className="vl-site-menu-toggle" type="button" onClick={()=>setMobileOpen(v=>!v)} aria-expanded={mobileOpen} aria-label={mobileOpen?'Fechar menu':'Abrir menu'}><Icon name={mobileOpen?'close':'menu'} size={19}/></button>
  </div>
 </div>
 {mobileOpen&&<div className="vl-site-mobile-panel">
  <div className="vl-site-mobile-city"><span>Localização</span><label><span><Icon name="pin" size={14}/></span><select value={city?.slug||'laguna'} onChange={e=>goCity(e.target.value)}>{cities.map(c=><option key={c.id} value={c.slug}>{c.name} - {c.state||'SC'}</option>)}</select></label></div>
  <nav aria-label="Navegação móvel">
   <a className={isActive('home')?'active':''} href={cityBase}>Início</a>
   {links.map(([key,label,href])=><a key={key} className={isActive(key)?'active':''} href={href}>{label}</a>)}
   <div className="vl-site-mobile-categories"><strong>Categorias</strong>{CATEGORY_MENU.map(([label,icon])=><a href={`${cityBase}/empresas?categoria=${encodeURIComponent(slugify(label))}`} key={label}><Icon name={icon} size={15}/>{label}</a>)}</div>
   {role==='admin'&&<a className={isActive('admin')?'active':''} href="/admin">Administração</a>}
  </nav>
  <div className="vl-site-mobile-actions">
   {session?<><a className="vl-site-mobile-account" href={accountHref} onClick={openAccount}><span className="vl-site-avatar">{initials}</span>Minha conta</a><button type="button" onClick={logout}>Sair da conta</button></>:<a className="vl-site-mobile-login" href="/login">Entrar</a>}
   <a className="vl-site-business-cta mobile" href={session?'/conta?new=business':'/login?next=%2Fconta%3Fnew%3Dbusiness'}>Cadastrar empresa</a>
  </div>
 </div>}
 </header></>
}
