import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import EventsPage from './EventsPage.jsx'
import AdminPremiumBannerPage from './AdminPremiumBannerPage.jsx'
import AdminPlatformPage from './AdminPlatformPage.jsx'
import AdminHomePage from './AdminHomePage.jsx'
import CityHomePage from './CityHomePage.jsx'
import AccountPage from './AccountPage.jsx'
import AuthPage from './AuthPage.jsx'
import PasswordUpdatePage from './PasswordUpdatePage.jsx'
import BillingPlansPage from './BillingPlansPage.jsx'
import ModernBusinessProfilePage from './ModernBusinessProfilePage.jsx'
import ModernBusinessesPage from './ModernBusinessesPage.jsx'
import { BusinessesPage,PromotionsPage,NotFoundPage } from './PublicCatalogPages.jsx'
import { PrivacyPage,TermsPage } from './LegalPages.jsx'
import './core.css'
import './events.css'
import './city-home.css'
import './auth-page.css'
import './billing-plans.css'
import './public-polish.css'
import './vitrine-ux-adjustments.css'
import './modern-business-profile.css'
import './modern-business-list.css'
import './modern-gallery-lightbox.css'
import './modern-gallery-lightbox.js'
import './admin-premium-nav.js'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase=URL&&KEY?createClient(URL,KEY):null
const normalizePath=p=>p.replace(/\/+$/,'')||'/'
const partsOf=p=>p.split('/').filter(Boolean).map(decodeURIComponent)

function getCityRoute(path){
 const p=partsOf(path)
 if(p.length===0)return {kind:'home',citySlug:'laguna'}
 if(p.length===1&&!['login','planos','conta','admin','privacidade','termos','atualizar-senha'].includes(p[0].toLowerCase()))return {kind:'home',citySlug:p[0].toLowerCase()}
 if(p.length===2&&!['admin'].includes(p[0].toLowerCase())){
  const citySlug=p[0].toLowerCase(),child=p[1].toLowerCase()
  if(child==='eventos')return {kind:'events',citySlug}
  if(child==='empresas')return {kind:'businesses',citySlug}
  if(child==='promocoes')return {kind:'promotions',citySlug}
 }
 if(p.length===3&&p[1].toLowerCase()==='empresa')return {kind:'business',citySlug:p[0].toLowerCase(),businessSlug:p[2]}
 return null
}

function EventRoute({citySlug}){
 const [city,setCity]=React.useState(supabase?null:{id:'fallback',name:'Laguna',state:'SC',slug:citySlug,active:true}),[loading,setLoading]=React.useState(Boolean(supabase))
 React.useEffect(()=>{let live=true;(async()=>{if(!supabase){setLoading(false);return}const {data}=await supabase.from('cities').select('id,name,state,slug,country,active').eq('slug',citySlug).eq('active',true).maybeSingle();if(live){setCity(data||null);setLoading(false)}})();return()=>{live=false}},[citySlug])
 if(loading)return <div className="app"><div className="loader"/></div>
 if(!city)return <div className="app"><main className="page section"><a className="back-link" href="/laguna">← Voltar</a><div className="empty"><h3>Cidade não encontrada.</h3></div></main></div>
 return <div className="app"><header className="topbar"><div className="nav"><a className="brand" href={`/${city.slug}`}><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a><div className="nav-spacer"/><nav className="nav-actions"><a href={`/${city.slug}/empresas`}>Explorar</a><a href={`/${city.slug}/promocoes`}>Promoções</a><a href={`/${city.slug}/eventos`}>Eventos</a><a href="/planos">Planos</a></nav></div></header><EventsPage supabase={supabase} city={city} onBack={()=>location.href=`/${city.slug}`}/></div>
}

function RootRoute(){
 const path=normalizePath(location.pathname)
 if(path==='/login')return <AuthPage/>
 if(path==='/planos')return <BillingPlansPage/>
 if(path==='/conta')return <AccountPage/>
 if(path==='/atualizar-senha')return <PasswordUpdatePage/>
 if(path==='/privacidade')return <PrivacyPage/>
 if(path==='/termos')return <TermsPage/>
 if(path==='/admin')return <AdminHomePage/>
 if(path==='/admin/banners')return <AdminPremiumBannerPage supabase={supabase}/>
 if(path==='/admin/gestao')return <AdminPlatformPage supabase={supabase}/>
 const route=getCityRoute(path)
 if(!route)return <NotFoundPage/>
 if(route.kind==='home')return <CityHomePage citySlug={route.citySlug}/>
 if(route.kind==='events')return <EventRoute citySlug={route.citySlug}/>
 if(route.kind==='businesses')return <ModernBusinessesPage citySlug={route.citySlug}/>
 if(route.kind==='promotions')return <PromotionsPage citySlug={route.citySlug}/>
 if(route.kind==='business')return <ModernBusinessProfilePage citySlug={route.citySlug} businessSlug={route.businessSlug}/>
 return <NotFoundPage/>
}
createRoot(document.getElementById('root')).render(<RootRoute/>)
