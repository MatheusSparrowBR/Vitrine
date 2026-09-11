const STORAGE_KEY='vitrine:selectedBusinessId'

export function getRequestedBusinessId(){
 try{
  const query=new URLSearchParams(window.location.search).get('business_id')
  return query||window.localStorage.getItem(STORAGE_KEY)||''
 }catch{return ''}
}

export function chooseBusiness(businesses,requestedId=''){
 const rows=Array.isArray(businesses)?businesses:[]
 return rows.find(b=>b.id===requestedId)||rows[0]||null
}

export function persistBusinessId(id,{updateUrl=true}={}){
 if(!id)return
 try{window.localStorage.setItem(STORAGE_KEY,id)}catch{}
 if(!updateUrl)return
 try{
  const url=new URL(window.location.href)
  url.searchParams.set('business_id',id)
  window.history.replaceState({},'',`${url.pathname}?${url.searchParams.toString()}${url.hash||''}`)
 }catch{}
}
