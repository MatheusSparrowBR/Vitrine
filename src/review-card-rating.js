import { db } from './supabase-client.js'
import { getReviewSummary } from './review-service.js'

const processed=new WeakSet()
const cache=new Map()

function slugFromHref(href){try{return decodeURIComponent(new URL(href,location.origin).pathname.split('/').filter(Boolean).pop()||'')}catch{return ''}}

async function getRating(slug){
 if(!db||!slug)return null
 if(cache.has(slug))return cache.get(slug)
 const promise=(async()=>{
  const{data,error}=await db.from('public_business_directory').select('id').eq('slug',slug).maybeSingle()
  if(error||!data?.id)return null
  const summary=await getReviewSummary(data.id)
  const row=summary?.data?.[0]
  if(!row)return {avg:0,count:0}
  return {avg:Number(row.avg_rating||0),count:Number(row.review_count||0)}
 })()
 cache.set(slug,promise)
 return promise
}

async function enhance(card){
 if(processed.has(card))return
 processed.add(card)
 const href=card.getAttribute('href')||''
 const slug=slugFromHref(href)
 if(!slug)return
 const info=await getRating(slug)
 if(!card.isConnected||!info)return
 let badge=card.querySelector('.vl-card-rating')
 if(!badge){
  badge=document.createElement('div')
  badge.className='vl-card-rating'
  const anchor=card.querySelector('.business-meta')||card.querySelector('.business-info')
  if(anchor)anchor.insertAdjacentElement('afterend',badge)
 }
 if(info.count>0){
  badge.innerHTML=`<span class="vl-card-rating-stars" aria-label="${info.avg.toFixed(1)} de 5 estrelas">★★★★★</span><strong>${info.avg.toFixed(1)}</strong><small>${info.count} ${info.count===1?'avaliação':'avaliações'}</small>`
 }else{
  badge.innerHTML='<span class="vl-card-rating-empty">☆ Sem avaliações</span>'
 }
}

function scan(){document.querySelectorAll('.business-card-v2').forEach(enhance)}
scan()
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true})
