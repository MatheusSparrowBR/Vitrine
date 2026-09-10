import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import SiteHeader from './SiteHeader.jsx'
import AnalyticsTracker from './analytics-tracker.jsx'
import EventsPage from './EventsPage.jsx'
import AdminPremiumBannerPage from './AdminPremiumBannerPage.jsx'
import AdminPlatformPage from './AdminPlatformPage.jsx'
import AdminHomePage from './AdminHomePage.jsx'
import AdminAnalyticsPage from './AdminAnalyticsPage.jsx'
import AdminBusinessesPage from './AdminBusinessesPage.jsx'
import BusinessRegistrationPage from './BusinessRegistrationPage.jsx'
import CityHomePage from './CityHomePage.jsx'
import AccountPage from './AccountPage.jsx'
import MerchantAnalyticsPage from './MerchantAnalyticsPage.jsx'
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
import './commercial-home.css'
import './auth-page.css'
import './billing-plans.css'
import './billing-funnel.css'
import './public-polish.css'
import './vitrine-ux-adjustments.css'
import './modern-business-profile.css'
import './modern-business-profile-v2.css'
import './modern-business-list.css'
import './modern-gallery-lightbox.css'
import './modern-gallery-lightbox.js'
import './business-hours-status-v3.js'
import './admin-city-actions.js'
import './business-registration.css'
import './banner-timezone-fix.js'
import './admin-premium-nav.js'
import './account-modern.css'
import './site-header.css'
import './site-header-dedup.css'
import './admin-v2.css'
import './admin-management.css'
import './admin-analytics.css'
import './analytics.css'
import './modern-business-profile-v4.css'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase=URL&&KEY?createClient(URL,KEY):null
const normalizePath=p=>p.replace(/\/+$/,'')||'/'
const partsOf=p=>p.split('/').filter(Boolean).map(decodeURIComponent)
function getCityRoute(path){
 const p=partsOf(path)
 if(p.length===0)return {kind:'home',citySlug:'laguna'}
 if(p.length===1&&!['login','planos','conta','admin','privacidade','termos','atualizar-senha'].includes(p[0].toLowerCase()))return {kind:'home',citySlug:p[0].toLowerCase()}
 if(p.length===2&&!['admin'].includes(p[0].toLowerCase())){const citySlug=p[0].toLowerCase(),child=p[1].toLowerCase();if(child==='eventos')return {kind:'events',citySlug};if(child==='empresas')return {kind:'businesses',citySlug};if(child==='promocoes')return {kind:'promotions',citySlug}}
 if(p.length===3&&p[1].toLowerCase()==='empresa')return {kind:'business',citySlug:p[0].toLowerCase(),businessSlug:p[2]}
 return null
}
function EventRoute({citySlug}){const[city,setCity]=React.useState(supabase?null:{id:'fallback',name:'Laguna',state:'SC',slug:citySlug,active:true}),[loading,setLoading]=React.useState(Boolean(supabase));React.useEffect(()=>{let live=true;(async()=>{if(!supabase){setLoading(false);return}const{data}=await supabase.from('cities').select('id,name,state,slug,country,active').eq('slug',citySlug).eq('active',true).maybeSingle();if(live){setCity(data||null);setLoading(false)}})();return()=>{live=false}},[citySlug]);if(loading)return <div className="app"><div className="loader"/></div>;if(!city)return <div className="app"><main className="page section"><a className="back-link" href="/laguna">← Voltar</a><div className="empty"><h3>Cidade não encontrada.</h3></div></main></div>;return <div className="app"><EventsPage supabase={supabase} city={city} onBack={()=>location.href=`/${city.slug}`}/></div>}
function AccountRoute(){const params=new URLSearchParams(location.search),isNewBusiness=params.get('new')==='business';if(isNewBusiness)return <BusinessRegistrationPage/>;if(!supabase)return <div className="app account-logged-out"><main className="account-login-state"><div className="account-login-card"><span className="account-eyebrow">MINHA CONTA</span><div className="account-login-icon">V</div><h1>Entre para acessar sua conta</h1><p>Gerencie suas empresas, mídias, produtos, promoções e plano em um só lugar.</p><a className="account-primary-btn" href="/login?next=%2Fconta">Entrar</a><a className="account-secondary-btn" href="/laguna">Voltar ao site</a></div></main></div>;return <AccountPage/>}
function RootRoute(){const path=normalizePath(location.pathname);if(path==='/login')return <AuthPage/>;if(path==='/planos')return <BillingPlansPage/>;if(path==='/conta')return <AccountRoute/>;if(path==='/conta/analytics')return <MerchantAnalyticsPage/>;if(path==='/conta/nova')return <BusinessRegistrationPage/>;if(path==='/atualizar-senha')return <PasswordUpdatePage/>;if(path==='/privacidade')return <PrivacyPage/>;if(path==='/termos')return <TermsPage/>;if(path==='/admin')return <AdminHomePage/>;if(path==='/admin/analytics')return <AdminAnalyticsPage/>;if(path==='/admin/empresas')return <AdminBusinessesPage/>;if(path==='/admin/banners')return <AdminPremiumBannerPage supabase={supabase}/>;if(path==='/admin/gestao')return <AdminPlatformPage supabase={supabase}/>;const route=getCityRoute(path);if(!route)return <NotFoundPage/>;if(route.kind==='home')return <CityHomePage citySlug={route.citySlug}/>;if(route.kind==='events')return <EventRoute citySlug={route.citySlug}/>;if(route.kind==='businesses')return <ModernBusinessesPage citySlug={route.citySlug}/>;if(route.kind==='promotions')return <PromotionsPage citySlug={route.citySlug}/>;if(route.kind==='business')return <ModernBusinessProfilePage citySlug={route.citySlug} businessSlug={route.businessSlug}/>;return <NotFoundPage/>}
function App(){const isAdmin=location.pathname.startsWith('/admin');return <>{!isAdmin&&<SiteHeader/>}{!isAdmin&&<AnalyticsTracker/>}<RootRoute/></>}
createRoot(document.getElementById('root')).render(<App/>)
