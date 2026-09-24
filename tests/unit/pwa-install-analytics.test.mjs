import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const tracker=fs.readFileSync('src/analytics-tracker.jsx','utf8')
const analytics=fs.readFileSync('src/AdminAnalyticsPage.jsx','utf8')
const css=fs.readFileSync('src/admin-analytics.css','utf8')

test('PWA registra instalação sem bloquear o funcionamento do app',()=>{
 assert.match(tracker,/appinstalled/)
 assert.match(tracker,/pwa_install/)
 assert.match(tracker,/standalone_launch/)
 assert.match(tracker,/vl_pwa_install_tracked_v1/)
 assert.match(tracker,/if\(recorded\)localStorage\.setItem/)
})

test('Admin Analytics exibe instalações PWA',()=>{
 assert.match(analytics,/pwaTotal/)
 assert.match(analytics,/pwaCurrent/)
 assert.match(analytics,/Instalações PWA/)
 assert.match(analytics,/event_type','pwa_install/)
})

test('Analytics acomoda o quinto KPI sem quebrar responsividade',()=>{
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/)
 assert.match(css,/@media\(max-width:560px\)/)
})
