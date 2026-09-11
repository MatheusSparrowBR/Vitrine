import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('backoffice hardening enables admin plan CRUD and efficient RLS',()=>{
 const migration=read('supabase/migrations/20260911130500_admin_backoffice_hardening.sql')
 for(const value of [
  'CREATE POLICY "admins insert plans"',
  'CREATE POLICY "admins update plans"',
  'CREATE POLICY "admins delete plans"',
  'owner_id = (select auth.uid())',
  '(select private.is_admin())',
  'DROP POLICY IF EXISTS "owners read own advertisements"',
  'CREATE POLICY "authenticated read ads"',
  'CREATE POLICY "authenticated read advertising requests"',
  'new.reviewed_at := now()',
  'new.reviewed_by := (select auth.uid())',
  'DROP POLICY IF EXISTS "public read active plans"',
  'CREATE POLICY "read plans"'
 ])assert.ok(migration.includes(value),`migration precisa conter ${value}`)
})

test('admin platform exposes the plan editor and business-plan assignment flows',()=>{
 const tools=read('src/admin-tools.jsx'),platform=read('src/AdminPlatformPage.jsx'),assignment=read('src/AdminPlanAssignments.jsx'),shell=read('src/AdminShell.jsx')
 assert.ok(tools.includes('function newPlan()'))
 assert.ok(tools.includes('function editPlan(row)'))
 assert.ok(tools.includes('async function savePlan(e)'))
 assert.ok(tools.includes("supabase.from('plans').update(payload).eq('id',editor.rowId)"))
 assert.ok(tools.includes("supabase.from('plans').insert(payload)"))
 assert.ok(tools.includes('async function removeSimple(table,row,label)'))
 assert.ok(tools.includes("supabase.from(table).delete().eq('id',row.id)"))
 assert.ok(platform.includes('defaultTab={tab}'))
 assert.ok(assignment.includes('admin_list_business_plans'))
 assert.ok(assignment.includes('admin_set_business_plan'))
 assert.ok(shell.includes('/admin/gestao?tab=plans'))
})

test('enterprise moderation writes review metadata through the database trigger',()=>{
 const migration=read('supabase/migrations/20260911130500_admin_backoffice_hardening.sql')
 assert.match(migration,/CREATE OR REPLACE FUNCTION public\.protect_business_moderation_fields\(\)/)
 assert.match(migration,/new\.reviewed_at := now\(\)/)
 assert.match(migration,/new\.reviewed_by := \(select auth\.uid\(\)\)/)
 assert.match(migration,/new\.status is distinct from old\.status/)
 assert.match(migration,/new\.rejection_reason is distinct from old\.rejection_reason/)
})
