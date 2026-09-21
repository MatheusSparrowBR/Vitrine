import {test} from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const page=fs.readFileSync("src/DemoPage.jsx","utf8")
const css=fs.readFileSync("src/demo.css","utf8")
const migration=fs.readFileSync("supabase/migrations/20260921223000_add_demo_public_business_directory.sql","utf8")

test("demo usa fonte anonima exclusiva e perfil sem escrita",()=>{
 assert.ok(page.includes("demo_public_business_directory"))
 assert.ok(page.includes("function DemoProfile"))
 assert.ok(page.includes('tab==="profile"'))
 assert.ok(page.includes('tab==="account"'))
 assert.ok(!page.includes(".insert("))
 assert.ok(!page.includes(".update("))
 assert.ok(!page.includes(".delete("))
 assert.ok(migration.includes("demo_public_business_directory"))
 assert.ok(migration.includes("security_invoker=false"))
 assert.ok(migration.includes("grant select on public.demo_public_business_directory to anon, authenticated"))
 assert.ok(css.includes(".demo-profile-page"))
})