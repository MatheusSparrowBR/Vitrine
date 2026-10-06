import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const page=fs.readFileSync('src/CityHomePage.jsx','utf8')

test('Home usa a mesma lógica de status dos horários com intervalo',()=>{
 assert.ok(page.includes("import {getOpenStatus} from './business-hours-utils.js'"))
 assert.match(page,/const businessOpenLabel=b=>{[sS]*getOpenStatus(hours)/)
})

test('Home restaura favoritos existentes antes de renderizar os cards',()=>{
 assert.match(page,/db.from\('business_favorites'\)/)
 assert.match(page,/setSavedBusinessIds(new Set((favoriteResult?.data||[]).map(row=>row.business_id)))/)
})
