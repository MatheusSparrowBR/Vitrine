import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const page=()=>fs.readFileSync('src/ModernBusinessesPage.jsx','utf8')
const css=()=>fs.readFileSync('src/modern-business-list.css','utf8')
test('mobile catalog keeps search and result summary compact',()=>{const c=css();assert.match(c,/\.mbl-hero\{display:grid;grid-template-columns/);assert.match(c,/\.mbl-toolbar\{padding:10px;border-radius:16px/);assert.match(c,/\.mbl-search-large\{height:46px/);assert.match(page(),/mbl-result-count/)})
test('quick filters are collapsed until requested',()=>{const p=page();assert.match(p,/showMoreFilters&&<div className="mbl-quick-filters"/);assert.match(p,/Mais filtros/);assert.match(p,/Object\.values\(quickFilters\)\.filter\(Boolean\)/)})
test('mobile chips hide scrollbars and preserve horizontal touch scrolling',()=>{const c=css();assert.match(c,/\.mbl-chips\{gap:6px[^}]*scrollbar-width:none/);assert.match(c,/\.mbl-quick-filters\{flex-wrap:nowrap;overflow-x:auto/);assert.match(c,/\.mbl-active-filters\{display:flex;gap:6px;overflow-x:auto/)})
