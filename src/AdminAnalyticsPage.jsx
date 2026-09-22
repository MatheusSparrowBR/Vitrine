import React,{useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import AdminShell from './AdminShell.jsx'
import './admin-analytics.css'

const U=import.meta.env.VITE_SUPABASE_URL,KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,db=U&&KEY?createClient(U,KEY):null
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const fmt=v=>Number(v||0).toLocaleString('pt-BR')
const pct=(value,total)=>total?((Number(value||0)/Number(total||0))*100).toFixed(1):'0.0'
const delta=(current,previous)=>{
 const c=Number(current||0),p=Number(previous||0)
 if(!p)return null
 const d=((c-p)/p)*100
 return (d>0?'+':'')+d.toFixed(1)+'%'
}
const deltaClass=(current,previous)=>{
 const c=Number(current||0),p=Number(previous||0)
 return c>p?'positive':c<p?'negative':'neutral'
}
const eventCount=(events,type)=>events.reduce((sum,e)=>sum+(e.event_type===type?1:0),0)
const contactsFrom=events=>eventCount(events,'whatsapp_click')+eventCount(events,'instagram_click')+eventCount(events,'website_click')
const dateKey=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date(value))

export default function AdminAnalyticsPage(){
 const[s,setS]=useState({checking:true,allowed:false,session:null,events:[],previousEvents:[],businesses:[],plans:[],subs:[],range:30,error:''})
 const[range,setRange]=useState(30)

 useEffect(()=>{let live=true;(async()=>{
  if(!db){setS(x=>({...x,checking:false,error:'Supabase não está configurado.'}));return}
  const{data:{session}}=await db.auth.getSession()
  if(!live)return
  if(!session){setS(x=>({...x,checking:false}));return}
  const{data:p,error:pe}=await db.from('profiles').select('role').eq('id',session.user.id).maybeSingle()
  if(!live)return
  if(pe||p?.role!=='admin'){setS(x=>({...x,checking:false,session}));return}
  setS(x=>({...x,checking:false,allowed:true,session}))
 })();return()=>{live=false}},[])

 useEffect(()=>{let live=true;(async()=>{
  if(!db||!s.allowed||!s.session)return
  const now=new Date()
  const currentStart=new Date(now);currentStart.setDate(currentStart.getDate()-range)
  const previousStart=new Date(currentStart);previousStart.setDate(previousStart.getDate()-range)
  const{data:events,error:ee}=await db.from('analytics_events').select('event_type,business_id,created_at').gte('created_at',previousStart.toISOString()).lt('created_at',now.toISOString())
  const[b,pl,sub]=await Promise.all([
   db.from('businesses').select('id,name,status'),
   db.from('plans').select('id,code,name,price_monthly,price_yearly').eq('active',true),
   db.from('subscriptions').select('id,business_id,plan_id,status,billing_interval').in('status',['active','trialing'])
  ])
  if(!live)return
  const allEvents=events||[]
  const currentEvents=allEvents.filter(e=>new Date(e.created_at)>=currentStart)
  const previousEvents=allEvents.filter(e=>new Date(e.created_at)<currentStart)
  if(ee||b.error||pl.error||sub.error){setS(x=>({...x,events:currentEvents,previousEvents,businesses:b.data||[],plans:pl.data||[],subs:sub.data||[],range,error:(ee||b.error||pl.error||sub.error)?.message||'Não foi possível carregar os analytics.'}));return}
  setS(x=>({...x,events:currentEvents,previousEvents,businesses:b.data||[],plans:pl.data||[],subs:sub.data||[],range,error:''}))
 })();return()=>{live=false}},[s.allowed,s.session?.user?.id,range])

 const m=useMemo(()=>{
  const views=eventCount(s.events,'profile_view')
  const wa=eventCount(s.events,'whatsapp_click')
  const ig=eventCount(s.events,'instagram_click')
  const web=eventCount(s.events,'website_click')
  const gallery=eventCount(s.events,'gallery_open')
  const promotions=eventCount(s.events,'promotion_click')
  const directions=eventCount(s.events,'directions_click')
  const shares=eventCount(s.events,'share_click')
  const total=s.events.length
  const contacts=wa+ig+web
  const previousViews=eventCount(s.previousEvents,'profile_view')
  const previousContacts=contactsFrom(s.previousEvents)
  const pm=new Map(s.plans.map(p=>[p.id,p]))
  const mrr=s.subs.reduce((value,x)=>{
   const plan=pm.get(x.plan_id)
   return value+(x.billing_interval==='yearly'?Number(plan?.price_yearly||0)/12:Number(plan?.price_monthly||0))
  },0)
  return{views,wa,ig,web,gallery,promotions,directions,shares,total,contacts,previousViews,previousContacts,active:s.businesses.filter(b=>b.status==='active').length,mrr}
 },[s])

 const top=useMemo(()=>{
  const names=new Map(s.businesses.map(b=>[b.id,b.name]))
  const grouped={}
  s.events.forEach(e=>{
   if(!e.business_id)return
   const row=grouped[e.business_id]||{id:e.business_id,name:names.get(e.business_id)||'Empresa',events:0,views:0,contacts:0}
   row.events+=1
   if(e.event_type==='profile_view')row.views+=1
   if(['whatsapp_click','instagram_click','website_click'].includes(e.event_type))row.contacts+=1
   grouped[e.business_id]=row
  })
  return Object.values(grouped).sort((a,b)=>b.events-a.events).slice(0,6)
 },[s.events,s.businesses])

 const days=useMemo(()=>{
  const end=new Date()
  end.setHours(0,0,0,0)
  const items=[]
  for(let i=range-1;i>=0;i--){
   const d=new Date(end);d.setDate(d.getDate()-i)
   const key=dateKey(d)
   const total=s.events.filter(e=>dateKey(e.created_at)===key).length
   const label=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Sao_Paulo'}).format(d)
   items.push({key,label,value:total})
  }
  const max=Math.max(1,...items.map(x=>x.value))
  return{items,max}
 },[s.events,range])

 const summary=useMemo(()=>{
  const peak=days.items.reduce((best,row)=>row.value>best.value?row:best,{value:0,label:'—'})
  return{peak,topBusiness:top[0]?.name||'—',viewDelta:delta(m.views,m.previousViews),contactDelta:delta(m.contacts,m.previousContacts)}
 },[m,days.items,top])

 const periodStart=new Date();periodStart.setDate(periodStart.getDate()-range)
 const periodEnd=new Date()
 const formatPeriod=v=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Sao_Paulo'}).format(v)
 const periodText=formatPeriod(periodStart)+' → '+formatPeriod(periodEnd)

 if(s.checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!s.allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Esta área é exclusiva para administradores.</span><a className="admin-v2-btn primary" href="/admin">Voltar ao admin</a></div></main></div>
 if(s.error)return <AdminShell active="analytics" title="Analytics" description="Descoberta, contatos, desempenho comercial e receita estimada." email={s.session?.user?.email}><div className="admin-v2-card admin-v2-empty"><strong>Não foi possível carregar os analytics.</strong><span>{s.error}</span></div></AdminShell>

 return <AdminShell active="analytics" title="Analytics" description="Descoberta, contatos, desempenho comercial e receita estimada." email={s.session?.user?.email}>
   <div className="aa-toolbar">
    <div><span className="admin-v2-kicker">PERÍODO ANALISADO</span><strong>{periodText}</strong><small>Compare desempenho recente com o período imediatamente anterior.</small></div>
    <label>Período<select value={range} onChange={e=>setRange(Number(e.target.value))} aria-label="Período dos analytics"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
   </div>

   <section className="aa-kpis">
    <K label="Visualizações" v={fmt(m.views)} n={range+' dias'} trend={summary.viewDelta} trendClass={deltaClass(m.views,m.previousViews)}/>
    <K label="Contatos" v={fmt(m.contacts)} n="WhatsApp + Instagram + site" c="green" trend={summary.contactDelta} trendClass={deltaClass(m.contacts,m.previousContacts)}/>
    <K label="Taxa de contato" v={pct(m.contacts,m.views)+'%'} n="contatos ÷ visualizações" c="purple"/>
    <K label="MRR estimado" v={money(m.mrr)} n={s.subs.length+' assinatura(s) ativa(s)'} c="amber"/>
   </section>

   <section className="aa-insight">
    <div className="aa-insight-main"><div className="aa-insight-icon">↗</div><div><span>RESUMO EXECUTIVO</span><h2>O que aconteceu no período?</h2><p>{m.views?'O catálogo registrou '+fmt(m.views)+' visualizações e '+fmt(m.contacts)+' contatos no período selecionado.':'Ainda não há visualizações registradas no período selecionado.'}</p></div></div>
    <div className="aa-insight-facts"><div><span>Pico de atividade</span><strong>{summary.peak.value?summary.peak.value+' eventos':'—'}</strong><small>{summary.peak.value?summary.peak.label:'Sem pico'}</small></div><div><span>Negócio mais ativo</span><strong>{summary.topBusiness}</strong><small>{top[0]?top[0].events+' eventos no período':'Sem dados'}</small></div></div>
   </section>

   <section className="aa-grid">
    <div className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">ATIVIDADE</span><h2>Atividade diária</h2><p>{fmt(m.total)} eventos capturados em {range} dias.</p></div><span className="aa-head-badge">{range}d</span></div>
     <div className="aa-chart aa-chart-tall" aria-label="Eventos por dia">{days.items.map((x,i)=><div className="aa-bar-wrap" key={x.key} title={x.label+': '+x.value+' eventos'}><span className="aa-bar" style={{height:Math.max(4,x.value/days.max*100)+'%'}}/>{(range<=30||i%Math.ceil(range/10)===0)&&<small>{x.label}</small>}</div>)}</div>
     <p className="aa-caption">Passe o cursor sobre as barras para ver o total de eventos de cada dia.</p>
    </div>
    <div className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">TOP NEGÓCIOS</span><h2>Empresas mais engajadas</h2><p>Por volume de eventos no período.</p></div></div>
     <div className="aa-ranking">{top.length?top.map((x,i)=><div className="aa-rank" key={x.id}><b>{i+1}</b><div><strong>{x.name}</strong><small>{x.events} eventos · {x.views} visualizações · {x.contacts} contatos</small></div><span>{pct(x.contacts,x.views)}%</span></div>):<div className="admin-v2-empty">Ainda não há eventos por empresa.</div>}</div>
    </div>
   </section>

   <section className="aa-two-column">
    <article className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">FUNIL DE DESCOBERTA</span><h2>De visita a contato</h2><p>Mostra quanto do tráfego do perfil virou uma ação de contato.</p></div></div>
     <div className="aa-funnel"><Funnel label="Visualizações" value={m.views} percent={100}/><Funnel label="Contatos" value={m.contacts} percent={Number(pct(m.contacts,m.views))}/></div>
     <div className="aa-funnel-note"><strong>{pct(m.contacts,m.views)}%</strong><span>dos acessos ao perfil geraram uma ação de contato registrada.</span></div>
    </article>

    <article className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">CANAIS</span><h2>Canais que geraram contatos</h2><p>Distribuição das ações de contato registradas.</p></div></div>
     <Channel label="WhatsApp" value={m.wa} total={m.contacts}/>
     <Channel label="Site" value={m.web} total={m.contacts}/>
     <Channel label="Instagram" value={m.ig} total={m.contacts}/>
     <p className="aa-caption">Os percentuais mostram a participação de cada canal dentro dos contatos registrados.</p>
    </article>
   </section>

   <section className="admin-v2-card aa-card aa-summary-card">
    <div className="aa-head"><div><span className="admin-v2-kicker">ATIVIDADE COMPLEMENTAR</span><h2>Outras ações do público</h2><p>Interações que ajudam a entender o interesse além dos contatos.</p></div></div>
    <div className="aa-action-grid"><Stat label="Aberturas da galeria" value={m.gallery}/><Stat label="Cliques em promoções" value={m.promotions}/><Stat label="Como chegar" value={m.directions}/><Stat label="Compartilhamentos" value={m.shares}/></div>
   </section>

   <section className="admin-v2-card aa-card">
    <div className="aa-operational"><div><span>Empresas ativas</span><strong>{m.active}</strong><small>Negócios disponíveis no catálogo</small></div><div><span>Assinaturas ativas</span><strong>{s.subs.length}</strong><small>Planos ativos ou em teste</small></div><div><span>MRR estimado</span><strong>{money(m.mrr)}</strong><small>Receita mensal recorrente estimada</small></div><div><span>Instagram no período</span><strong>{m.ig}</strong><small>Cliques registrados</small></div></div>
   </section>
 </AdminShell>
}

function K({label,v,n,c='',trend,trendClass='neutral'}){return <div className={'admin-v2-card aa-kpi '+c}><span>{label}</span><strong>{v}</strong><small>{n}</small>{trend&&<em className={'aa-kpi-trend '+trendClass}>{trend} vs. período anterior</em>}</div>}
function Funnel({label,value,percent}){return <div className="aa-funnel-row"><div><strong>{label}</strong><span>{fmt(value)}</span></div><div className="aa-track"><i style={{width:Math.max(percent?3:0,Math.min(100,percent))+'%'}}/></div><b>{Number(percent||0).toFixed(1)}%</b></div>}
function Channel({label,value,total}){const share=Number(pct(value,total));return <div className="aa-channel"><div><strong>{label}</strong><span>{fmt(value)+' · '+share+'%'}</span></div><div className="aa-channel-track"><i style={{width:Math.max(value?4:0,share)+'%'}}/></div></div>}
function Stat({label,value}){return <div className="aa-stat"><span>{label}</span><strong>{fmt(value)}</strong></div>}
