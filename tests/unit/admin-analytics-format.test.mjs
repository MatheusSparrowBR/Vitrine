import {test} from 'node:test'
import assert from 'node:assert/strict'
import {pct,delta,deltaClass,countOf,contactsOf,funnelSteps,peakDay,dateLong,dayLabel,linePoints,chartMax} from '../../src/admin-analytics-format.js'

test('percentuais e variação: sem divisão por zero e com sinal',()=>{
 assert.equal(pct(5,20),'25.0')
 assert.equal(pct(5,0),'0.0')
 assert.equal(delta(150,100),'+50.0%')
 assert.equal(delta(50,100),'-50.0%')
 assert.equal(delta(10,0),null)
 assert.equal(deltaClass(3,2),'positive')
 assert.equal(deltaClass(2,3),'negative')
 assert.equal(deltaClass(2,2),'neutral')
})

test('contatos somam WhatsApp, Instagram e site, e nada mais',()=>{
 const totals={whatsapp_click:3,instagram_click:2,website_click:1,profile_view:10,map_click:4}
 assert.equal(contactsOf(totals),6)
 assert.equal(countOf(totals,['profile_view','map_click']),14)
 assert.equal(countOf({},['profile_view']),0)
})

test('funil: cada etapa mostra a taxa sobre a anterior e sobre o início',()=>{
 const steps=funnelSteps({page_view:200,business_click:50,profile_view:25,whatsapp_click:5},[])
 assert.deepEqual(steps.map(s=>s.value),[200,50,25,5])
 assert.equal(steps[0].rate,null)
 assert.equal(steps[1].rate,'25.0')
 assert.equal(steps[2].rate,'50.0')
 assert.equal(steps[3].share,'2.5')
})

test('dia de pico é o de mais visitas ao perfil; sem visitas não há pico',()=>{
 const daily=[{day:'2026-10-19',profile_views:2},{day:'2026-10-20',profile_views:7},{day:'2026-10-21',profile_views:4}]
 assert.equal(peakDay(daily).day,'2026-10-20')
 assert.equal(peakDay([{day:'2026-10-19',profile_views:0}]),null)
 assert.equal(peakDay([]),null)
})

test('datas em português: curta no gráfico e completa no período',()=>{
 assert.equal(dayLabel('2026-10-21'),'21/10')
 assert.equal(dateLong('2026-10-15'),'15/10/2026')
 assert.equal(dayLabel(null),'')
})

test('gráfico: escala pelo maior valor e posiciona os pontos de cima para baixo',()=>{
 const daily=[{page_views:0,profile_views:0,contacts:0},{page_views:10,profile_views:5,contacts:2}]
 assert.equal(chartMax(daily,['page_views','profile_views','contacts']),10)
 assert.equal(chartMax([],['page_views']),1)
 assert.equal(linePoints(daily,'page_views',100,50,10),'0.0,50.0 100.0,0.0')
 assert.equal(linePoints([],'page_views',100,50,10),'')
})
