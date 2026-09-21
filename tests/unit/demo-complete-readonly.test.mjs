import {test} from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const page=fs.readFileSync("src/DemoPage.jsx","utf8")
const css=fs.readFileSync("src/demo.css","utf8")

test("demo apresenta home, empresas, Minha Conta e perfil sem escrita",()=>{
 assert.ok(page.includes("CityHomePage"))
 assert.ok(page.includes("demo_public_business_directory"))
 assert.ok(page.includes('.eq("city_id",cityRow.id)'))
 assert.ok(page.includes('["account","Minha conta"]'))
 assert.ok(page.includes("Demonstração completa e interativa"))
 assert.ok(page.includes("Somente visualização"))
 assert.ok(page.includes("business_photos"))
 assert.ok(page.includes("business_items"))
 assert.ok(page.includes("DemoPlan"))
 assert.ok(!page.includes(".insert("))
 assert.ok(!page.includes(".update("))
 assert.ok(!page.includes(".delete("))
 assert.ok(!page.includes(".upsert("))
 assert.ok(css.includes(".demo-nav button.active"))
 assert.ok(css.includes(".demo-gallery-grid"))
})