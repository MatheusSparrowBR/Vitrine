import React,{useEffect,useMemo,useState}from'react'
import{hasPlanFeature}from'./phase2-rules.js'
import{createClient}from'@supabase/supabase-js'
import'./merchant-advertising-sales.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const BUCKET='advertising-request-art'
const MAX_BYTES=10*1024*1024
const TYPES=new Set(['image/jpeg','image/png','image/webp'])
const TZ='America/Sao_Paulo'
const empty={title:'',description:'',target_url:'',desired_start_at:'',desired_end_at:'',monthly_budget:'',creative_mode:'self'}
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const dateTime=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short',timeZone:TZ}).format(new Date(v)):'—'
const localIso=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()}
const statusLabel=r=>r.status==='rejected'?'Rejeitada':r.status==='approved'?'Aprovada':'Em análise'

export default function MerchantAdvertisingWorkspaceSection({business,onOpenPlan}){
 const[s,setS]=useState({loading:true,plan:null,requests:[],ads:[],error:''})
 const[form,setForm]=useState(empty),[open,setOpen]=useState(false),[file,setFile]=useState(null),[saving,setSaving]=useState(false),[message,setMessage]=useState({text:'',error:false})

 const notify=(text,error=false)=>setMessage({text,error})

 async function load(){
  if(!db||!business?.id)return
  setS(x=>({...x,loading:true,error:''}))
  const[{data:planId,error:pe},{data:requests,error:re},{data:ads,error:ae}]=await Promise.all([
   db.rpc('get_effective_plan_id',{p_business_id:business.id}),
   db.from('advertising_requests').select('id,business_id,requested_placement,title,description,target_url,desired_start_at,desired_end_at,monthly_budget,final_price,status,admin_note,created_at,updated_at,creative_mode,artwork_path,artwork_url,approved_at').eq('business_id',business.id).order('created_at',{ascending:false}),
   db.from('advertisements').select('id,title,active,starts_at,ends_at,monthly_price,billing_status,image_url').eq('business_id',business.id).eq('placement','home_banner').order('created_at',{ascending:false})
  ])
  if(pe||re||ae){setS(x=>({...x,loading:false,error:(pe||re||ae)?.message||'Não foi possível carregar a publicidade.'}));return}
  const{data:plan,error:pl}=await db.from('plans').select('id,code,name,features').eq('id',planId).maybeSingle()
  if(pl){setS(x=>({...x,loading:false,error:pl.message||'Não foi possível carregar o plano.'}));return}
  setS({loading:false,plan,requests:requests||[],ads:ads||[],error:''})
 }

 useEffect(()=>{load()},[business?.id])

 const premium=hasPlanFeature(s.plan?.features,'premium_ads',false)
 const activeAds=useMemo(()=>s.ads.filter(a=>a.active&&(!a.starts_at||new Date(a.starts_at)<=new Date())&&(!a.ends_at||new Date(a.ends_at)>new Date())),[s.ads])
 const pending=s.requests.filter(r=>r.status==='pending').length

 async function submit(e){
  e.preventDefault()
  if(saving)return
  setMessage({text:'',error:false})
  if(!premium)return notify('Publicidade Premium está disponível apenas no plano Premium.',true)
  if(!form.title.trim())return notify('Informe o nome da campanha.',true)
  const budget=Number(form.monthly_budget)
  if(!Number.isFinite(budget)||budget<0)return notify('Informe um orçamento mensal válido.',true)
  const start=localIso(form.desired_start_at),end=localIso(form.desired_end_at)
  if(form.desired_start_at&&!start)return notify('Data inicial inválida.',true)
  if(form.desired_end_at&&!end)return notify('Data final inválida.',true)
  if(start&&end&&new Date(end)<=new Date(start))return notify('A data final precisa ser posterior à inicial.',true)
  if(form.creative_mode==='self'&&!file)return notify('Anexe a arte do banner ou escolha a opção para o VitrineLocal criar a arte.',true)
  if(file&&(!TYPES.has(file.type)||file.size>MAX_BYTES))return notify('A arte deve ser JPG, PNG ou WebP e ter até 10 MB.',true)
  setSaving(true)
  let requestId=''
  let uploadedPath=''
  try{
   const{data:r,error}=await db.from('advertising_requests').insert({
    business_id:business.id,
    requested_placement:'home_banner',
    title:form.title.trim(),
    description:form.description.trim()||null,
    target_url:form.target_url.trim()||null,
    desired_start_at:start,
    desired_end_at:end,
    monthly_budget:budget,
    creative_mode:form.creative_mode
   }).select('id').single()
   if(error)throw error
   requestId=r.id
   if(file){
    const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp'
    uploadedPath=`${requestId}/${crypto.randomUUID()}.${ext}`
    const upload=await db.storage.from(BUCKET).upload(uploadedPath,file,{cacheControl:'31536000',contentType:file.type,upsert:false})
    if(upload.error)throw upload.error
    const url=db.storage.from(BUCKET).getPublicUrl(uploadedPath).data.publicUrl
    const{error:creativeError}=await db.rpc('owner_set_advertising_request_creative',{p_request_id:requestId,p_creative_mode:'self',p_artwork_path:uploadedPath,p_artwork_url:url})
    if(creativeError)throw creativeError
   }else{
    const{error:creativeError}=await db.rpc('owner_set_advertising_request_creative',{p_request_id:requestId,p_creative_mode:'design',p_artwork_path:null,p_artwork_url:null})
    if(creativeError)throw creativeError
   }
   notify('Solicitação enviada. A equipe vai analisar o espaço, o período e o valor final.')
   setForm(empty)
   setFile(null)
   setOpen(false)
   await load()
  }catch(err){
   if(uploadedPath)await db.storage.from(BUCKET).remove([uploadedPath]).catch(()=>{})
   notify(err.message||'Não foi possível enviar a solicitação.',true)
  }finally{setSaving(false)}
 }

 if(s.loading)return <section className="ma-sales embedded"><div className="ma-sales-empty">Carregando publicidade Premium…</div></section>

 if(s.error)return <section className="ma-sales embedded"><div className="ma-sales-banner error">Não foi possível carregar a publicidade: {s.error}</div></section>

 if(!premium)return <section className="ma-sales embedded"><div className="ma-sales-locked">
  <span>RECURSO PREMIUM</span>
  <h1>Publicidade Premium</h1>
  <p>Coloque sua empresa em destaque na Home e acompanhe impressões, cliques e CTR.</p>
  <button className="ma-sales-primary" onClick={onOpenPlan}>Conhecer o Premium →</button>
 </div></section>

 return <section className="ma-sales embedded">
  <div className="ma-sales-shell">
   {message.text&&<div className={`ma-sales-banner ${message.error?'error':'success'}`}>{message.text}</div>}
   <header className="ma-sales-head">
    <div>
     <span>PUBLICIDADE PREMIUM</span>
     <h1>Venda mais com destaque na Home</h1>
     <p>Solicite seu espaço, envie a arte e receba a análise da equipe. A ativação é manual e ficará sob controle da administração até que um novo módulo de pagamentos seja configurado.</p>
    </div>
    <div className="ma-sales-actions">
     <button className="ma-sales-primary" onClick={()=>setOpen(v=>!v)}>＋ Solicitar banner</button>
    </div>
   </header>

   <section className="ma-sales-kpis ma-sales-kpis-3">
    <Kpi label="Campanhas ativas" value={activeAds.length}/>
    <Kpi label="Solicitações" value={s.requests.length}/>
    <Kpi label="Em análise" value={pending}/>
   </section>

   {open&&<section className="ma-sales-card">
    <div className="ma-sales-card-head">
     <div><span>NOVA SOLICITAÇÃO</span><h2>Quero anunciar na Home</h2><p>O orçamento informado é uma referência. O valor final será definido na aprovação administrativa.</p></div>
     <button className="ma-sales-close" onClick={()=>setOpen(false)} aria-label="Fechar solicitação">×</button>
    </div>
    <form onSubmit={submit} className="ma-sales-form">
     <div className="ma-sales-grid">
      <label>Nome da campanha<input required maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label>Link de destino<input type="url" value={form.target_url} onChange={e=>setForm({...form,target_url:e.target.value})} placeholder="https://..."/></label>
      <label>Início desejado<input type="datetime-local" value={form.desired_start_at} onChange={e=>setForm({...form,desired_start_at:e.target.value})}/></label>
      <label>Fim desejado<input type="datetime-local" value={form.desired_end_at} onChange={e=>setForm({...form,desired_end_at:e.target.value})}/></label>
      <label>Orçamento mensal de referência<input type="number" min="0" step="0.01" value={form.monthly_budget} onChange={e=>setForm({...form,monthly_budget:e.target.value})}/></label>
      <label>Material criativo<select value={form.creative_mode} onChange={e=>{setFile(null);setForm({...form,creative_mode:e.target.value})}}><option value="self">Vou enviar minha arte</option><option value="design">Quero que o VitrineLocal crie a arte</option></select></label>
      <label className="full">Arte do banner<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} disabled={form.creative_mode!=='self'}/><small>{form.creative_mode==='self'?(file?file.name:'JPG, PNG ou WebP · até 10 MB.'):'A equipe produzirá a arte antes da publicação.'}</small></label>
      <label className="full">Descrição / objetivo<textarea rows="4" maxLength="500" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
     </div>
     <div className="ma-sales-form-foot">
      <small>Fuso horário: {TZ}. Enviar a solicitação não cria cobrança e não publica automaticamente.</small>
      <div><button type="button" className="ma-sales-secondary" onClick={()=>setOpen(false)} disabled={saving}>Cancelar</button><button className="ma-sales-primary" disabled={saving}>{saving?'Enviando…':'Enviar solicitação'}</button></div>
     </div>
    </form>
   </section>}

   <section className="ma-sales-card">
    <div className="ma-sales-card-head"><div><span>JORNADA COMERCIAL</span><h2>Como funciona</h2></div></div>
    <div className="ma-sales-steps ma-sales-steps-3">
     <Step n="1" title="Solicite" text="Escolha período, orçamento e material criativo."/>
     <Step n="2" title="Aprovação" text="Nossa equipe analisa disponibilidade e define o valor final."/>
     <Step n="3" title="Ativação manual" text="Após a aprovação, a administração agenda e publica a campanha manualmente."/>
    </div>
   </section>

   <section className="ma-sales-grid-2">
    <div className="ma-sales-card">
     <div className="ma-sales-card-head"><div><span>SEUS PEDIDOS</span><h2>Solicitações</h2></div></div>
     {s.requests.length?<div className="ma-sales-list">{s.requests.map(r=><div className="ma-sales-row" key={r.id}><div className="ma-sales-art">{r.artwork_url?<img src={r.artwork_url} alt=""/>:'★'}</div><div className="ma-sales-main"><strong>{r.title}</strong><small>{statusLabel(r)} · enviado em {dateTime(r.created_at)}</small><span>{r.final_price>0?`${money(r.final_price)}/mês`:'Valor a definir'} · {r.desired_start_at?dateTime(r.desired_start_at):'Início a definir'}</span>{r.admin_note&&<em>{r.admin_note}</em>}</div></div>)}</div>:<div className="ma-sales-empty-inline">Nenhuma solicitação enviada ainda.</div>}
    </div>
    <div className="ma-sales-card">
     <div className="ma-sales-card-head"><div><span>SUAS CAMPANHAS</span><h2>Banners</h2></div></div>
     {s.ads.length?<div className="ma-sales-list">{s.ads.map(a=><div className="ma-sales-row" key={a.id}><div className="ma-sales-art">{a.image_url?<img src={a.image_url} alt=""/>:'★'}</div><div className="ma-sales-main"><strong>{a.title}</strong><small>{a.active?'Ativo':'Aguardando início/publicação'} · {a.billing_status==='paid'?'Pago':a.billing_status==='pending'?'Pendente':a.billing_status==='overdue'?'Em atraso':'Sem cobrança'}</small><span>{money(a.monthly_price)}/mês · {a.starts_at?dateTime(a.starts_at):'sem início definido'}{a.ends_at?` · até ${dateTime(a.ends_at)}`:''}</span></div></div>)}</div>:<div className="ma-sales-empty-inline">Nenhuma campanha vinculada à empresa.</div>}
    </div>
   </section>
  </div>
 </section>
}

function Kpi({label,value}){return <div className="ma-sales-kpi"><span>{label}</span><strong>{value}</strong></div>}
function Step({n,title,text}){return <div className="ma-sales-step"><b>{n}</b><div><strong>{title}</strong><span>{text}</span></div></div>}
