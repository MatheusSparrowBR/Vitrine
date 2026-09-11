import React,{useEffect,useMemo,useState}from'react'
import{createClient}from'@supabase/supabase-js'
import AdminShell from './AdminShell.jsx'
import'./admin-advertising.css'

const U=import.meta.env.VITE_SUPABASE_URL,K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,db=U&&K?createClient(U,K):null
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const dateTime=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(v)):'—'
const eventMatchesAd=(event,ad)=>event.metadata?.advertisement_id===ad.id||(event.metadata?.title===ad.title&&event.metadata?.href===ad.target_url)

export default function AdminAdvertisingPage(){
 const[s,setS]=useState({checking:true,allowed:false,session:null,ads:[],requests:[],events:[],error:''}),[range,setRange]=useState(30),[busy,setBusy]=useState(''),[note,setNote]=useState('')
 async function load(){
  if(!db){setS(x=>({...x,checking:false}));return}
  const{data:{session}}=await db.auth.getSession()
  if(!session){setS(x=>({...x,checking:false}));return}
  const{data:profile,error:profileError}=await db.from('profiles').select('role').eq('id',session.user.id).maybeSingle()
  if(profileError||profile?.role!=='admin'){setS(x=>({...x,checking:false,session,error:'Acesso restrito.'}));return}
  const start=new Date(Date.now()-range*86400000).toISOString()
  const[a,req,e]=await Promise.all([
   db.from('advertisements').select('id,business_id,city_id,title,target_url,image_url,active,priority,starts_at,ends_at,monthly_price,billing_status,billing_started_at,billing_ends_at,businesses(name),cities(name,state)').eq('placement','home_banner').order('active',{ascending:false}).order('priority',{ascending:false}).order('created_at',{ascending:false}),
   db.from('advertising_requests').select('*,businesses(id,name,city_id,cities(name,state))').order('created_at',{ascending:false}),
   db.from('analytics_events').select('event_type,metadata,created_at').gte('created_at',start)
  ])
  if(a.error||req.error||e.error){setS({checking:false,allowed:true,session,ads:[],requests:[],events:[],error:(a.error||req.error||e.error)?.message||'Falha ao carregar publicidade.'});return}
  setS({checking:false,allowed:true,session,ads:a.data||[],requests:req.data||[],events:e.data||[],error:''})
 }
 useEffect(()=>{load()},[range])
 const metrics=useMemo(()=>{const active=s.ads.filter(a=>a.active&&(!a.ends_at||new Date(a.ends_at)>=new Date())).length,paid=s.ads.filter(a=>a.billing_status==='paid'&&a.active).reduce((v,a)=>v+Number(a.monthly_price||0),0),impressions=s.events?.filter(e=>e.event_type==='banner_impression').length||0,clicks=s.events?.filter(e=>e.event_type==='banner_click').length||0,pending=s.requests.filter(r=>r.status==='pending').length;return{active,paid,impressions,clicks,pending,ctr:impressions?((clicks/impressions)*100).toFixed(1):'0.0'}},[s])
 async function updateAd(id,patch){setBusy(id);const{error}=await db.from('advertisements').update(patch).eq('id',id);if(error)setNote(error.message);else setNote('Banner atualizado.');await load();setBusy('')}
 async function updateRequest(id,status){setBusy(id);const request=s.requests.find(r=>r.id===id);if(!request){setNote('Solicitação não encontrada.');setBusy('');return}if(status==='approved'){
   const business=request.businesses
   const businessId=business?.id,cityId=business?.city_id
   if(!businessId||!cityId){setNote('A solicitação não possui empresa/cidade válidas para gerar o banner.');setBusy('');return}
   const{data:existing,error:existingError}=await db.from('advertisements').select('id').eq('business_id',businessId).eq('placement','home_banner').eq('title',request.title.trim()).maybeSingle()
   if(existingError){setNote(existingError.message);setBusy('');return}
   if(!existing){const{error:insertError}=await db.from('advertisements').insert({business_id:businessId,city_id:cityId,title:request.title.trim(),description:request.description||null,target_url:request.target_url||null,starts_at:request.desired_start_at||null,ends_at:request.desired_end_at||null,monthly_price:Number(request.monthly_budget||0),billing_status:'not_billed',active:false,placement:'home_banner',priority:0,image_url:null,image_path:null});if(insertError){setNote(insertError.message);setBusy('');return}}
 }
 const adminNote=status==='approved'?'Solicitação aprovada. Rascunho de banner criado; Abra Banners Premium para adicionar a arte e publicar quando estiver pronto.':status==='rejected'?'Solicitação rejeitada pelo administrador.':''
 const{error}=await db.from('advertising_requests').update({status,reviewed_at:new Date().toISOString(),admin_note:adminNote||null}).eq('id',id)
 if(error)setNote(error.message);else setNote(status==='approved'?'Solicitação aprovada e rascunho criado.':'Solicitação rejeitada.')
 await load();setBusy('')}
 if(s.checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!s.allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>{s.error||'Esta área é exclusiva para administradores.'}</span><a className="admin-v2-btn primary" href="/admin">Voltar</a></div></main></div>
 return <AdminShell active="advertising" title="Publicidade" description="Campanhas Premium, solicitações, faturamento e desempenho dos banners." email={s.session?.user?.email}>
  {s.error&&<div className="ad-admin-note">{s.error}</div>}{note&&<div className="ad-admin-note">{note}</div>}
  <div className="ad-admin-toolbar"><select value={range} onChange={e=>setRange(Number(e.target.value))}><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select><a className="admin-v2-btn" href="/admin/banners">Abrir editor de banners →</a></div>
  <section className="admin-v2-stats ad-admin-stats"><div className="admin-v2-card admin-v2-stat"><span>Campanhas ativas</span><strong>{metrics.active}</strong><small>banners publicados agora</small></div><div className="admin-v2-card admin-v2-stat green"><span>Receita mensal</span><strong>{money(metrics.paid)}</strong><small>somente banners marcados como pagos</small></div><div className="admin-v2-card admin-v2-stat purple"><span>Impressões</span><strong>{metrics.impressions}</strong><small>últimos {range} dias</small></div><div className="admin-v2-card admin-v2-stat amber"><span>Solicitações pendentes</span><strong>{metrics.pending}</strong><small>aguardando análise</small></div></section>
  <section className="admin-v2-grid-2"><div className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><span className="admin-v2-kicker">CAMPANHAS</span><h2>Banners Premium</h2><p>Preço, cobrança e desempenho registrados pelo anúncio.</p></div><span className="admin-v2-pill blue">CTR {metrics.ctr}%</span></div>{s.ads.length?<div className="ad-admin-list">{s.ads.map(a=>{const impressions=(s.events||[]).filter(e=>e.event_type==='banner_impression'&&eventMatchesAd(e,a)).length,clicks=(s.events||[]).filter(e=>e.event_type==='banner_click'&&eventMatchesAd(e,a)).length;return <div className="ad-admin-row" key={a.id}><div className="ad-admin-thumb">{a.image_url?<img src={a.image_url} alt=""/>:'★'}</div><div className="ad-admin-main"><strong>{a.title}</strong><small>{a.businesses?.name||'Empresa'} · {a.cities?.name||'Cidade'}{a.cities?.state?` - ${a.cities.state}`:''}</small><span>{impressions} impressões · {clicks} cliques · {impressions?((clicks/impressions)*100).toFixed(1):'0.0'}% CTR</span></div><div className="ad-admin-controls"><label>R$/mês<input type="number" min="0" step="0.01" value={a.monthly_price||0} onChange={e=>setS(x=>({...x,ads:x.ads.map(v=>v.id===a.id?{...v,monthly_price:e.target.value}:v)}))} onBlur={()=>updateAd(a.id,{monthly_price:Number(a.monthly_price)||0})}/></label><button className={`admin-v2-btn ${a.active?'':'primary'}`} disabled={busy===a.id} onClick={()=>updateAd(a.id,{active:!a.active})}>{a.active?'Pausar':'Publicar'}</button><select value={a.billing_status} onChange={e=>updateAd(a.id,{billing_status:e.target.value})}><option value="not_billed">Sem cobrança</option><option value="pending">Pendente</option><option value="paid">Pago</option><option value="overdue">Em atraso</option><option value="canceled">Cancelado</option></select></div></div>})}</div>:<div className="admin-v2-empty">Nenhum banner cadastrado.</div>}</div>
  <div className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><span className="admin-v2-kicker">LEADS COMERCIAIS</span><h2>Solicitações</h2><p>Pedidos enviados pelos anunciantes Premium.</p></div></div>{s.requests.length?<div className="ad-admin-list">{s.requests.map(r=><div className="ad-admin-request" key={r.id}><div><strong>{r.title}</strong><small>{r.businesses?.name||'Empresa'} · {r.monthly_budget?money(r.monthly_budget):'Orçamento não informado'}/mês</small><span>{r.desired_start_at?`Início: ${dateTime(r.desired_start_at)}`:'Data inicial a definir'}{r.desired_end_at?` · fim: ${dateTime(r.desired_end_at)}`:''}</span>{r.admin_note&&<small>{r.admin_note}</small>}</div><div className="ad-admin-request-actions"><span className={`admin-v2-pill ${r.status==='pending'?'amber':r.status==='approved'?'green':'red'}`}>{r.status==='pending'?'Em análise':r.status==='approved'?'Aprovada':r.status==='rejected'?'Rejeitada':'Cancelada'}</span>{r.status==='pending'&&<><button className="admin-v2-btn primary" disabled={busy===r.id} onClick={()=>updateRequest(r.id,'approved')}>Aprovar</button><button className="admin-v2-btn danger" disabled={busy===r.id} onClick={()=>updateRequest(r.id,'rejected')}>Rejeitar</button></>}</div></div>)}</div>:<div className="admin-v2-empty">Nenhuma solicitação recebida.</div>}</div></section>
 </AdminShell>
}
