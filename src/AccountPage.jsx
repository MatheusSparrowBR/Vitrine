import React,{useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import PlanUsagePanel,{PLAN_USAGE_STYLE} from './PlanUsageReact.jsx'
import './core.css'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null

const emptyForm={name:'',short_description:'',description:'',phone:'',whatsapp:'',website_url:'',instagram_url:'',address:''}

export default function AccountPage(){
 const [session,setSession]=useState(null)
 const [loading,setLoading]=useState(true)
 useEffect(()=>{
  let live=true
  async function load(){
   if(!db){setLoading(false);return}
   const {data}=await db.auth.getSession()
   if(live){setSession(data.session||null);setLoading(false)}
  }
  load()
  const listener=db?.auth.onAuthStateChange((_event,next)=>setSession(next||null))
  return()=>{live=false;listener?.data?.subscription?.unsubscribe()}
 },[])
 useEffect(()=>{
  if(!db)return
  const id='vl-plan-style'
  if(document.getElementById(id))return
  const style=document.createElement('style')
  style.id=id
  style.textContent=PLAN_USAGE_STYLE
  document.head.appendChild(style)
  return()=>style.remove()
 },[])
 if(loading)return <main className="page section"><div className="empty"><h3>Carregando sua conta…</h3></div></main>
 if(!session)return <main className="page section"><div className="empty"><h1>Entre para acessar sua conta</h1><p>O painel de empresa fica disponível para usuários autenticados.</p><a className="btn primary" href="/login?next=%2Fconta">Entrar</a></div></main>
 return <OwnerDashboard session={session}/>
}

function OwnerDashboard({session}){
 const [businesses,setBusinesses]=useState([])
 const [selectedId,setSelectedId]=useState('')
 const [business,setBusiness]=useState(null)
 const [form,setForm]=useState(emptyForm)
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [message,setMessage]=useState('')

 async function loadBusinesses(){
  if(!db)return
  setLoading(true)
  const {data,error}=await db.from('businesses').select('id,name,status,short_description,description,phone,whatsapp,website_url,instagram_url,address').eq('owner_id',session.user.id).order('created_at',{ascending:false})
  if(error){setMessage(error.message);setLoading(false);return}
  const rows=data||[]
  setBusinesses(rows)
  const nextId=selectedId&&rows.some(row=>row.id===selectedId)?selectedId:(rows[0]?.id||'')
  setSelectedId(nextId)
  setLoading(false)
 }

 async function loadBusiness(id){
  if(!db||!id)return
  const {data,error}=await db.from('businesses').select('id,name,status,short_description,description,phone,whatsapp,website_url,instagram_url,address').eq('id',id).maybeSingle()
  if(error){setMessage(error.message);return}
  if(data){setBusiness(data);setForm({name:data.name||'',short_description:data.short_description||'',description:data.description||'',phone:data.phone||'',whatsapp:data.whatsapp||'',website_url:data.website_url||'',instagram_url:data.instagram_url||'',address:data.address||''})}
 }

 useEffect(()=>{loadBusinesses()},[session.user.id])
 useEffect(()=>{if(selectedId)loadBusiness(selectedId)},[selectedId])

 async function save(){
  if(!db||!business)return
  setSaving(true)
  setMessage('')
  const {data,error}=await db.from('businesses').update(form).eq('id',business.id).select('id,name,status,short_description,description,phone,whatsapp,website_url,instagram_url,address').single()
  if(error){setMessage(error.message)}
  else{setBusiness(data);setMessage('Dados atualizados com sucesso.');await loadBusinesses()}
  setSaving(false)
 }

 async function logout(){
  await db?.auth.signOut()
  location.href='/laguna'
 }

 if(loading)return <main className="page section"><div className="empty"><h3>Carregando empresas…</h3></div></main>
 if(!businesses.length)return <div className="app"><header className="topbar"><div className="nav"><a className="brand" href="/laguna"><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a><div className="nav-spacer"/><nav className="nav-actions"><a href="/planos">Planos</a><button onClick={logout}>Sair</button></nav></div></header><main className="page section"><div className="empty"><span className="section-kicker">MINHA CONTA</span><h1>Nenhuma empresa cadastrada</h1><p>Cadastre sua empresa pelo site para começar a gerenciar sua presença no VitrineLocal.</p><a className="btn primary" href="/laguna">Voltar ao site</a></div></main></div>

 return <div className="app">
  <header className="topbar"><div className="nav">
   <a className="brand" href="/laguna"><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a>
   <div className="nav-spacer"/>
   <nav className="nav-actions"><a href="/planos">Planos</a><button onClick={logout}>Sair</button></nav>
  </div></header>
  <main className="page">
   <div className="dashboard-header">
    <div><span className="section-kicker">MINHA CONTA</span><h1>Painel da empresa</h1><p>Gerencie os dados públicos da sua empresa e acompanhe o consumo do plano.</p></div>
    <a className="btn" href="/laguna">← Voltar ao site</a>
   </div>
   {message&&<div className="empty" style={{margin:'12px 0',padding:12}}>{message}</div>}
   <div className="owner-layout">
    <aside className="panel">
     <h3>Minhas empresas</h3>
     <div className="business-picker">
      {businesses.map(row=><button key={row.id} className={selectedId===row.id?'active':''} onClick={()=>setSelectedId(row.id)}><strong>{row.name}</strong><small className="muted">{row.status}</small></button>)}
     </div>
    </aside>
    {business&&<section>
     <PlanUsagePanel businessId={business.id}/>
     <div className="panel">
      <h3>Dados da empresa</h3>
      <div className="form-grid">
       <label className="field"><span>Nome</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
       <label className="field"><span>Telefone</span><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
       <label className="field full"><span>Descrição curta</span><input maxLength={180} value={form.short_description} onChange={e=>setForm({...form,short_description:e.target.value})}/></label>
       <label className="field full"><span>Descrição</span><textarea rows="6" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
       <label className="field"><span>WhatsApp</span><input value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></label>
       <label className="field"><span>Instagram</span><input value={form.instagram_url} onChange={e=>setForm({...form,instagram_url:e.target.value})}/></label>
       <label className="field"><span>Site</span><input value={form.website_url} onChange={e=>setForm({...form,website_url:e.target.value})}/></label>
       <label className="field full"><span>Endereço</span><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
      </div>
      <div className="form-actions"><button className="btn primary" disabled={saving} onClick={save}>{saving?'Salvando…':'Salvar alterações'}</button></div>
     </div>
    </section>}
   </div>
  </main>
 </div>
}
