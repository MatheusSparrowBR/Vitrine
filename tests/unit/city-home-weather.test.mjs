import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=new URL('../../',import.meta.url)
const read=path=>fs.readFileSync(new URL(path,root),'utf8')

test('city home shows live weather for the selected city',()=>{
 const page=read('src/CityHomePage.jsx')
 const css=read('src/home-v2-fixes.css')
 assert.match(page,/fetchCityWeather/)
 assert.match(page,/geocoding-api\.open-meteo\.com/)
 assert.match(page,/api\.open-meteo\.com\/v1\/forecast/)
 assert.match(page,/current=temperature_2m,apparent_temperature,weather_code,is_day/)
 assert.match(page,/setInterval\(loadWeather,10\*60\*1000\)/)
 assert.match(page,/hero-weather/)
 assert.match(page,/AO VIVO/)
 assert.match(css,/\.hero-weather\{/) 
 assert.match(css,/\.hero-weather-live\{/) 
})

test('weather lookup keeps the selected city and state context',()=>{
 const page=read('src/CityHomePage.jsx')
 assert.match(page,/city\?\.name/)
 assert.match(page,/city\?\.state/)
 assert.match(page,/city\?\.country/)
})