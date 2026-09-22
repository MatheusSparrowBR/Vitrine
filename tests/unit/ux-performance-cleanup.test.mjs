import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('Minha Conta sinaliza troca de empresa e não apresenta dados antigos sem feedback',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 const css=read('src/account-workspace.css')
 assert.match(account,/businessLoading,setBusinessLoading/)
 assert.match(account,/account-business-refresh/)
 assert.match(account,/Atualizando os dados da empresa/)
 assert.match(css,/\.account-business-refresh/)
})

test('Minha Conta conta eventos de analytics com head counts em vez de carregar o histórico inteiro',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 assert.match(account,/select\('id',\{count:'exact',head:true\}\)/)
 assert.match(account,/analyticsTypes\.map\(eventType=>db\.from\('analytics_events'\)/)
 assert.doesNotMatch(account,/db\.from\('analytics_events'\)\.select\('event_type'\)/)
})

test('Painel Admin usa contagens do banco para KPIs em vez de baixar tabelas inteiras',()=>{
 const admin=read('src/AdminHomePage.jsx')
 assert.match(admin,/select\('id',\{count:'exact',head:true\}\)/)
 assert.match(admin,/problemSubs\.count/)
 assert.doesNotMatch(admin,/db\.from\('businesses'\)\.select\('id,status'\)/)
 assert.doesNotMatch(admin,/db\.from\('promotions'\)\.select\('id,status'\)/)
 assert.doesNotMatch(admin,/db\.from\('events'\)\.select\('id'\)/)
})

test('Menus de Conta e Admin expõem estado ativo a tecnologias assistivas',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 const admin=read('src/AdminShell.jsx')
 assert.match(account,/aria-current=\{active\?'page':undefined\}/)
 assert.match(admin,/aria-current=\{active===key\?'page':undefined\}/)
})

test('Rotas críticas permanecem separadas por página e continuam com code splitting',()=>{
 const app=read('src/app-entry.jsx')
 assert.match(app,/const AccountPage=lazy\(\(\)=>import\('\.\/AccountWorkspacePage\.jsx'\)\)/)
 assert.match(app,/const AdminHomePage=lazy\(\(\)=>import\('\.\/AdminHomePage\.jsx'\)\)/)
 assert.match(app,/const CommercialAnalyticsPage=lazy\(\(\)=>import\('\.\/CommercialAnalyticsPage\.jsx'\)\)/)
})
