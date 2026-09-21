import {test} from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const page=fs.readFileSync("src/DemoPage.jsx","utf8")
const css=fs.readFileSync("src/demo.css","utf8")
const migration=fs.readFileSync("supabase/migrations/20260921223000_add_demo_public_business_directory.sql","utf8")

test("demo usa uma fonte anonima exclusiva e não escreve no banco",()=>{
 assert.match(page,/demo_public_business_directory/)
 assert.match(page,/function DemoProfile/)
 assert.match(page,/tab==="profile"/)
 assert.match(page,/tab==="account"/)
 assert.doesNotMatch(page,/\\.insert\\(/)
 assert.doesNotMatch(page,/\\.update\\(/)
 assert.doesNotMatch(page,/\\.delete\\(/)
 assert.match(migration,/demo_public_business_directory/)
 assert.match(migration,/security_invoker=false/)
 assert.match(migration,/grant select on public\\.demo_public_business_directory to anon, authenticated/i)
 assert.match(css,/\\.demo-profile-page/)
})