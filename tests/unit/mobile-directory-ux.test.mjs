import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const page=()=>fs.readFileSync('src/ModernBusinessesPage.jsx','utf8')
const css=()=>fs.readFileSync('src/modern-business-list.css','utf8')
test('mobile catalog keeps search and result summary compact',()=>{const c=css();assert.match(c,/\.mbl-hero\{display:grid;grid-template-columns/);assert.match(c,/\.mbl-toolbar\{padding:10px;border-radius:16px/);assert.match(c,/\.mbl-search-large\{height:46px/);assert.match(page(),/mbl-result-count/)})
test('catalog filters stay compact and open the secondary panel on demand',()=>{const p=page();const c=css();assert.match(p,/mbl-filters-toggle/);assert.match(p,/showMoreFilters&&<div className="mbl-filter-panel"/);assert.match(p,/Object\.values\(quickFilters\)\.filter\(Boolean\)/);assert.match(c,/\.mbl-toolbar\{position:sticky;top:72px/);assert.match(c,/\.mbl-filter-panel\{margin-top:8px/);assert.match(c,/@media\(max-width:760px\)\{\n \.mbl-toolbar\{top:64px/)})
test('mobile chips hide scrollbars and preserve horizontal touch scrolling',()=>{const c=css();assert.match(c,/\.mbl-chips\{gap:6px[^}]*scrollbar-width:none/);assert.match(c,/\.mbl-quick-filters\{flex-wrap:nowrap;overflow-x:auto/);assert.match(c,/\.mbl-active-filters\{display:flex;gap:6px;overflow-x:auto/)})
