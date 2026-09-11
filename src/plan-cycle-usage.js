import{createClient}from'@supabase/supabase-js'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null

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
 return{usage:row?{used:Number(row.used_count)||0,limit:Number(row.limit_count)||0,cycleStart:row.cycle_start||null,cycleEnd:row.cycle_end||null,planCode:row.plan_code||'free'}:{used:0,limit:0,cycleStart:null,cycleEnd:null,planCode:'free'},error:null}
}
