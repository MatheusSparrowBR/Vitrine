import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import EventsPage from './EventsPage.jsx'
import AdminPremiumBannerPage from './AdminPremiumBannerPage.jsx'
import AdminPlatformPage from './AdminPlatformPage.jsx'
import './core.css'
import './events.css'
import './home-premium-slot.css'
import './home-premium-slot.js'
import './admin-premium-nav.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

function parseEventRoute(pathname = location.pathname) {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (parts.length === 2 && parts[1].toLowerCase() === 'eventos') return { citySlug: parts[0].toLowerCase() }
  return null
}
function isAdminBannerRoute(pathname = location.pathname) { return pathname === '/admin/banners' || pathname === '/admin/banners/' }
function isAdminToolsRoute(pathname = location.pathname) { return pathname === '/admin/gestao' || pathname === '/admin/gestao/' }

function EventRoute() {
  const [city,setCity]=React.useState(null),[loading,setLoading]=React.useState(true)
  const route=React.useMemo(()=>parseEventRoute(),[])
  React.useEffect(()=>{let active=true;async function loadCity(){if(!supabase||!route?.citySlug){setLoading(false);return}const {data}=await supabase.from('cities').select('id,name,state,slug,country,active').eq('slug',route.citySlug).eq('active',true).maybeSingle();if(!active)return;setCity(data||null);setLoading(false)}loadCity();return()=>{active=false}},[route?.citySlug])
  function goHome(){const path=route?.citySlug?`/${encodeURIComponent(route.citySlug)}`:'/';history.pushState({},'',path);location.reload()}
  if(loading)return <div className="app"><div className="loader"/></div>
  if(!supabase)return <div className="app"><main className="page section"><div className="empty"><h3>Configuração indisponível.</h3><p>Não foi possível inicializar o acesso aos dados.</p></div></main></div>
  if(!city)return <div className="app"><main className="page section"><button className="link" onClick={goHome}>← Voltar</button><div className="empty"><h3>Cidade não encontrada.</h3><p>Confira o endereço e tente novamente.</p></div></main></div>
  return <div className="app"><EventsPage supabase={supabase} city={city} onBack={goHome}/></div>
}
function AdminBannerRoute(){return <AdminPremiumBannerPage supabase={supabase}/>}
function AdminToolsRoute(){return <AdminPlatformPage supabase={supabase}/>}

const isEventsRoute=Boolean(parseEventRoute())
const isBannerEditorRoute=isAdminBannerRoute()
const isAdminToolsRouteActive=isAdminToolsRoute()
if(isEventsRoute)createRoot(document.getElementById('root')).render(<EventRoute/>)
else if(isBannerEditorRoute)createRoot(document.getElementById('root')).render(<AdminBannerRoute/>)
else if(isAdminToolsRouteActive)createRoot(document.getElementById('root')).render(<AdminToolsRoute/>)
else import('./main-clean.jsx')
