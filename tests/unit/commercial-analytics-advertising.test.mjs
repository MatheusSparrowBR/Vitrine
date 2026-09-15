import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL(`../../${p}`,import.meta.url),'utf8')

test('desempenho comercial separa banner contratado de recurso ainda não contratado',()=>{
 const src=read('src/CommercialAnalyticsPage.jsx')
 assert.match(src,/hasCampaignHistory=s\.ads\.length>0/)
 assert.match(src,/CONTRATADO/)
 assert.match(src,/NÃO CONTRATADO/)
 assert.match(src,/Este recurso ainda não foi contratado/)
 assert.match(src,/pendingRequests/)
 assert.match(src,/banner_impressions/)
 assert.match(src,/banner_clicks/)
})

test('home mantém banner premium separado das empresas em destaque',()=>{
 const src=read('src/CityHomePage.jsx')
 assert.match(src,/placement.*home_banner/)
 assert.match(src,/Empresas em destaque/)
 assert.match(src,/banner\?/) 
})
