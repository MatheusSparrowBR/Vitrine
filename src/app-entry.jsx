import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import EventsPage from './EventsPage.jsx'
import AdminPremiumBannerPage from './AdminPremiumBannerPage.jsx'
import AdminPlatformPage from './AdminPlatformPage.jsx'
import CityHomePage from './CityHomePage.jsx'
import AuthPage from './AuthPage.jsx'
import BillingPlansPage from './BillingPlansPage.jsx'
import { PrivacyPage,TermsPage } from './LegalPages.jsx'
import './core.css'
import './events.css'
import './city-home.css'
import './auth-page.css'
import './billing-plans.css'
import './admin-premium-nav.js'
const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase=URL&&KEY?createClient(URL,KEY):null
function parseEventRoute(path=location.pathname){const parts=path.split('/').filter(Boolean).map(decodeURIComponent);return parts.length===2&&parts[1].toLowerCase()==='eventos'?{citySlug:parts[0].toLowerCase()}:null}
function parseCityHome(path=location.pathname){const parts=path.split('/').filter(Boolean).map(decodeURIComponent);if(parts.length===0)return'laguna';if(parts.length===1&&!['admin','planos','conta','login','privacidade','termos'].includes(parts[0].toLowerCase()))return parts[0].toLowerCase();return null}
function EventRoute(){const route=React.useMemo(()=>parseEventRoute(),[]),[city,setCity]=React.useState(supabase?null:{id:'fallback',name:'Laguna',state:'SC',slug:route?.citySlug||'laguna',active:true}),[loading,setLoading]=React.useState(Boolean(supabase));React.useEffect(()=>{let live=true;(async()=>{if(!supabase||!route?.citySlug){setLoading(false);return}const {data}=await supabase.from('cities').select('id,name,state,slug,country,active').eq('slug',route.citySlug).eq('active',true).maybeSingle();if(live){setCity(data||null);setLoading(false)}})();return()=>{live=false}},[route?.citySlug]);if(loading)return <div className="app"><div className="loader"/></div>;if(!city)return <div className="app"><main className="page section"><a className="link" href="/laguna">← Voltar</a><div className="empty"><h3>Cidade não encontrada.</h3></div></main></div>;return <div className="app"><EventsPage supabase={supabase} city={city} onBack={()=>location.href=`/${city.slug}`}/></div>}
function LegacyRoute(){React.useEffect(()=>{import('./main-clean.jsx')},[]);return <div className="app"><div className="loader"/></div>}
function RootRoute(){const path=location.pathname;if(path==='/login')return <AuthPage/>;if(path==='/planos'||path==='/planos/')return <BillingPlansPage/>;if(path==='/privacidade'||path==='/privacidade/')return <PrivacyPage/>;if(path==='/termos'||path==='/termos/')return <TermsPage/>;if(path==='/admin/banners'||path==='/admin/banners/')return <AdminPremiumBannerPage supabase={supabase}/>;if(path==='/admin/gestao'||path==='/admin/gestao/')return <AdminPlatformPage supabase={supabase}/>;const event=parseEventRoute(path);if(event)return <EventRoute/>;const citySlug=parseCityHome(path);if(citySlug)return <CityHomePage citySlug={citySlug}/>;return <LegacyRoute/>}
createRoot(document.getElementById('root')).render(<RootRoute/>)
