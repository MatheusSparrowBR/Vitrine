import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('clima ao vivo usa icones SVG por condicao meteorologica',()=>{
 const page=read('src/CityHomePage.jsx')
 const icons=read('src/ui-icons.jsx')
 assert.match(page,/weatherLabel=\(code,isDay=true\)/)
 assert.match(page,/'cloudSun'/)
 assert.match(page,/'cloud'/)
 assert.match(page,/'rain'/)
 assert.match(page,/'storm'/)
 assert.match(page,/'snow'/)
 assert.match(page,/weatherLabel\(current\.weather_code,current\.is_day!==0\)/)
 for(const name of ['sun','moon','cloudSun','cloud','fog','drizzle','rain','snow','storm']) assert.match(icons,new RegExp('\\n  '+name+':'))
})
