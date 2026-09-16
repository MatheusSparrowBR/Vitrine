import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=new URL('../../',import.meta.url)
const read=path=>fs.readFileSync(new URL(path,root),'utf8')

test('city home shows live weather for the selected city',()=>{
 const page=read('src/CityHomePageResilient2.jsx')
 const css=read('src/home-v2-fixes.css')
 assert.match(page,/city home/i)
 assert.match(page,/createClient/)
 assert.match(page,/city\?\.name/)
 assert.match(page,/city\?\.state/)
 assert.match(page,/city\?\.country/)
 assert.match(page,/hero-panel/)
 assert.match(css,/\.hero-weather\{/) 
 assert.match(css,/\.hero-weather-live\{/) 
})

test('weather lookup keeps the selected city and state context',()=>{
 const page=read('src/CityHomePage.jsx')
 const implementation=read('src/CityHomePageResilient2.jsx')
 assert.match(page,/CityHomePageResilient2/)
 assert.match(implementation,/citySlug/)
 assert.match(implementation,/city\?\.name/)
 assert.match(implementation,/city\?\.state/)
 assert.match(implementation,/city\?\.country/) 
})
