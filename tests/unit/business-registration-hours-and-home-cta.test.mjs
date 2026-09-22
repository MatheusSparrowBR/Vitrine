import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const registration=fs.readFileSync('src/BusinessRegistrationPage.jsx','utf8')
const hours=fs.readFileSync('src/business-hours.css','utf8')
const home=fs.readFileSync('src/public-home.css','utf8')

test('cadastro carrega o CSS do editor de horarios e usa estrutura do componente',()=>{
 assert.ok(registration.includes("import './business-hours.css'"))
 assert.ok(registration.includes('<BusinessHoursEditor'))
 assert.ok(hours.includes('.business-registration-card .hours-editor'))
 assert.ok(hours.includes('.hours-row{display:grid'))
 assert.ok(hours.includes('.hours-closed'))
})

test('CTA de empresas da Home mantém texto legível e contraste',()=>{
 assert.ok(home.includes('.lvp-business-cta-button'))
 assert.ok(home.includes('color:#09294d!important'))
 assert.ok(home.includes('background:#fff!important'))
})