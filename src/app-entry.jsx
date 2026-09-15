import React from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase-client.js'
import SiteHeader from './SiteHeader.jsx'
import AnalyticsTracker from './analytics-tracker.jsx'
import EventsPage from './EventsPage.jsx'
import AdminPremiumBannerPage from './AdminPremiumBannerPage.jsx'
import AdminAdvertisingPage from './AdminAdvertisingPage.jsx'
import AdminAdvertisingSalesPage from './AdminAdvertisingSalesPage.jsx'
import AdminPlatformPage from './AdminPlatformPage.jsx'
import AdminHomePage from './AdminHomePage.jsx'
import AdminAnalyticsPage from './AdminAnalyticsPage.jsx'
import AdminBusinessesPage from './AdminBusinessesPage.jsx'
import AdminReviewsPage from './AdminReviewsPage.jsx'
import AdminUsersPage from './AdminUsersPage.jsx'
import BusinessRegistrationPage from './BusinessRegistrationPage.jsx'
import CityHomePage from './CityHomePage.jsx'
import AccountPage from './AccountWorkspacePage.jsx'
import CommercialAnalyticsPage from './CommercialAnalyticsPage.jsx'
import MerchantAdvertisingPage from './MerchantAdvertisingPage.jsx'
import MerchantAdvertisingSalesPage from './MerchantAdvertisingSalesPage.jsx'
import AuthPage from './AuthPage.jsx'
import UserAuthPage from './UserAuthPage.jsx'
import UserProfilePage from './UserProfilePage.jsx'
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
import './home-v3.css'
import './auth-page.css'
import './billing-plans.css'
import './billing-funnel.css'
import './public-polish.css'
import './vitrine-ux-adjustments.css'
import './modern-business-profile.css'
import './modern-business-profile-v2.css'
import './modern-business-list.css'
import './modern-gallery-lightbox.css'
import './review-card-rating.css'
import './modern-gallery-lightbox.js'
import './admin-city-actions.js'
import './business-registration.css'
import './banner-timezone-fix.js'
import './account-premium-nav.js'
import './account-modern.css'
import './site-header.css'
import './site-header-v2.css'
import './site-header-v3.css'
import './site-header-dedup.css'
import './admin-v2.css'
import './admin-management.css'
import './admin-analytics.css'
import './admin-users.css'
import './analytics.css'
import './commercial-analytics.css'
import './merchant-advertising.css'
import './merchant-advertising-sales.css'
import './admin-advertising.css'
import './admin-advertising-sales.css'
import './modern-business-profile-v4.css'
import './phase2-product.css'
import './phase2-enhancements.js'
import './account-premium-ad-shortcut.css'
import './mobile-responsive-fixes.css'
import './review-ui-mount.js'
import './review-card-rating.js'
import './user-profile.css'
import './ux-refinement.css'
import './mobile-launch-fixes.css'

const normalizePath=p=>p.replace(/\/+$/,'')||'/'
const partsOf=p=>p.split('/').filter(Boolean).map(decodeURIComponent)
function getCityRoute(path){
 const p=partsOf(path)
 if(p.length===0)return {kind:'home',citySlug:'laguna'}
 const citySlug=p[0]
 if(['login','planos','conta','admin','privacidade','termos','atualizar-senha','usuario'].includes(citySlug))return {kind:'reserved'}
 if(p.length===1)return {kind:'home',citySlug}
 if(p[1]==='empresas')return {kind:'businesses',citySlug}
 if(p[1]==='promocoes')return {kind:'promotions',citySlug}
 if(p[1]==='eventos')return {kind:'events',citySlug}
 if(p[1]==='empresa')return {kind:'business-profile',citySlug,slug:p[2]}
 return {kind:'not-found'}
}
function RouteView(){
 const path=normalizePath(location.pathname),route=getCityRoute(path)
 if(path==='/login')return <AuthPage/>
 if(path==='/atualizar-senha')return <PasswordUpdatePage/>
 if(path==='/planos')return <BillingPlansPage/>
 if(path==='/conta')return <AccountPage/>
 if(path==='/usuario/login'||path==='/usuario/cadastro')return <UserAuthPage/>
 if(path==='/usuario/perfil')return <UserProfilePage/>
 if(path==='/privacidade')return <PrivacyPage/>
 if(path==='/termos')return <TermsPage/>
 if(path.startsWith('/admin'))return <AdminHomePage/>
 if(route.kind==='home')return <CityHomePage citySlug={route.citySlug}/>
 if(route.kind==='businesses')return <BusinessesPage citySlug={route.citySlug}/>
 if(route.kind==='promotions')return <PromotionsPage citySlug={route.citySlug}/>
 if(route.kind==='events')return <EventsPage citySlug={route.citySlug}/>
 if(route.kind==='business-profile')return <ModernBusinessProfilePage citySlug={route.citySlug} slug={route.slug}/>
 return <NotFoundPage/>
}
createRoot(document.getElementById('root')).render(<><AnalyticsTracker/><SiteHeader/><RouteView/></>)
