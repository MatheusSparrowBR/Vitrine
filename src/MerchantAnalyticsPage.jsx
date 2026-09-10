import React,{useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {hasPlanFeature} from './phase2-rules.js'
import './analytics.css'

const U=import.meta.env.VITE_SUPABASE_URL,KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,db=U&&KEY?createClient(U,KEY):null
const EMPTY={profile_view:0,whatsapp_click:0,instagram_click:0,website_click:0,business_click:0,promotion_click:0,event_click:0,category_click:0,gallery_open:0,share_click:0,save_click:0,banner_impression:0,banner_click:0}
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const RANGE_OPTIONS=[{value:7,label:'7 dias'},{value:30,label:'30 dias'},{value:90,label:'90 dias'}]
const statusLabel={active:'Ativa',pending:'Em análise',suspended:'Suspensa',rejected:'Rejeitada'}

export default function MerchantAnalyticsPage(){
 const[state,setState]=useState({checking:true,session:null,businesses:[],businessId:'',events:[],plan:null,error:''})
 const[range,setRange]=useState(30)

 useEffect(()=>{let live=true;(async()=>{
  if(!db){setState(x=>({...x,checking:false}));return}
  const{data:{session}}=await db.auth.getSession()
  if(!live)return
  if(!session){setState(x=>({...x,checking:false}));return}
  const{data:businesses,error}=await db.from('businesses').select('id,name,status,city_id').eq('owner_id',session.user.id).order('created_at',{ascending:false})
  if(!live)return
  if(error){setState({checking:false,session,businesses:[],businessId:'',events:[],plan:null,error:error.message});return}
  const id=businesses?.[0]?.id||''
  setState({checking:false,session,businesses:businesses||[],businessId:id,events:[],plan:null,error:''})
 })();return()=>{live=false}},[])

 useEffect(()=>{let live=true;(async()=>{
  if(!db||!state.session||!state.businessId)return
  setState(x=>({...x,events:[],plan:null,error:''}))
  const[{data:planId,error:planError},{data:business,error:businessError}]=await Promise.all([
    db.rpc('get_effective_plan_id',{p_business_id:state.businessId}),
    db.from('businesses').select('id,name,status').eq('id',state.businessId).eq('owner_id',state.session.user.id).maybeSingle()
  ])
  if(!live)return
  if(planError||businessError||!business){setState(x=>({...x,error:(planError||businessError)?.message||'Não foi possível carregar a empresa.'}));return}
  const{data:plan,error:planLoadError}=await db.from('plans').select('id,code,name,description,features,price_monthly,price_yearly').eq('id',planId).maybeSingle()
  if(!live)return
  if(planLoadError||!plan){setState(x=>({...x,error:planLoadError?.message||'Plano não encontrado.'}));return}
  if(!hasPlanFeature(plan.features,'analytics',false)){setState(x=>({...x,plan,business,error:''}));return}
  const d=new Date();d.setDate(d.getDate()-(range-1));d.setHours(0,0,0,0)
  const{data:events,error:eventError}=await db.from('analytics_events').select('event_type,created_at,metadata').eq('business_id',state.businessId).gte('created_at',d.toISOString()).order('created_at',{ascending:true})
  if(!live)return
  setState(x=>({...x,plan,business,events:events||[],error:eventError?.message||''}))
 })();return()=>{live=false}},[state.session?.user?.id,state.businessId,range])

 const counts=useMemo(()=>{const x={...EMPTY};state.events.forEach(e=>{if(Object.prototype.hasOwnProperty.call(x,e.event_type))x[e.event_type]+=1});return x},[state.events])
 const conversion=counts.profile_view?((counts.whatsapp_click/counts.profile_view)*100).toFixed(1):'0.0'
 const daily=useMemo(()=>{
   const out=[]
   for(let i=range-1;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);out.push({k,label:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),v:state.events.filter(e=>e.created_at?.slice(0,10)===k).length})}
   const max=Math.max(1,...out.map(x=>x.v));return{out,max}
 },[state.events,range])
 const selectedBusiness=state.businesses.find(b=>b.id===state.businessId)

 if(state.checking)return <div className="analytics-page"><div className="analytics-empty">Verificando sua conta…</div></div>
 if(!state.session)return <div className="analytics-page"><div className="analytics-empty"><h1>Entre para acompanhar seu desempenho</h1><a href="/login?next=%2Fconta%2Fanalytics">Entrar</a></div></div>
 if(!state.businesses.length)return <div className="analytics-page"><div className="analytics-empty"><strong>Você ainda não possui uma empresa cadastrada.</strong><a href="/conta?new=business">Cadastrar empresa</a></div></div>
 if(state.error)return <div className="analytics-page"><div className="analytics-empty"><h1>Não foi possível carregar o desempenho</h1><p>{state.error}</p><a href="/conta">Voltar para minha conta</a></div></div>
 if(state.plan&&!hasPlanFeature(state.plan.features,'analytics',false))return <main className="analytics-page"><div className="analytics-shell"><div className="vl-phase2-analytics-lock"><div className="icon">⌁</div><span className="plan-name">Plano {state.plan.name||'Grátis'}</span><h2>Analytics é um recurso do Pro</h2><p>Acompanhe visualizações, WhatsApp, Instagram, site, promoções e conversões com métricas comerciais completas.</p><a href={`/planos?business_id=${encodeURIComponent(state.businessId)}`}>Conhecer planos →</a></div></div></main>

 return <main className="analytics-page"><div className="analytics-shell">
  <div className="analytics-head"><div><span>DESEMPENHO DA EMPRESA</span><h1>Analytics</h1><p>Veja como as pessoas encontram, exploram e entram em contato com seu negócio.</p></div><div className="analytics-head-actions"><a href="/conta">← Minha conta</a><select value={state.businessId} onChange={e=>setState(x=>({...x,businessId:e.target.value,events:[]}))} aria-label="Empresa analisada">{state.businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select value={range} onChange={e=>setRange(Number(e.target.value))} aria-label="Período"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select><span className="analytics-plan-badge">Plano {state.plan?.name||'Pro'}</span></div></div>
  <section className="analytics-kpis"><K title="Visualizações" value={counts.profile_view} note={`perfil · ${range} dias`}/><K title="WhatsApp" value={counts.whatsapp_click} note="contatos iniciados" c="green"/><K title="Instagram" value={counts.instagram_click} note="visitas geradas" c="purple"/><K title="Conversão" value={`${conversion}%`} note="visitas → WhatsApp" c="amber"/></section>
  <section className="analytics-grid"><div className="analytics-card"><div className="analytics-card-head"><div><span>TRÁFEGO</span><h2>Atividade diária</h2><p>{state.events.length} interações registradas no período.</p></div><strong>{state.events.length}</strong></div><div className="analytics-chart">{daily.out.map(x=><div className="analytics-bar-wrap" key={x.k} title={`${x.label}: ${x.v}`}><i style={{height:`${Math.max(4,x.v/daily.max*100)}%`}}/><small>{x.label}</small></div>)}</div></div><div className="analytics-card"><div className="analytics-card-head"><div><span>AÇÕES</span><h2>Onde o cliente clicou</h2><p>Intenções registradas no perfil.</p></div></div><div className="analytics-action-list"><Row label="WhatsApp" value={counts.whatsapp_click}/><Row label="Instagram" value={counts.instagram_click}/><Row label="Site" value={counts.website_click}/><Row label="Galeria" value={counts.gallery_open}/><Row label="Promoções" value={counts.promotion_click}/><Row label="Eventos" value={counts.event_click}/></div></div></section>
  <section className="analytics-card"><div className="analytics-card-head"><div><span>PUBLICIDADE</span><h2>Banner Premium</h2><p>Impressões e cliques registrados para banners exibidos no catálogo.</p></div></div><div className="analytics-kpis analytics-kpis-compact"><K title="Impressões" value={counts.banner_impression} note="banners exibidos"/><K title="Cliques" value={counts.banner_click} note="banners abertos" c="green"/><K title="CTR" value={`${counts.banner_impression?((counts.banner_click/counts.banner_impression)*100).toFixed(1):'0.0'}%`} note="cliques ÷ impressões" c="amber"/></div></section>
  <section className="analytics-card"><div className="analytics-card-head"><div><span>INTERPRETAÇÃO</span><h2>Como melhorar</h2><p>Use estes sinais para fortalecer sua presença no catálogo.</p></div></div><div className="analytics-tips"><div><strong>Fotos e capa</strong><small>Mantenha logo, capa e galeria atualizadas para comunicar melhor o negócio.</small></div><div><strong>WhatsApp em destaque</strong><small>{counts.whatsapp_click?`Você recebeu ${counts.whatsapp_click} cliques no período.`:'Ainda não houve cliques registrados no WhatsApp neste período.'}</small></div><div><strong>Conversão</strong><small>{selectedBusiness?.status==='active'?`Sua taxa atual de visita para WhatsApp é ${conversion}%.`:`O perfil está ${statusLabel[selectedBusiness?.status]||'em revisão'} e pode ter alcance público limitado.`}</small></div></div></section>
 </div></main>
}
function K({title,value,note,c=''}){return <div className={`analytics-kpi ${c}`}><span>{title}</span><strong>{value}</strong><small>{note}</small></div>}
function Row({label,value}){return <div className="analytics-row"><span>{label}</span><strong>{value}</strong></div>}
