import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const tracker=fs.readFileSync('src/analytics-tracker.jsx','utf8')
const analytics=fs.readFileSync('src/AdminAnalyticsPageFixed.jsx','utf8')
const migration=fs.readFileSync('supabase/migrations/20261021120000_admin_analytics_overview.sql','utf8')
const css=fs.readFileSync('src/admin-analytics.css','utf8')

test('PWA registra instalação sem bloquear o funcionamento do app',()=>{
 assert.match(tracker,/appinstalled/)
 assert.match(tracker,/pwa_install/)
 assert.match(tracker,/standalone_launch/)
 assert.match(tracker,/vl_pwa_install_tracked_v1/)
 assert.match(tracker,/if\(recorded\)localStorage\.setItem/)
})

test('Admin Analytics exibe instalações do app com total e período',()=>{
 assert.match(analytics,/Instalações do app/)
 assert.match(analytics,/v\.pwa\.current/)
 assert.match(analytics,/v\.pwa\.total/)
 assert.match(migration,/e\.event_type = 'pwa_install'/)
})

test('Analytics mantém o grid responsivo dos indicadores',()=>{
 assert.match(css,/\.aa-kpis\{[^}]*repeat\(5,minmax\(0,1fr\)\)/)
 assert.match(css,/\.aa-kpis\.aa-kpis-six\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\)\}/)
 assert.match(css,/@media\(max-width:560px\)/)
})
