import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('seção Sobre a empresa preserva quebras de linha e parágrafos da descrição',()=>{
 const page=read('src/ModernBusinessProfilePage.jsx')
 const css=read('src/modern-business-profile.css')
 assert.match(page,/className="mbp-about-description"/)
 assert.match(css,/\.mbp-about-description\{white-space:pre-wrap/)
 assert.match(css,/overflow-wrap:anywhere/)
 assert.match(css,/line-height:1\.65/)
})
