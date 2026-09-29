import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('contas sem empresa ativa entram na experiência pessoal por padrão',()=>{
 const app=read('src/app-entry.jsx')
 const header=read('src/SiteHeader.jsx')
 assert.ok(app.includes('function UserProfileRoute()'))
 assert.ok(app.includes("window.location.replace('/conta')"))
 assert.ok(app.includes("supabase.from('businesses').select('status').eq('owner_id',session.user.id)"))
 assert.ok(app.includes("row.status==='active'"))
 assert.ok(app.includes("if(path==='/usuario/perfil')return <UserProfileRoute/>") )
 assert.ok(header.includes('const openAccount=async e=>'))
 assert.ok(header.includes("profile?.role==='admin'||hasActiveBusiness?'/conta':'/usuario/perfil?mode=personal'"))
 assert.ok(header.includes('onClick={openAccount}'))
})
