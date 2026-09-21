import {test} from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const page=fs.readFileSync("src/DemoPage.jsx","utf8")
const entry=fs.readFileSync("src/app-entry.jsx","utf8")
const gate=fs.readFileSync("src/PrelaunchGate.jsx","utf8")
const css=fs.readFileSync("src/demo.css","utf8")

test("demo é rota pública, read-only e premium",()=>{
 assert.ok(entry.includes("path==='/demo'"))
 assert.ok(gate.includes("'/demo'"))
 assert.ok(page.includes("Experiência Premium"))
 assert.ok(page.includes("Somente visualização"))
 assert.ok(page.includes('demo_public_business_directory'))
 assert.ok(page.includes('tab==="account"'))
 assert.ok(page.includes("selected=useMemo"))
 assert.ok(!page.includes(".insert("))
 assert.ok(!page.includes(".update("))
 assert.ok(!page.includes(".delete("))
 assert.ok(page.includes("function DemoPlan"))
 assert.ok(css.includes(".demo-shell"))
 assert.ok(page.includes("demo-active"))
 assert.ok(css.includes("body.demo-active .vl-site-header"))
})