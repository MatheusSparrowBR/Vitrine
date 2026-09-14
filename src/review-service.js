import { db } from './supabase-client.js'

export { db }

export async function getReviewSummary(businessId){
 if(!db||!businessId)return {data:null,error:null}
 return db.rpc('get_business_review_summary',{p_business_id:businessId})
}

export async function getBusinessReviews(businessId,limit=100){
 if(!db||!businessId)return {data:[],error:null}
 const {data,error}=await db.rpc('get_public_business_reviews',{p_business_id:businessId,p_limit:limit})
 return {data:data||[],error}
}

export async function submitReview(businessId,rating,comment){
 if(!db)return {data:null,error:new Error('Banco indisponível.')}
 return db.rpc('submit_business_review',{p_business_id:businessId,p_rating:Number(rating),p_comment:String(comment||'')})
}

export async function addOwnerResponse(reviewId,response){
 if(!db)return {data:null,error:new Error('Banco indisponível.')}
 return db.rpc('add_business_review_response',{p_review_id:reviewId,p_response:String(response||'')})
}

export async function reportReview(reviewId,reason,details){
 if(!db)return {data:null,error:new Error('Banco indisponível.')}
 return db.rpc('report_business_review',{p_review_id:reviewId,p_reason:reason,p_details:String(details||'')})
}

export async function getSession(){
 if(!db)return null
 const {data,error}=await db.auth.getSession()
 if(error)return null
 return data.session||null
}

export function onAuthStateChange(callback){
 if(!db)return {data:{subscription:{unsubscribe(){}}}}
 return db.auth.onAuthStateChange(callback)
}
