import React,{useEffect,useState}from'react'
import{getPlanCycleFeatureUsage,ADMIN_UNLIMITED_LIMIT}from'./plan-cycle-usage.js'
import'./account-resource-usage.css'

const PLAN_NAMES={free:'Grátis',pro:'Pro',premium:'Premium'}
const RESOURCE_COPY={photos:{label:'Mídias',icon:'▣',description:'Unidades de mídia consumidas neste ciclo.'},items:{label:'Produtos e serviços',icon:'◇',description:'Novos produtos ou serviços consumidos neste ciclo.'}}
function usagePercent(used,limit){return limit>0&&limit!==ADMIN_UNLIMITED_LIMIT?Math.min(100,Math.round((used/limit)*100)):0}
function formatDate(value){return value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeZone:'America/Sao_Paulo'}).format(new Date(value)):'—'}

export default function AccountResourceUsage({businessId,resource,used:legacyUsed=0,onState,onAction,actionLabel='Adicionar'}){
 const[usage,setUsage]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const copy=RESOURCE_COPY[resource]||RESOURCE_COPY.photos
 const usedCount=Number(usage?.used)||0,safeLimit=Number(usage?.limit)||0,unlimited=Boolean(usage?.unlimited)||safeLimit===ADMIN_UNLIMITED_LIMIT,percent=usagePercent(usedCount,safeLimit),reached=safeLimit===0||(safeLimit>0&&!unlimited&&usedCount>=safeLimit),remaining=!unlimited&&safeLimit>0?Math.max(0,safeLimit-usedCount):null,planName=PLAN_NAMES[usage?.planCode]||'Plano atual'
 useEffect(()=>{let live=true;(async()=>{if(!businessId){setLoading(false);return}const{usage:next,error:nextError}=await getPlanCycleFeatureUsage(businessId,resource);if(!live)return;if(nextError){setError(nextError.message||'Não foi possível carregar o consumo do ciclo.');setUsage({used:Number(legacyUsed)||0,limit:0,unlimited:false,cycleStart:null,cycleEnd:null,planCode:'free'})}else setUsage(next);setLoading(false)})();return()=>{live=false}},[businessId,resource,legacyUsed])
 useEffect(()=>{if(!usage)return;onState?.({used:usedCount,limit:safeLimit,reached,percent,unlimited,planCode:usage.planCode||'free',planName,cycleStart:usage.cycleStart||null,cycleEnd:usage.cycleEnd||null})},[usage,usedCount,safeLimit,reached,percent,unlimited,onState,planName])
 if(loading)return <section className="vl-resource-usage loading"><div className="vl-resource-skeleton"/></section>
 if(error)return <section className="vl-resource-usage reached"><div className="vl-resource-copy"><span className="account-eyebrow">CONSUMO DO CICLO</span><h2>Não foi possível carregar o consumo</h2><p>{error}</p></div></section>
 return <section className={`vl-resource-usage ${reached?'reached':''}`}>
  <div className="vl-resource-usage-main"><div className="vl-resource-ring" style={{'--usage':`${percent}%`}}><div><strong>{usedCount}</strong><span>{unlimited?'Ilimitado':`de ${safeLimit}`}</span></div></div><div className="vl-resource-copy"><span className="account-eyebrow">SEU PLANO · {planName.toUpperCase()}</span><h2>{unlimited?'Uso ilimitado para testes':reached&&safeLimit>0?`Limite de ${copy.label.toLowerCase()} do ciclo atingido`:`Uso de ${copy.label.toLowerCase()} no ciclo`}</h2><p>{unlimited?`Esta empresa está vinculada à conta administradora e não possui limite de ${copy.label.toLowerCase()} para testes.`:safeLimit>0?`${usedCount} de ${safeLimit} ${copy.label.toLowerCase()} já foram consumidos neste ciclo. Excluir, desativar ou encerrar não devolve a unidade.`:'Este recurso não está disponível no plano atual.'}</p><div className="vl-resource-progress"><i style={{width:`${percent}%`}}/></div>{usage?.cycleEnd&&!unlimited&&<small>O consumo será renovado em {formatDate(usage.cycleEnd)}.</small>}</div></div>
  <div className="vl-resource-side"><strong>{unlimited?'∞':`${percent}%`}</strong><span>{unlimited?'limite para testes':'utilizado no ciclo'}</span>{safeLimit>0&&!unlimited&&<small>{remaining} restante{remaining===1?'':'s'}</small>}{reached&&safeLimit>0&&<b>Limite atingido</b>}</div>
  {reached?<div className="vl-resource-upgrade"><div><span>🔒</span><div><strong>Quer continuar adicionando?</strong><p>Faça upgrade para aumentar o limite. O consumo já realizado neste ciclo não é apagado.</p></div></div><a href={`/planos?business_id=${encodeURIComponent(businessId)}`}>Ver planos e aumentar limite →</a></div>:<button type="button" className="vl-resource-create" onClick={onAction}>{copy.icon} {actionLabel}</button>}
 </section>
}
