import React,{useEffect,useState}from'react'
import{createClient}from'@supabase/supabase-js'
import'./account-resource-usage.css'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null
const PLAN_NAMES={free:'Grátis',pro:'Pro',premium:'Premium'}
const RESOURCE_COPY={photos:{label:'Mídias',icon:'▣',description:'Arquivos da galeria da sua empresa.'},items:{label:'Produtos e serviços',icon:'◇',description:'Itens ativos exibidos no perfil da empresa.'}}

function getLimit(features,key){const value=features?.[`${key}_limit`]??features?.[key];const n=Number(value);return Number.isFinite(n)&&n>=0?n:0}
function usagePercent(used,limit){return limit>0?Math.min(100,Math.round((used/limit)*100)):0}

export default function AccountResourceUsage({businessId,resource,used,onState,onAction,actionLabel='Adicionar'}){
 const[plan,setPlan]=useState(null),[limit,setLimit]=useState(null),[loading,setLoading]=useState(true)
 const copy=RESOURCE_COPY[resource]||RESOURCE_COPY.photos
 useEffect(()=>{let live=true;(async()=>{if(!db||!businessId){setLoading(false);return}const{data:id,error:idError}=await db.rpc('get_effective_plan_id',{p_business_id:businessId});if(idError||!id){if(live){setLimit(0);setLoading(false)}}else{const{data,error}=await db.from('plans').select('code,name,features,active').eq('id',id).maybeSingle();if(live){if(!error&&data){setPlan(data);setLimit(getLimit(data.features,resource))}else setLimit(0);setLoading(false)}}})();return()=>{live=false}},[businessId,resource])
 const safeLimit=limit==null?0:limit
 const reached=safeLimit>0?used>=safeLimit:true
 const percent=safeLimit>0?usagePercent(used,safeLimit):0
 useEffect(()=>{onState?.({limit:safeLimit,reached,percent,planCode:plan?.code||'free',planName:PLAN_NAMES[plan?.code]||plan?.name||'Grátis'})},[safeLimit,reached,percent,plan,onState])
 if(loading)return <section className="vl-resource-usage loading"><div className="vl-resource-skeleton"/></section>
 const planName=PLAN_NAMES[plan?.code]||plan?.name||'Grátis'
 const remaining=safeLimit>0?Math.max(0,safeLimit-used):0
 return <section className={`vl-resource-usage ${reached?'reached':''}`}>
  <div className="vl-resource-usage-main">
   <div className="vl-resource-ring" style={{'--usage':`${percent}%`}}><div><strong>{used}</strong><span>de {safeLimit}</span></div></div>
   <div className="vl-resource-copy"><span className="account-eyebrow">SEU PLANO · {planName.toUpperCase()}</span><h2>{reached?`Limite de ${copy.label.toLowerCase()} atingido`:`Uso de ${copy.label.toLowerCase()}`}</h2><p>{reached?`Você já utiliza ${used} de ${safeLimit} ${copy.label.toLowerCase()} permitidos pelo seu plano.`:`Você está usando ${used} de ${safeLimit} ${copy.label.toLowerCase()} disponíveis no seu plano.`}</p><div className="vl-resource-progress"><i style={{width:`${percent}%`}}/></div></div>
  </div>
  <div className="vl-resource-side"><strong>{percent}%</strong><span>utilizado</span>{safeLimit>0&&<small>{remaining} restante{remaining===1?'':'s'}</small>}{reached&&<b>Limite atingido</b>}</div>
  {reached?<div className="vl-resource-upgrade"><div><span>🔒</span><div><strong>Quer continuar adicionando?</strong><p>Faça upgrade do plano para aumentar o limite de {copy.label.toLowerCase()}.</p></div></div><a href={`/planos?business_id=${encodeURIComponent(businessId)}`}>Ver planos e aumentar limite →</a></div>:<button type="button" className="vl-resource-create" onClick={onAction}>{copy.icon} {actionLabel}</button>}
 </section>
}
