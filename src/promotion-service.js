export const DEFAULT_PROMOTION_IMAGE='/promotion-default.svg'

export function isPromotionCurrent(promotion,now=Date.now()){
 if(!promotion||promotion.status!=='published')return false
 const start=promotion.starts_at?new Date(promotion.starts_at).getTime():null
 const end=promotion.ends_at?new Date(promotion.ends_at).getTime():null
 if(start!==null&&!Number.isFinite(start))return false
 if(end!==null&&!Number.isFinite(end))return false
 if(start!==null&&start>now)return false
 if(end!==null&&end<=now)return false
 return true
}

export async function getActiveCityPromotions(db,cityId,{limit=100}={}){
 if(!db)return{data:[],error:new Error('Supabase não configurado.')}
 if(!cityId)return{data:[],error:new Error('Cidade não informada.')}
 const businessesResponse=await db.from('businesses')
  .select('id,name,slug,city_id,status')
  .eq('city_id',cityId)
  .eq('status','active')
  .limit(1000)
 if(businessesResponse.error)return{data:[],error:businessesResponse.error}
 const businesses=businessesResponse.data||[]
 if(!businesses.length)return{data:[],error:null}
 const ids=businesses.map(b=>b.id)
 const map=new Map(businesses.map(b=>[b.id,b]))
 const promotionsResponse=await db.from('promotions')
  .select('id,business_id,title,description,image_url,price,original_price,starts_at,ends_at,status,created_at')
  .in('business_id',ids)
  .eq('status','published')
  .order('created_at',{ascending:false})
  .limit(limit)
 if(promotionsResponse.error)return{data:[],error:promotionsResponse.error}
 const now=Date.now()
 const data=(promotionsResponse.data||[])
  .map(p=>({...p,businesses:map.get(p.business_id)}))
  .filter(p=>p.businesses&&isPromotionCurrent(p,now))
 return{data,error:null}
}

export async function getActiveBusinessPromotions(db,businessId,{limit=100}={}){
 if(!db)return{data:[],error:new Error('Supabase não configurado.')}
 if(!businessId)return{data:[],error:new Error('Empresa não informada.')}
 const businessResponse=await db.from('businesses')
  .select('id,name,slug,city_id,status')
  .eq('id',businessId)
  .eq('status','active')
  .maybeSingle()
 if(businessResponse.error)return{data:[],error:businessResponse.error}
 if(!businessResponse.data)return{data:[],error:null}
 const response=await db.from('promotions')
  .select('id,business_id,title,description,image_url,price,original_price,starts_at,ends_at,status,created_at')
  .eq('business_id',businessId)
  .eq('status','published')
  .order('created_at',{ascending:false})
  .limit(limit)
 if(response.error)return{data:[],error:response.error}
 const now=Date.now()
 return{data:(response.data||[]).filter(p=>isPromotionCurrent(p,now)).map(p=>({...p,businesses:businessResponse.data})),error:null}
}

export function projectTodayISO(date=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
