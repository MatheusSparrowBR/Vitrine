import {test} from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const page=fs.readFileSync("src/DemoPage.jsx","utf8")
const css=fs.readFileSync("src/demo.css","utf8")

test("demo apresenta home, empresas do catálogo e Minha Conta sem escrita",()=>{
 assert.match(page,/CityHomePage/)
 assert.match(page,/public_business_directory/)
 assert.match(page,/\.eq\("city_id",cityRow\.id\)/)
 assert.match(page,/\["account","Minha conta"\]/)
 assert.match(page,/Experiência completa e interativa/)
 assert.match(page,/Somente visualização/)
 assert.match(page,/business_photos/)
 assert.match(page,/business_items/)
 assert.match(page,/DemoPlan/)
 assert.doesNotMatch(page,/\.insert\(/)
 assert.doesNotMatch(page,/\.update\(/)
 assert.doesNotMatch(page,/\.delete\(/)
 assert.doesNotMatch(page,/\.upsert\(/)
 assert.match(css,/\.demo-nav button\.active/)
 assert.match(css,/\.demo-gallery-grid/)
})
