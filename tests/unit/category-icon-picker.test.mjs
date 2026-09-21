import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('biblioteca oficial de ícones existe e o seletor administrativo usa a mesma fonte',()=>{
 const icons=read('src/ui-icons.jsx')
 const admin=read('src/admin-tools.jsx')
 assert.match(icons,/export const ICON_CATALOG=\[/)
 for(const name of ['store','bag','shoppingCart','utensils','pizza','burger','sandwich','coffee','bread','cupcake','iceCream','dumbbell','medical','scissors','car','home','pin','calendar','grid']){
  assert.match(icons,new RegExp(`name:'${name}'`))
 }
 assert.match(admin,/ICON_CATALOG/)
 assert.match(admin,/Biblioteca oficial|BIBLIOTECA OFICIAL/)
 assert.match(admin,/Escolher ícone/)
 assert.match(admin,/admin-category-picker-modal/)
 assert.match(admin,/aria-modal="true"/)
 assert.match(admin,/setIconPickerOpen\(false\)/)
 assert.match(admin,/icon:iconKey/)
 for(const label of ['Pizzaria','Hamburgueria','Lanchonete','Cafeteria','Padaria','Doceria','Sorveteria']) assert.match(icons,new RegExp(label))
})

test('categorias públicas respeitam o ícone oficial salvo no banco',()=>{
 const home=read('src/CityHomePage.jsx')
 const catalog=read('src/ModernBusinessesPage.jsx')
 assert.match(home,/isOfficialIcon\(selected\)/)
 assert.match(home,/categoryIcon\(c\.name,c\.icon\)/)
 assert.match(catalog,/isOfficialIcon\(selected\)/)
 assert.match(catalog,/iconForCategory\(c\.name,c\.icon\)/)
})
