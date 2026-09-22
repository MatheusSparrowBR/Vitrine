import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const css=()=>fs.readFileSync('src/mobile-complete-audit.css','utf8')
const entry=()=>fs.readFileSync('src/app-entry.jsx','utf8')
test('complete mobile audit is loaded after the other styles',()=>assert.match(entry(),/prelaunch-plans\.css'[\s\S]*mobile-complete-audit\.css/))
test('mobile audit is scoped to mobile breakpoints',()=>{const c=css();assert.match(c,/@media\(max-width:760px\)/);assert.match(c,/@media\(max-width:480px\)/)})
test('mobile audit protects public profile actions and touch targets',()=>{const c=css();assert.match(c,/\.mbp-primary-cta,.mbp-action-row a,.mbp-action-row button\{min-height:48px/);assert.match(c,/\.profile-actions a\{min-height:44px/);assert.match(c,/\.vl-site-mobile-panel nav a\{min-height:44px/)})
test('mobile audit protects account forms and overlays',()=>{const c=css();assert.match(c,/\.account-field input,.account-field select,.account-field textarea\{min-width:0/);assert.match(c,/\.modal,.vl-admin-tools-modal\{width:100%;max-width:100%;max-height:calc\(100dvh - 20px\)/)})
test('mobile audit keeps dense admin controls usable',()=>{const c=css();assert.match(c,/\.admin-v2-btn\{min-height:42px/);assert.match(c,/\.au-table-wrap\{max-width:100%;overflow-x:auto/);assert.match(c,/\.aa-chart\{max-width:100%;overflow-x:auto/)})
