import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

test('Home aceita fundo personalizado por cidade e mantém fallback',()=>{
 const page=fs.readFileSync('src/CityHomePage.jsx','utf8')
 const css=fs.readFileSync('src/public-home.css','utf8')
 assert.ok(page.includes('home_background_url'))
 assert.ok(page.includes('--lvp-city-home-bg'))
 assert.ok(css.includes("var(--lvp-city-home-bg,url('/laguna-hero.svg'))"))
})

test('Home consulta os metadados do fundo junto com a cidade',()=>{
 const page=fs.readFileSync('src/CityHomePage.jsx','utf8')
 assert.ok(page.includes('select(\'id,name,state,country,slug,active,home_background_url,home_background_path,home_background_position_desktop,home_background_position_mobile\')'))
})
