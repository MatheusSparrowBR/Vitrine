import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {validateJobDraft,localDateTimeToISO,isJobCurrent,jobWhatsappUrl,jobTypeLabel} from '../../src/job-utils.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

const NOW=Date.parse('2026-10-13T12:00:00-03:00')
const draft=overrides=>({title:'Atendente de balcão',description:'Atendimento e caixa.',employment_type:'efetivo',starts_at:'2026-10-13T08:00',ends_at:'2026-11-13T18:00',...overrides})

test('valida uma vaga completa sem erro',()=>{
 assert.equal(validateJobDraft(draft(),NOW),'')
})

test('recusa título curto, tipo desconhecido e datas inválidas',()=>{
 assert.match(validateJobDraft(draft({title:'Ab'}),NOW),/mínimo de 3/)
 assert.match(validateJobDraft(draft({employment_type:'chefe'}),NOW),/tipo de contrato/)
 assert.match(validateJobDraft(draft({starts_at:''}),NOW),/data de início/)
 assert.match(validateJobDraft(draft({starts_at:'2026-09-30T08:00',ends_at:'2026-10-01T10:00'}),NOW),/já passou/)
 assert.match(validateJobDraft(draft({ends_at:'2026-10-13T07:00'}),NOW),/depois do início/)
})

test('datetime-local de São Paulo vira ISO com fuso -03:00',()=>{
 assert.equal(localDateTimeToISO('2026-10-13T08:00'),'2026-10-13T11:00:00.000Z')
 assert.equal(localDateTimeToISO('data-ruim'),null)
})

test('vaga só aparece como atual dentro do período e publicada',()=>{
 const base={status:'published',starts_at:'2026-10-13T11:00:00.000Z',ends_at:'2026-11-13T21:00:00.000Z'}
 assert.equal(isJobCurrent(base,NOW),true)
 assert.equal(isJobCurrent({...base,status:'paused'},NOW),false)
 assert.equal(isJobCurrent({...base,ends_at:'2026-10-13T10:00:00.000Z'},NOW),false)
 assert.equal(isJobCurrent({...base,starts_at:'2026-10-20T11:00:00.000Z'},NOW),false)
})

test('link do WhatsApp usa o número da empresa e uma mensagem sobre a vaga',()=>{
 const url=jobWhatsappUrl('(48) 99999-1234','Atendente de balcão')
 assert.match(url,/^https:\/\/wa\.me\/5548999991234\?text=/)
 assert.match(url,/Atendente%20de%20balc%C3%A3o/)
 assert.equal(jobWhatsappUrl('',"x"),'')
 assert.equal(jobWhatsappUrl('123','x'),'')
})

test('rótulos de contrato cobrem os tipos e têm fallback',()=>{
 assert.equal(jobTypeLabel('estagio'),'Estágio')
 assert.equal(jobTypeLabel('xyz'),'Vaga')
})

test('migração limita a vaga aos planos com job_postings, no servidor',()=>{
 const migration=read('supabase/migrations/20261013120000_create_job_postings.sql')
 assert.match(migration,/create or replace function public\.business_plan_allows_jobs/)
 assert.match(migration,/p\.features ->> 'job_postings'/)
 assert.match(migration,/public\.business_plan_allows_jobs\(business_id\)/)
 assert.match(migration,/status <> 'published' or public\.business_plan_allows_jobs\(business_id\)/)
 assert.match(migration,/update public\.plans/)
 assert.match(migration,/where code in \('pro', 'premium'\)/)
 assert.match(migration,/enable row level security/)
})

test('denúncias só podem ser criadas por usuário logado e lidas pelo admin',()=>{
 const migration=read('supabase/migrations/20261013120000_create_job_postings.sql')
 assert.match(migration,/create policy "users report job postings"[\s\S]*?to authenticated/)
 assert.match(migration,/create policy "admins read job reports"[\s\S]*?using \(public\.is_admin\(\)\)/)
})

test('telas de vaga estão ligadas no perfil, no painel do dono, no admin e nos planos',()=>{
 assert.match(read('src/ModernBusinessProfilePage.jsx'),/<BusinessJobs businessId=\{business\.id\}/)
 assert.match(read('src/AccountWorkspacePage.jsx'),/section==='jobs'&&<OwnerJobsSection/)
 assert.match(read('src/AdminPlatformPage.jsx'),/tab==='jobs'\?<AdminJobsPage/)
 assert.match(read('src/AdminShell.jsx'),/\['jobs','Vagas','briefcase'/)
 assert.match(read('src/BillingPlansPage.jsx'),/job_postings:true/)
})
