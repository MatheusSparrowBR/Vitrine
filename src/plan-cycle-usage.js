import{createClient}from'@supabase/supabase-js'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null
export const ADMIN_UNLIMITED_LIMIT=2147483647

export async function getPlanCycleUsage(businessId){
 if(!db||!businessId)return{rows:[],error:new Error('Banco indisponível.')}
 const{data,error}=await db.rpc('get_business_plan_usage_cycle',{p_business_id:businessId})
 if(error)return{rows:[],error}
 return{rows:data||[],error:null}
}

export async function getPlanCycleFeatureUsage(businessId,feature){
 const{rows,error}=await getPlanCycleUsage(businessId)
 if(error)return{usage:null,error}
 const row=rows.find(item=>item.feature===feature)||null
 if(!row)return{usage:{used:0,limit:0,unlimited:false,cycleStart:null,cycleEnd:null,planCode:'free'},error:null}
 const rawLimit=Number(row.limit_count)
 const unlimited=rawLimit<0
 return{usage:{used:Number(row.used_count)||0,limit:unlimited?ADMIN_UNLIMITED_LIMIT:(Number.isFinite(rawLimit)?rawLimit:0),unlimited,cycleStart:row.cycle_start||null,cycleEnd:row.cycle_end||null,planCode:row.plan_code||'free'},error:null}
}

export async function getPlanFeatureLimit(businessId,feature){
 if(!db||!businessId||!feature)return{limit:0,error:new Error('Banco indisponível.')}
 const{data,error}=await db.rpc('get_business_plan_feature_limit',{p_business_id:businessId,p_feature:feature})
 if(error)return{limit:0,error}
 const limit=Number(data)
 return{limit:Number.isFinite(limit)?limit:0,error:null}
}
