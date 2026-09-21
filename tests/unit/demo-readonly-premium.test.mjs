import {test} from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const page=fs.readFileSync("src/DemoPage.jsx","utf8")
const entry=fs.readFileSync("src/app-entry.jsx","utf8")
const gate=fs.readFileSync("src/PrelaunchGate.jsx","utf8")
const css=fs.readFileSync("src/demo.css","utf8")

test("demo é rota pública, read-only e premium",()=>{
 assert.match(entry,/path===["']\/demo["']/)
 assert.match(gate,/["']\/demo["']/)
 assert.match(page,/Experiência Premium/)
 assert.match(page,/Somente visualização/)
 assert.match(page,/public_business_directory/)
 assert.match(page,/section==="account"/)
 assert.match(page,/function DemoPlan/)
 assert.match(css,/\.demo-shell/)
})