import {test} from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const page=fs.readFileSync("src/DemoPage.jsx","utf8")
const css=fs.readFileSync("src/demo.css","utf8")

test("demo mantém paridade visual do desempenho e perfil sem alterar o main",()=>{
 assert.ok(page.includes("commercial-analytics-page demo-commercial-analytics"))
 assert.ok(page.includes("DESEMPENHO COMERCIAL"))
 assert.ok(page.includes("ESTATÍSTICAS AVANÇADAS"))
 assert.ok(page.includes("function DemoProfile"))
 assert.ok(page.includes("mbp-sidebar"))
 assert.ok(page.includes("mbp-tabs"))
 assert.ok(page.includes("Horário de funcionamento"))
 assert.ok(page.includes("Onde estamos"))
 assert.ok(page.includes("modern-business-profile.css"))
 assert.ok(page.includes("modern-business-profile-refinement.css"))
 assert.ok(page.includes("commercial-analytics.css"))
 assert.ok(css.includes(".demo-commercial-analytics"))
 assert.ok(css.includes(".demo-profile-page .mbp-sidebar"))
})