import React,{useEffect,useMemo,useState} from 'react'
import './admin-promotions.css'

const STATUS={draft:'Rascunho',pending_review:'Em revisão',published:'Publicada',archived:'Arquivada',rejected:'Rejeitada'}
const MEDIA_BUCKET='business-media'
const DEFAULT_IMAGE='/promotion-default.svg'
const PROMOTION_TZ='America/Sao_Paulo'
const PROMOTION_OFFSET='-03:00'
const empty={business_id:'',title:'',description:'',price:'',original_price:'',starts_at:'',ends_at:'',status:'pending_review',image_url:'',image_path:''}

function toProjectInput(value){
 if(!value)return ''
 const d=new Date(value)
 if(Number.isNaN(d.getTime()))return ''
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:PROMOTION_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d)
 const get=k=>parts.find(p=>p.type===k)?.value||''
 return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
function projectInputToISO(value){
 if(!value||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(value))return null
 const iso=`${value}:00${PROMOTION_OFFSET}`
 const d=new Date(iso)
 return Number.isNaN(d.getTime())?null:d.toISOString()
}
function money(v){return v==null||v===''?'—':`R$ ${Number(v).toFixed(2).replace('.',',')}`}
function when(v){return v?new Intl.DateTimeFormat('pt-BR',{timeZone:PROMOTION_TZ,dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'Sem período'}

export default function AdminPromotionsPage({supabase}){
 const [businesses,setBusinesses]=useState([]),[items,setItems]=useState([]),[loading,setLoading]=useState(true)
 const [editor,setEditor]=useState(null),[form,setForm]=useState(empty),[imageFile,setImageFile]=useState(null),[preview,setPreview]=useState(''),[saving,setSaving]=useState(false),[message,setMessage]=useState({text:'',error:false}),[statusFilter,setStatusFilter]=useState('current'),[search,setSearch]=useState('')
 const notify=(text,error=false)=>{setMessage({text,error});window.clearTimeout(window.__vlPromotionToast);window.__vlPromotionToast=window.setTimeout(()=>setMessage({text:'',error:false}),3500)}
 async function load(){
  setLoading(true)
  const [b,p]=await Promise.all([
   supabase.from('businesses').select('id,name,status,city_id,cities(name,state)').order('name').limit(500),
   supabase.from('promotions').select('id,business_id,title,description,image_url,image_path,price,original_price,starts_at,ends_at,status,created_at,updated_at,businesses(name,cities(name,state))').order('created_at',{ascending:false}).limit(500)
  ])
  if(b.error||p.error)notify((b.error||p.error).message||'Não foi possível carregar as promoções.',true)
  setBusinesses(b.data||[]);setItems(p.data||[]);setLoading(false)
 }
 useEffect(()=>{
  load()
 },[])
 useEffect(()=>()=>{if(preview?.startsWith('blob:'))URL.revokeObjectURL(preview)},[preview])
 const activeBusinesses=useMemo(()=>businesses.filter(x=>x.status==='active'),[businesses])
 const filtered=useMemo(()=>items.filter(p=>{const q=search.trim().toLowerCase();const text=[p.title,p.description,p.businesses?.name,p.businesses?.cities?.name].filter(Boolean).join(' ').toLowerCase();const now=Date.now();const ended=p.ends_at&&new Date(p.ends_at).getTime()<=now;const matchesStatus=statusFilter==='current'?(p.status!=='archived'&&!ended):statusFilter==='all'?true:p.status===statusFilter;return(!q||text.includes(q))&&matchesStatus}),[items,search,statusFilter])
 function startNew(){setEditor({id:null});setForm({...empty});setImageFile(null);setPreview('')}
 function edit(row){setEditor({id:row.id});setForm({business_id:row.business_id||'',title:row.title||'',description:row.description||'',price:row.price??'',original_price:row.original_price??'',starts_at:toProjectInput(row.starts_at),ends_at:toProjectInput(row.ends_at),status:row.status||'pending_review',image_url:row.image_url||'',image_path:row.image_path||''});setImageFile(null);setPreview(row.image_url||'')}
 function close(){setEditor(null);setForm(empty);setImageFile(null);setPreview('')}
 function chooseImage(file){
  if(!file)return
  if(!file.type.startsWith('image/'))return notify('Selecione uma imagem (JPG, PNG, WEBP ou GIF).',true)
  if(file.size>8*1024*1024)return notify('A imagem deve ter no máximo 8 MB.',true)
  if(preview?.startsWith('blob:'))URL.revokeObjectURL(preview)
  setImageFile(file);setPreview(URL.createObjectURL(file))
 }
 async function uploadImage(file,businessId){
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
  const path=`${businessId}/promotions/${crypto.randomUUID()}.${ext}`
  const up=await supabase.storage.from(MEDIA_BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false})
  if(up.error)throw up.error
  const url=supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
  return{path,url}
 }
 async function save(e){
  e.preventDefault();if(saving)return
  if(!form.business_id)return notify('Selecione a empresa.',true)
  if(!form.title.trim())return notify('Informe o título da promoção.',true)
  const starts=projectInputToISO(form.starts_at),ends=projectInputToISO(form.ends_at)
  if(form.starts_at&&!starts)return notify('A data/hora inicial é inválida.',true)
  if(form.ends_at&&!ends)return notify('A data/hora final é inválida.',true)
  if(starts&&ends&&new Date(ends)<=new Date(starts))return notify('O encerramento deve ser posterior ao início.',true)
  setSaving(true)
  let uploadedPath=null
  try{
   let imageUrl=form.image_url||null
   let imagePath=form.image_path||null
   if(imageFile){const uploaded=await uploadImage(imageFile,form.business_id);imageUrl=uploaded.url;imagePath=uploaded.path;uploadedPath=uploaded.path}
   const payload={business_id:form.business_id,title:form.title.trim(),description:form.description.trim()||null,price:form.price===''?null:Number(form.price),original_price:form.original_price===''?null:Number(form.original_price),starts_at:starts,ends_at:ends,status:form.status,image_url:imageUrl,image_path:imagePath,updated_at:new Date().toISOString()}
   const r=editor?.id?await supabase.from('promotions').update(payload).eq('id',editor.id):await supabase.from('promotions').insert(payload)
   if(r.error)throw r.error
   notify(editor?.id?'Promoção atualizada com sucesso.':'Promoção criada com sucesso.')
   close();await load()
  }catch(err){if(uploadedPath)await supabase.storage.from(MEDIA_BUCKET).remove([uploadedPath]).catch(()=>{});notify(err.message||'Não foi possível salvar a promoção.',true)}finally{setSaving(false)}
 }
 async function quickStatus(row,status){const r=await supabase.from('promotions').update({status,updated_at:new Date().toISOString()}).eq('id',row.id);if(r.error)notify(r.error.message,true);else{notify(status==='archived'?'Promoção arquivada.':'Status atualizado.');await load()}}
 async function remove(row){if(!window.confirm(`Excluir a promoção “${row.title}”?`))return;const r=await supabase.from('promotions').delete().eq('id',row.id);if(r.error)notify(r.error.message,true);else{notify('Promoção excluída.');await load()}}
 if(loading)return <div className="admin-promotions-page"><div className="admin-promo-empty">Carregando promoções…</div></div>
 return <div className="admin-promotions-page">
  {message.text&&<div className={`admin-promo-alert ${message.error?'error':''}`}>{message.text}</div>}
  <section className="admin-promo-toolbar-card">
   <div><span className="admin-promo-eyebrow">CATÁLOGO COMERCIAL</span><h2>Promoções</h2><p>Crie e agende ofertas com o fuso oficial do projeto e imagem personalizada.</p></div>
   <button className="admin-promo-primary" onClick={startNew}>＋ Nova promoção</button>
  </section>
  <section className="admin-promo-list-card">
   <div className="admin-promo-filters"><div className="admin-promo-search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar promoção, empresa ou cidade…"/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="current">Atuais (exceto arquivadas)</option><option value="all">Todos os status</option>{Object.entries(STATUS).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></div>
   <div className="admin-promo-list">{filtered.length?filtered.map(row=><article className="admin-promo-row" key={row.id}><div className="admin-promo-thumb"><img src={row.image_url||DEFAULT_IMAGE} alt=""/></div><div className="admin-promo-main"><div className="admin-promo-title"><strong>{row.title}</strong><span className={`admin-promo-status ${row.status}`}>{STATUS[row.status]||row.status}</span></div><p>{row.businesses?.name||'Empresa'} · {row.businesses?.cities?.name||'Cidade'}{row.businesses?.cities?.state?` - ${row.businesses.cities.state}`:''}</p><small>{row.price!=null?money(row.price):'Sem preço'}{row.original_price!=null?` · de ${money(row.original_price)}`:''} · {when(row.starts_at)} → {row.ends_at?when(row.ends_at):'sem fim'}</small></div><div className="admin-promo-actions"><button onClick={()=>edit(row)}>Editar</button>{row.status==='published'?<button onClick={()=>quickStatus(row,'archived')}>Arquivar</button>:<button className="accent" onClick={()=>quickStatus(row,'published')}>Publicar</button>}<button className="danger" onClick={()=>remove(row)}>Excluir</button></div></article>):<div className="admin-promo-empty"><strong>Nenhuma promoção encontrada.</strong><span>Crie uma nova promoção ou ajuste os filtros.</span></div>}</div>
  </section>
  {editor&&<section className="admin-promo-editor-card"><div className="admin-promo-editor-head"><div><span className="admin-promo-eyebrow">{editor.id?'EDITAR PROMOÇÃO':'NOVA PROMOÇÃO'}</span><h2>{editor.id?'Atualizar oferta':'Criar uma nova oferta'}</h2><p>O horário é do fuso oficial <strong>{PROMOTION_TZ} ({PROMOTION_OFFSET})</strong>. O valor exibido no campo não será deslocado para outro horário.</p></div><button className="admin-promo-close" type="button" onClick={close}>×</button></div>
   <form onSubmit={save} className="admin-promo-form">
    <div className="admin-promo-form-grid"><label>Empresa<select value={form.business_id} onChange={e=>setForm({...form,business_id:e.target.value})} required><option value="">Selecione a empresa</option>{activeBusinesses.map(b=><option key={b.id} value={b.id}>{b.name} · {b.cities?.name||'Cidade'}</option>)}</select></label><label>Título<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} maxLength={120} required/></label><label className="full">Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={4} placeholder="Explique a oferta, condições e detalhes importantes…"/></label><label>Preço promocional<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="Ex.: 49,90"/></label><label>Preço original<input type="number" min="0" step="0.01" value={form.original_price} onChange={e=>setForm({...form,original_price:e.target.value})} placeholder="Ex.: 69,90"/></label><label>Início da promoção<input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/><small>Horário local do projeto.</small></label><label>Final da promoção<input type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/><small>No minuto do final, a oferta deixa de aparecer para o público e passa a ser arquivada automaticamente.</small></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
    <div className="admin-promo-upload"><div className="admin-promo-preview"><img src={preview||DEFAULT_IMAGE} alt="Prévia da promoção"/></div><div><span className="admin-promo-eyebrow">IMAGEM DA OFERTA</span><h3>Use a imagem da empresa</h3><p>A empresa pode enviar sua própria arte. A imagem padrão da VitrineLocal será usada somente quando nenhuma imagem for anexada.</p><label className="admin-promo-file"><input type="file" accept="image/*" onChange={e=>chooseImage(e.target.files?.[0])}/><span>Escolher imagem</span></label>{imageFile&&<small>{imageFile.name} · {(imageFile.size/1024/1024).toFixed(1)} MB</small>}</div></div>
    <div className="admin-promo-form-actions"><button className="admin-promo-secondary" type="button" onClick={close}>Cancelar</button><button className="admin-promo-primary" type="submit" disabled={saving}>{saving?'Salvando…':editor.id?'Salvar alterações':'Criar promoção'}</button></div>
   </form>
  </section>}
 </div>
}
