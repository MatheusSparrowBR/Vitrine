import React from 'react'

export const PLAN_LABELS={free:'Grátis',pro:'Pro',premium:'Premium'}
export const LIMIT_LABELS={photos:'Fotos/mídias',items:'Produtos/serviços',promotions:'Promoções',ai_posts:'Gerações com IA'}
export function getPlanFeature(features,key,defaultValue=false){return features?.[key] ?? defaultValue}
export function getPlanLimit(features,key,fallback=0){const value=features?.[`${key}_limit`] ?? features?.[key];const n=Number(value);return Number.isFinite(n)?n:fallback}
export function PlanBadge({code='free'}){return <span className={`plan-badge plan-${code}`}>{PLAN_LABELS[code]||code}</span>}
export function UsageMeter({label,used,limit,upgradeLabel='Fazer upgrade',onUpgrade}){const finite=Number.isFinite(Number(limit))&&Number(limit)>=0;const n=Math.max(0,Number(used)||0);const max=finite?Number(limit):null;const percent=max===null?0:max===0?100:Math.min(100,(n/max)*100);const blocked=max!==null&&n>=max;return <div className={`plan-usage ${blocked?'is-limit':''}`}><div className="plan-usage-head"><strong>{label}</strong><span>{max===null?'Ilimitado':`${n}/${max}`}</span></div>{max!==null&&<div className="plan-usage-track"><span style={{width:`${percent}%`}}/></div>}{blocked&&onUpgrade&&<button className="plan-upgrade" onClick={onUpgrade}>{upgradeLabel} →</button>}</div>}
export function FeatureGate({enabled,children,onUpgrade,label='Este recurso está disponível em um plano superior.'}){if(enabled)return children;return <div className="plan-feature-locked"><span>🔒</span><div><strong>Recurso bloqueado pelo plano</strong><p>{label}</p>{onUpgrade&&<button className="plan-upgrade" onClick={onUpgrade}>Fazer upgrade →</button>}</div></div>}
