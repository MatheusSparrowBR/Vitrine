export const PLAN_CODES = ['free','pro','premium']

export function getPlanLimit(features,key,fallback=0){
  const raw = features?.[`${key}_limit`] ?? features?.[key]
  if(raw === null || raw === undefined || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

export function hasPlanFeature(features,key,fallback=false){
  const value = features?.[key]
  if(value === undefined || value === null) return fallback
  if(typeof value === 'boolean') return value
  return String(value).toLowerCase() === 'true'
}

export function usagePercent(used,limit){
  const u=Math.max(0,Number(used)||0)
  const l=Number(limit)
  if(!Number.isFinite(l) || l <= 0) return l===0 ? 100 : 0
  return Math.min(100,(u/l)*100)
}

export function limitReached(used,limit){
  const l=Number(limit)
  return Number.isFinite(l) && l>=0 && Number(used||0)>=l
}

export function normalizePlan(plan){
  const code=PLAN_CODES.includes(plan?.code)?plan.code:'free'
  return {code,name:plan?.name||code,features:plan?.features||{}}
}
