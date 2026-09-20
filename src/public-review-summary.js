export async function loadPublicBusinessReviewSummaries(db,businessIds=[]){
 const ids=[...new Set(businessIds.filter(Boolean))].slice(0,100)
 if(!db||!ids.length)return{}
 const{data,error}=await db.rpc('get_public_business_review_summaries',{p_business_ids:ids})
 if(error)return{}
 return Object.fromEntries((data||[]).map(row=>[row.business_id,{avg:Number(row.avg_rating)||0,count:Number(row.review_count)||0}]))
}

