// Eventos salvos pelo usuário (tabela public.event_favorites).
import {loginPathForIntent} from './business-relationship.js'

export {loginPathForIntent}

export async function getEventFavoriteIds(client,eventIds=[]){
  if(!client||!eventIds.length)return {session:null,ids:new Set()}
  const {data:{session}}=await client.auth.getSession()
  if(!session?.user?.id)return {session:null,ids:new Set()}
  const {data,error}=await client.from('event_favorites').select('event_id').eq('user_id',session.user.id).in('event_id',eventIds)
  if(error)return {session,ids:new Set()}
  return {session,ids:new Set((data||[]).map(row=>row.event_id))}
}

export async function setEventFavorite(client,eventId,value){
  if(!client||!eventId)throw new Error('Não foi possível salvar este evento.')
  const {data:{session}}=await client.auth.getSession()
  if(!session?.user?.id)return {requiresAuth:true}
  const key={user_id:session.user.id,event_id:eventId}
  const result=value
    ? await client.from('event_favorites').upsert(key,{onConflict:'user_id,event_id',ignoreDuplicates:true})
    : await client.from('event_favorites').delete().match(key)
  if(result.error)throw result.error
  return {value}
}
