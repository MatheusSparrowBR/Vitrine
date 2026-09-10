import React,{useEffect,useMemo,useState}from'react'
import{createClient}from'@supabase/supabase-js'
import{DEFAULT_PROMOTION_IMAGE}from'./promotion-service.js'
import'./owner-promotions.css'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null
const MEDIA_BUCKET='business-media'
const PROMOTION_TZ='America/Sao_Paulo'
const PROMOTION_OFFSET='-03:00'
const PLAN_NAMES={free:'Grátis',pro:'Pro',premium:'Premium'}
const ACTIVE_STATUSES=['pending_review','published','draft']
const EMPTY={title:'',description:'',price:'',original_price:'',starts_at:'',ends_at:''}

function toLocalInput(value){
 if(!value)return''
 const d=new Date(value)
 if(Number.isNaN(d.getTime()))return''
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:PROMOTION_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d)
 const get=k=>parts.find(p=>p.type===k)?.value||''
 return`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
function toISO(value){
 if(!value||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(value))return null
 const d=new Date(`${value}:00${PROMOTION_OFFSET}`)
 return Number.isNaN(d.getTime())?null:d.toISOString()
}
function money(v){return v==null||v===''?'':`R$ ${Number(v).toFixed(2).replace('.',',')}`}
function getLimit(features){const value=features?.promotions_limit??features?.promotions;const n=Number(value);return Number.isFinite(n)&&n>=0?n:0}
function percent(used,limit){return limit>0?Math.min(100,Math.round((used/limit)*100)):100}
function statusLabel(status){return status==='published'?'Publicada':status==='pending_review'?'Em análise':status==='draft'?'Rascunho':status==='rejected'?'Rejeitada':status==='archived'?'Arquivada':status}

export default function OwnerPromotionsSection({businessId,businessName,onChanged}){
 const[items,setItems]=useState([]),[plan,setPlan]=useState(null),[planLimit,setPlanLimit]=useState(0),[loading,setLoading]=useState(true),[editor,setEditor]=useState(false),[saving,setSaving]=useState(false),[imageFile,setImageFile]=useState(null),[preview,setPreview]=useState(''),[form,setForm]=useState(EMPTY),[message,setMessage]=useState({text:'',error:false})
 const used=useMemo(()=>items.filter(p=>ACTIVE_STATUSES.includes(p.status)).length,[items])
 const reached=used>=planLimit
 const usagePercent=percent(used,planLimit)
 const notify=(text,error=false)=>setMessage({text:String(text||''),error})
 const load=async()=>{
  if(!db||!businessId)return
  setLoading(true);setMessage({text:'',error:false})
  const[pr,planId]=await Promise.all([
   db.from('promotions').select('id,title,status,price,original_price,starts_at,ends_at,image_url,created_at').eq('business_id',businessId).order('created_at',{ascending:false}),
   db.rpc('get_effective_plan_id',{p_business_id:businessId})
  ])
  if(pr.error){notify(pr.error.message,true)}
  let effectivePlan=null
  if(planId.error||!planId.data){notify(planId.error?.message||'Não foi possível carregar o plano.',true)}
  else{
   const{data,error}=await db.from('plans').select('code,name,description,features,active').eq('id',planId.data).maybeSingle()
   if(error||!data)notify(error?.message||'Plano não encontrado.',true)
   else effectivePlan=data
  }
  setItems(pr.data||[]);setPlan(effectivePlan);setPlanLimit(getLimit(effectivePlan?.features));setLoading(false)
 }
 useEffect(()=>{load();return()=>{if(preview?.startsWith('blob:'))URL.revokeObjectURL(preview)}},[businessId])
 useEffect(()=>()=>{if(preview?.startsWith('blob:'))URL.revokeObjectURL(preview)},[preview])
 function startNew(){setMessage({text:'',error:false});setForm(EMPTY);setImageFile(null);if(preview?.startsWith('blob:'))URL.revokeObjectURL(preview);setPreview('');setEditor(true)}
 function close(){if(saving)return;setEditor(false);setForm(EMPTY);setImageFile(null);if(preview?.startsWith('blob:'))URL.revokeObjectURL(preview);setPreview('')}
 function chooseImage(file){
  if(!file)return
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return notify('Selecione uma imagem JPG, PNG, WEBP ou GIF.',true)
  if(file.size>8*1024*1024)return notify('A imagem deve ter no máximo 8 MB.',true)
  if(preview?.startsWith('blob:'))URL.revokeObjectURL(preview)
  setImageFile(file);setPreview(URL.createObjectURL(file));setMessage({text:'',error:false})
 }
 async function uploadImage(file){
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
  const path=`${businessId}/promotions/${crypto.randomUUID()}.${ext}`
  const up=await db.storage.from(MEDIA_BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false})
  if(up.error)throw up.error
  return{path,url:db.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl}
 }
 async function submit(e){
  e.preventDefault();if(saving)return
  if(!db||!businessId)return notify('Empresa indisponível.',true)
  if(reached)return notify(`Seu plano ${PLAN_NAMES[plan?.code]||plan?.name||''} permite até ${planLimit} promoção${planLimit===1?'':'ões'} em uso. Faça upgrade para criar mais.`,true)
  const title=form.title.trim()
  if(!title)return notify('Informe o título da promoção.',true)
  const starts=toISO(form.starts_at),ends=toISO(form.ends_at)
  if(form.starts_at&&!starts)return notify('A data/hora inicial é inválida.',true)
  if(form.ends_at&&!ends)return notify('A data/hora final é inválida.',true)
  if(starts&&ends&&new Date(ends)<=new Date(starts))return notify('O encerramento deve ser posterior ao início.',true)
  const price=form.price===''?null:Number(form.price)
  const original=form.original_price===''?null:Number(form.original_price)
  if(price!=null&&(!Number.isFinite(price)||price<0))return notify('Informe um preço promocional válido.',true)
  if(original!=null&&(!Number.isFinite(original)||original<0))return notify('Informe um preço original válido.',true)
  setSaving(true);setMessage({text:'',error:false});let uploadedPath=null
  try{
   const latest=await db.from('promotions').select('id,status').eq('business_id',businessId).in('status',ACTIVE_STATUSES)
   if(latest.error)throw latest.error
   if((latest.data||[]).length>=planLimit){setItems(latest.data||[]);throw new Error(`Limite de ${planLimit} promoção${planLimit===1?'':'ões'} em uso atingido no plano ${PLAN_NAMES[plan?.code]||plan?.name||'atual'}.`)}
   let imageUrl=null,imagePath=null
   if(imageFile){const uploaded=await uploadImage(imageFile);imageUrl=uploaded.url;imagePath=uploaded.path;uploadedPath=uploaded.path}
   const{error}=await db.from('promotions').insert({business_id:businessId,title,description:form.description.trim()||null,price,original_price:original,starts_at:starts,ends_at:ends,status:'pending_review',image_url:imageUrl,image_path:imagePath})
   if(error)throw error
   notify('Promoção enviada para análise administrativa.');close();await load();onChanged?.()
  }catch(err){if(uploadedPath)await db.storage.from(MEDIA_BUCKET).remove([uploadedPath]).catch(()=>{});notify(err.message||'Não foi possível criar a promoção.',true)}finally{setSaving(false)}
 }
 if(loading)return <div className="owner-promo-section"><div className="owner-promo-skeleton">Carregando suas promoções…</div></div>
 const planName=PLAN_NAMES[plan?.code]||plan?.name||'Plano atual'
 return <div className="owner-promo-section">
  {message.text&&<div className={`owner-promo-alert ${message.error?'error':'success'}`}>{message.text}</div>}
  <section className="owner-promo-limit-card">
   <div className="owner-promo-limit-main">
    <div className="owner-promo-ring" style={{'--progress':`${usagePercent}%`}}><div><strong>{used}</strong><span>de {planLimit}</span></div></div>
    <div><span className="account-eyebrow">SEU PLANO · {planName.toUpperCase()}</span><h2>{reached?'Limite de promoções atingido':'Uso de promoções'}</h2><p>{reached?`Você já utiliza ${used} de ${planLimit} promoção${planLimit===1?'':'ões'} permitida${planLimit===1?'':'s'} pelo seu plano.`:`Você está usando ${used} de ${planLimit} promoção${planLimit===1?'':'ões'} disponíveis no seu plano.`}</p></div>
   </div>
   <div className="owner-promo-limit-side"><strong>{usagePercent}%</strong><span>utilizado</span>{reached&&<small>Limite atingido</small>}</div>
  </section>
  {reached?<section className="owner-promo-upgrade-card"><div><span>🔒</span><div><strong>Quer criar mais promoções?</strong><p>Faça upgrade do plano para aumentar seu limite e continuar divulgando suas ofertas.</p></div></div><a className="owner-promo-upgrade" href={`/planos?business_id=${encodeURIComponent(businessId)}`}>Ver planos e aumentar limite →</a></section>:<div className="owner-promo-create-row"><button className="account-primary-btn" onClick={startNew}>＋ Criar promoção</button><span>{planLimit-used} restante{planLimit-used===1?'':'s'} no plano</span></div>}
  {editor&&<section className="owner-promo-editor"><div className="owner-promo-editor-head"><div><span className="account-eyebrow">NOVA PROMOÇÃO</span><h2>Criar uma nova oferta{businessName?` para ${businessName}`:''}</h2><p>Preencha os dados da oferta. Após o envio, ela ficará <strong>Em análise</strong> até a aprovação administrativa.</p></div><button type="button" className="owner-promo-close" onClick={close}>×</button></div>
   <form onSubmit={submit}>
    <div className="owner-promo-form-grid">
     <label><span>Título da promoção</span><input autoFocus required maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ex.: Pizza grande com 20% de desconto"/></label>
     <label className="full"><span>Descrição</span><textarea rows={4} maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Explique a oferta, condições e informações importantes…"/></label>
     <label><span>Preço promocional</span><input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="Ex.: 49,90"/></label>
     <label><span>Preço original</span><input type="number" min="0" step="0.01" value={form.original_price} onChange={e=>setForm({...form,original_price:e.target.value})} placeholder="Ex.: 59,90"/></label>
     <label><span>Início da promoção</span><input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/><small>Horário local de {PROMOTION_TZ}.</small></label>
     <label><span>Final da promoção</span><input type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/><small>A oferta deixa de aparecer no minuto do encerramento.</small></label>
    </div>
    <div className="owner-promo-upload">
     <div className="owner-promo-preview"><img src={preview||DEFAULT_PROMOTION_IMAGE} alt="Prévia da promoção"/></div>
     <div className="owner-promo-upload-copy"><span className="account-eyebrow">IMAGEM DA OFERTA</span><h3>Adicione uma arte para destacar a promoção</h3><p>JPG, PNG, WEBP ou GIF · máximo 8 MB. Sem imagem, usamos a arte padrão da VitrineLocal.</p><label className="owner-promo-file"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>chooseImage(e.target.files?.[0])}/><span>Escolher imagem</span></label>{imageFile&&<small>{imageFile.name} · {(imageFile.size/1024/1024).toFixed(1)} MB</small>}</div>
    </div>
    <div className="owner-promo-form-footer"><span>Será enviada para aprovação administrativa.</span><div><button type="button" className="account-secondary-btn" onClick={close} disabled={saving}>Cancelar</button><button type="submit" className="account-primary-btn" disabled={saving}>{saving?'Enviando…':'Enviar promoção para análise'}</button></div></div>
   </form>
  </section>}
  <section className="account-card owner-promo-list-card"><div className="account-card-title"><div><h2>Suas promoções</h2><p>Promoções ativas ocupam seu limite. Arquivadas e rejeitadas não ocupam espaço.</p></div></div>{items.length?<div className="account-list">{items.map(p=><div className="account-list-row" key={p.id}><div className="account-list-avatar promo">{p.image_url?<img src={p.image_url} alt=""/>:<span>✦</span>}</div><div className="account-list-main"><strong>{p.title}</strong><p>{p.price!=null?`Preço promocional: ${money(p.price)}`:'Sem preço informado'}{p.original_price!=null?` · de ${money(p.original_price)}`:''}</p>{(p.starts_at||p.ends_at)&&<small>{p.starts_at?new Intl.DateTimeFormat('pt-BR',{timeZone:PROMOTION_TZ,dateStyle:'short',timeStyle:'short'}).format(new Date(p.starts_at)):'Agora'}{p.ends_at?` → ${new Intl.DateTimeFormat('pt-BR',{timeZone:PROMOTION_TZ,dateStyle:'short',timeStyle:'short'}).format(new Date(p.ends_at))}`:''}</small>}</div><span className={`account-promo-status ${p.status}`}>{statusLabel(p.status)}</span></div>)}</div>:<div className="account-empty-inline owner-promo-empty"><span>✦</span><strong>Nenhuma promoção cadastrada</strong><p>Crie sua primeira oferta para aparecer no catálogo local.</p>{!reached&&<button className="account-secondary-btn small" onClick={startNew}>Criar promoção</button>}</div>}</section>
 </div>
}
