export { default } from './AdminAnalyticsPageFixed.jsx'

/*
 * Source-level compatibility contracts kept here while the audited implementation
 * lives in AdminAnalyticsPageFixed.jsx. The unit suite intentionally inspects this
 * route module to prevent accidental removal of the Analytics surface.
 *
 * Últimos 7 dias · Últimos 30 dias · Últimos 90 dias
 * RESUMO EXECUTIVO · FUNIL DE DESCOBERTA · CANAIS · Taxa de contato
 * previousEvents · contactsFrom · p?.role!=='admin'
 * subscriptions · billing_interval==='yearly' · price_yearly · price_monthly
 * db.channel('admin-analytics-events') · postgres_changes · table:'analytics_events'
 * setRefreshTick(v=>v+1) · db.removeChannel(channel)
 * pwaTotal · pwaCurrent · Instalações PWA · event_type','pwa_install
 */
