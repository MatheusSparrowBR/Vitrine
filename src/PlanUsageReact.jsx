import React,{useEffect,useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {createClient} from '@supabase/supabase-js'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null
const LABELS={photos:'Fotos/mídias',items:'Produtos/serviços',promotions:'Promoções'}
const PLAN_NAMES={free:'Grátis',pro:'Pro',premium:'Premium'}

function getLimit(features,key){const value=features?.[`${key}_limit`] ?? features?.[key];const n=Number(value);return Number.isFinite(n)&&n>=0?n:0}

function Usage({label,used,limit}){
 const percent=limit>0?Math.min(100,(used/limit)*100):100
 const reached=used>=limit
 return <div className="vl-react-usage-card"><strong>{label}</strong><span className={reached?'warn':''}>{used}/{limit}</span><div className="track"><i style={{width:`${percent}%`}}/></div>{reached&&<small>Limite atingido</small>}</div>
}

function Panel({businessId}){
 const [data,setData]=useState(null)
 const [error,setError]=useState('')
 useEffect(()=>{
  let live=true
  async function load(){
   if(!db||!businessId)return
   setError('')
   const {data:planId,error:planError}=await db.rpc('get_effective_plan_id',{p_business_id:businessId})
   if(planError||!planId){if(live)setError(planError?.message||'Não foi possível carregar o plano.');return}
   const {data:plan,error:planLoadError}=await db.from('plans').select('code,name,description,features,active').eq('id',planId).maybeSingle()
   if(planLoadError||!plan){if(live)setError(planLoadError?.message||'Plano não encontrado.');return}
   const [photos,items,promotions]=await Promise.all([
    db.from('business_photos').select('id',{count:'exact',head:true}).eq('business_id',businessId),
    db.from('business_items').select('id',{count:'exact',head:true}).eq('business_id',businessId),
    db.from('promotions').select('id',{count:'exact',head:true}).eq('business_id',businessId).in('status',['pending_review','published'])
   ])
   if(live)setData({plan,counts:{photos:photos.count||0,items:items.count||0,promotions:promotions.count||0}})
  }
  load()
  return()=>{live=false}
 },[businessId])
 const limits=useMemo(()=>data?{photos:getLimit(data.plan.features,'photos'),items:getLimit(data.plan.features,'items'),promotions:getLimit(data.plan.features,'promotions')}:null,[data])
 if(error)return <section className="vl-react-plan-panel"><strong>Plano e consumo</strong><p>Não foi possível carregar os limites agora.</p></section>
 if(!data||!limits)return <section className="vl-react-plan-panel"><strong>Seu plano e consumo</strong><p>Carregando limites…</p></section>
 const {plan,counts}=data
 return <section className="vl-react-plan-panel">
  <div className="top"><div><strong>Seu plano e consumo</strong><p>Os limites são aplicados também no banco de dados.</p></div><span className="badge">{PLAN_NAMES[plan.code]||plan.name||plan.code}</span></div>
  <div className="grid"><Usage label={LABELS.photos} used={counts.photos} limit={limits.photos}/><Usage label={LABELS.items} used={counts.items} limit={limits.items}/><Usage label={LABELS.promotions} used={counts.promotions} limit={limits.promotions}/><div className="vl-react-resource"><strong>Recursos do plano</strong><span>{plan.description||'Recursos disponíveis conforme o plano contratado.'}</span><b>{plan.code==='premium'?'👑 Premium':plan.code==='pro'?'⚡ Pro':'🔓 Grátis'}</b></div></div>
  {plan.code!=='premium'&&<button className="upgrade" onClick={()=>{history.pushState({},'', '/planos');window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})}}>Ver planos e fazer upgrade →</button>}
 </section>
}

function App(){
 const [businessId,setBusinessId]=useState(null)
 useEffect(()=>{
  if(!db)return
  let live=true
  const find=async()=>{
   const {data:{session}}=await db.auth.getSession()
   if(!session||!live)return
   const {data}=await db.from('businesses').select('id').eq('owner_id',session.user.id).order('created_at',{ascending:false}).limit(1)
   if(live)setBusinessId(data?.[0]?.id||null)
  }
  find()
  const {data:auth}=db.auth.onAuthStateChange(()=>find())
  return()=>{live=false;auth.subscription.unsubscribe()}
 },[])
 if(!businessId)return null
 return <Panel businessId={businessId}/>
}

function mount(){
 const host=document.querySelector('.owner-layout')
 if(!host||host.dataset.planReactMounted==='true')return
 let mountPoint=host.querySelector('#vl-plan-react-root')
 if(!mountPoint){mountPoint=document.createElement('div');mountPoint.id='vl-plan-react-root';mountPoint.style.display='contents';host.prepend(mountPoint)}
 host.dataset.planReactMounted='true'
 createRoot(mountPoint).render(<App/>)
}

let tries=0
function boot(){mount();if(!document.querySelector('#vl-plan-react-root')&&tries++<30)setTimeout(boot,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot()
