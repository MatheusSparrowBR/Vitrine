import { db } from './supabase-client.js'

export function currentPath(){
 const path=`${window.location.pathname}${window.location.search}${window.location.hash}`
 return path||'/laguna'
}

export function loginPathForIntent(intent){
 const next=`${currentPath()}${currentPath().includes('?')?'&':'?'}intent=${encodeURIComponent(intent)}`
 return `/usuario/login?next=${encodeURIComponent(next)}`
}

export async function getBusinessRelationship(businessId){
 if(!db||!businessId)return {session:null,favorite:false,following:false}
 const {data:{session}}=await db.auth.getSession()
 if(!session?.user?.id)return {session:null,favorite:false,following:false}
 const [{data:favorite},{data:following}]=await Promise.all([
  db.from('business_favorites').select('business_id').eq('user_id',session.user.id).eq('business_id',businessId).maybeSingle(),
  db.from('business_notification_subscriptions').select('business_id').eq('user_id',session.user.id).eq('business_id',businessId).eq('enabled',true).maybeSingle()
 ])
 return {session,favorite:Boolean(favorite),following:Boolean(following)}
}

export async function setBusinessRelationship(businessId,type,value){
 if(!db||!businessId)return {session:null,requiresAuth:true}
 const {data:{session}}=await db.auth.getSession()
 if(!session?.user?.id)return {session:null,requiresAuth:true}
 const table=type==='favorite'?'business_favorites':'business_notification_subscriptions'
 const key={user_id:session.user.id,business_id:businessId}
 const result=type==='favorite'
  ? (value
    ? await db.from(table).insert(key)
    : await db.from(table).delete().match(key))
  : (value
    ? await db.from(table).upsert({...key,enabled:true},{onConflict:'user_id,business_id'})
    : await db.from(table).delete().match(key))
 if(result.error)throw result.error
 return {session,value}
}

