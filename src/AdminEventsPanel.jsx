import React,{useEffect,useMemo,useState} from 'react'
import './admin-events.css'

const emptyForm={city_id:'',title:'',slug:'',description:'',event_date:'',start_time:'',end_time:'',location:'',address:'',category:'',price:'',external_url:'',active:true,featured:false}
const slugify=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
const money=value=>value==null||value===''?'Gratuito':`R$ ${Number(value).toFixed(2).replace('.',',')}`

export default function AdminEventsPanel({supabase}){
 const [open,setOpen]=useState(false),[events,setEvents]=useState([]),[cities,setCities]=useState([]),[editing,setEditing]=useState(null),[form,setForm]=useState(emptyForm),[coverFile,setCoverFile]=useState(null),[coverRemoved,setCoverRemoved]=useState(false),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const activeCities=useMemo(()=>cities.filter(c=>c.active),[cities])
 const coverPreview=useMemo(()=>coverFile?URL.createObjectURL(coverFile):coverRemoved?'':editing?.image_url||'',[coverFile,coverRemoved,editing?.image_url])
 useEffect(()=>()=>{if(coverPreview.startsWith('blob:'))URL.revokeObjectURL(coverPreview)},[coverPreview])
 async function load(){
  if(!supabase)return
  setLoading(true);setError('')
  const [eventsRes,citiesRes]=await Promise.all([
   supabase.from('events').select('id,city_id,title,slug,description,image_url,event_date,start_time,end_time,location,address,category,price,external_url,active,featured,created_at,updated_at,cities(name,state)').order('event_date',{ascending:true}).order('start_time',{ascending:true}),
   supabase.from('cities').select('id,name,state,slug,active').order('name')
  ])
  if(eventsRes.error) setError(eventsRes.error.message)
  if(citiesRes.error) setError(citiesRes.error.message)
  setEvents(eventsRes.data||[]);setCities(citiesRes.data||[]);setLoading(false)
 }
 useEffect(()=>{if(open)load()},[open])
 function reset(){setEditing(null);setForm({...emptyForm,city_id:activeCities[0]?.id||''});setCoverFile(null);setCoverRemoved(false);setError('')}
 function edit(row){
  setEditing(row)
  setCoverFile(null);setCoverRemoved(false)
  setForm({city_id:row.city_id||'',title:row.title||'',slug:row.slug||'',description:row.description||'',event_date:row.event_date||'',start_time:row.start_time?String(row.start_time).slice(0,5):'',end_time:row.end_time?String(row.end_time).slice(0,5):'',location:row.location||'',address:row.address||'',category:row.category||'',price:row.price??'',external_url:row.external_url||'',active:Boolean(row.active),featured:Boolean(row.featured)})
 }
 function selectCover(file){
  setError('')
  if(!file){setCoverFile(null);return}
  if(!String(file.type||'').startsWith('image/')){setError('Selecione uma imagem válida (JPG, PNG, WEBP ou GIF).');return}
  if(file.size>10*1024*1024){setError('A capa deve ter no máximo 10 MB.');return}
  setCoverRemoved(false);setCoverFile(file)
 }
 function clearCover(){
  if(coverFile){setCoverFile(null);return}
  setCoverRemoved(true)
 }
 const update=(key,value)=>setForm(current=>({...current,[key]:value}))
 async function uploadCover(eventId){
  if(!coverFile)return null
  const path=`${eventId}/cover`
  const upload=await supabase.storage.from('events-media').upload(path,coverFile,{cacheControl:'3600',upsert:true,contentType:coverFile.type||undefined})
  if(upload.error)throw upload.error
  const {data}=supabase.storage.from('events-media').getPublicUrl(path)
  return data.publicUrl
 }
 async function save(event){
  event.preventDefault();setSaving(true);setError('');setNotice('')
  let createdId=null
  try{
   if(!form.city_id)throw new Error('Selecione a cidade do evento.')
   if(!form.title.trim())throw new Error('Informe o título do evento.')
   if(!form.event_date)throw new Error('Informe a data do evento.')
   const payload={city_id:form.city_id,title:form.title.trim(),slug:slugify(form.slug||form.title),description:form.description.trim()||null,image_url:coverRemoved?null:editing?.image_url||null,event_date:form.event_date,start_time:form.start_time||null,end_time:form.end_time||null,location:form.location.trim()||null,address:form.address.trim()||null,category:form.category.trim()||null,price:form.price===''?null:Number(form.price),external_url:form.external_url.trim()||null,active:Boolean(form.active),featured:Boolean(form.featured),updated_at:new Date().toISOString()}
   let result
   if(editing){
    result=await supabase.from('events').update(payload).eq('id',editing.id).select('id').single()
   }else{
    result=await supabase.from('events').insert(payload).select('id').single()
    createdId=result.data?.id||null
   }
   if(result.error)throw result.error
   const eventId=editing?.id||createdId
   if(coverFile&&eventId){
    const publicUrl=await uploadCover(eventId)
    const updateResult=await supabase.from('events').update({image_url:publicUrl,updated_at:new Date().toISOString()}).eq('id',eventId)
    if(updateResult.error)throw updateResult.error
   }
   setNotice(editing?'Evento atualizado com sucesso.':'Evento cadastrado com sucesso.')
   reset();await load()
  }catch(e){
   if(createdId)await supabase.from('events').delete().eq('id',createdId)
   setError(e.message||'Não foi possível salvar o evento.')
  }finally{setSaving(false)}
 }
 async function toggle(id,field,value){
  const {error}=await supabase.from('events').update({[field]:!value,updated_at:new Date().toISOString()}).eq('id',id)
  if(error)setError(error.message);else await load()
 }
 async function remove(row){
  if(!window.confirm(`Excluir o evento “${row.title}”?`))return
  const {error}=await supabase.from('events').delete().eq('id',row.id)
  if(error)setError(error.message);else{setNotice('Evento excluído.');await load()}
 }
 return <>
  <button className="vl-admin-events-trigger" onClick={()=>setOpen(true)}>📅 Eventos</button>
  {open&&<div className="vl-admin-events-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setOpen(false)}>
   <section className="vl-admin-events-modal" role="dialog" aria-modal="true" aria-label="Gestão de eventos">
    <header className="vl-admin-events-head"><div><span>AGENDA DA CIDADE</span><h2>Cadastro de eventos</h2><p>Cadastre, edite, destaque e publique eventos por cidade.</p></div><button className="vl-admin-events-close" onClick={()=>setOpen(false)}>×</button></header>
    {(error||notice)&&<div className={`vl-admin-events-message ${error?'error':''}`}>{error||notice}</div>}
    <div className="vl-admin-events-layout">
     <form className="vl-admin-events-form" onSubmit={save}>
      <div className="vl-admin-events-form-head"><div><span>EVENTO</span><h3>{editing?'Editar evento':'Novo evento'}</h3></div>{editing&&<button type="button" className="vl-admin-events-secondary" onClick={reset}>Novo</button>}</div>
      <label>Cidade<select value={form.city_id} onChange={e=>update('city_id',e.target.value)} required><option value="">Selecione a cidade</option>{activeCities.map(c=><option key={c.id} value={c.id}>{c.name} - {c.state}</option>)}</select></label>
      <label>Título<input value={form.title} onChange={e=>{const title=e.target.value;update('title',title);if(!editing)update('slug',slugify(title))}} placeholder="Ex.: Festival de Verão" required/></label>
      <label>Slug<input value={form.slug} onChange={e=>update('slug',e.target.value)} placeholder="festival-de-verao"/></label>
      <div className="vl-admin-events-two"><label>Data<input type="date" value={form.event_date} onChange={e=>update('event_date',e.target.value)} required/></label><label>Categoria<input value={form.category} onChange={e=>update('category',e.target.value)} placeholder="Cultura, música…"/></label></div>
      <div className="vl-admin-events-two"><label>Início<input type="time" value={form.start_time} onChange={e=>update('start_time',e.target.value)}/></label><label>Fim<input type="time" value={form.end_time} onChange={e=>update('end_time',e.target.value)}/></label></div>
      <label>Descrição<textarea rows="4" value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Descreva o evento…"/></label>
      <div className="vl-admin-events-two"><label>Local<input value={form.location} onChange={e=>update('location',e.target.value)} placeholder="Praça, casa de eventos…"/></label><label>Preço<input type="number" step="0.01" min="0" value={form.price} onChange={e=>update('price',e.target.value)} placeholder="0,00"/></label></div>
      <label>Endereço<input value={form.address} onChange={e=>update('address',e.target.value)} placeholder="Rua, número, bairro…"/></label>
      <div className="vl-admin-events-cover">
       <div className="vl-admin-events-cover-head"><span>Capa do evento</span><small>JPG, PNG, WEBP ou GIF · até 10 MB</small></div>
       {coverPreview?<div className="vl-admin-events-cover-preview"><img src={coverPreview} alt="Pré-visualização da capa do evento"/><div><strong>{coverFile?'Nova capa selecionada':'Capa atual'}</strong>{coverFile&&<small>{coverFile.name}</small>}<button type="button" className="vl-admin-events-secondary" onClick={clearCover}>{coverFile?'Remover seleção':'Remover capa'}</button></div></div>:<div className="vl-admin-events-upload"><span>🖼️</span><div><strong>Adicione uma imagem de capa</strong><small>A imagem será armazenada com segurança no Supabase.</small></div><label className="vl-admin-events-upload-button">Selecionar imagem<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>selectCover(e.target.files?.[0])}/></label></div>}
       {coverPreview&&<label className="vl-admin-events-upload-button secondary">Trocar imagem<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>selectCover(e.target.files?.[0])}/></label>}
      </div>
      <label>Link externo<input type="url" value={form.external_url} onChange={e=>update('external_url',e.target.value)} placeholder="https://ingressos…"/></label>
      <div className="vl-admin-events-checks"><label><input type="checkbox" checked={form.active} onChange={e=>update('active',e.target.checked)}/> Evento publicado</label><label><input type="checkbox" checked={form.featured} onChange={e=>update('featured',e.target.checked)}/> Destacar na agenda</label></div>
      <button className="vl-admin-events-primary" disabled={saving}>{saving?'Salvando…':editing?'Salvar evento':'Cadastrar evento'}</button>
     </form>
     <div className="vl-admin-events-list"><div className="vl-admin-events-list-head"><div><span>CADASTRADOS</span><h3>{events.length} eventos</h3></div><button className="vl-admin-events-secondary" onClick={load} disabled={loading}>{loading?'Atualizando…':'Atualizar'}</button></div>
      {loading&&!events.length?<div className="vl-admin-events-empty">Carregando eventos…</div>:!events.length?<div className="vl-admin-events-empty"><strong>Nenhum evento cadastrado.</strong><span>Use o formulário ao lado para publicar a primeira agenda.</span></div>:<div className="vl-admin-events-items">{events.map(row=><article className="vl-admin-event-row" key={row.id}><div className="vl-admin-event-thumb">{row.image_url?<img src={row.image_url} alt=""/>:<span>📅</span>}</div><div className="vl-admin-event-copy"><div className="vl-admin-event-badges"><span>{row.cities?.name||'Cidade'}</span>{row.featured&&<b>Destaque</b>}{row.active?<b>Ativo</b>:<em>Inativo</em>}</div><h4>{row.title}</h4><p>{row.event_date?new Date(`${row.event_date}T00:00:00`).toLocaleDateString('pt-BR'):''}{row.start_time?` · ${String(row.start_time).slice(0,5)}`:''} {row.location?`· ${row.location}`:''}</p><small>{money(row.price)}</small></div><div className="vl-admin-event-actions"><button onClick={()=>edit(row)}>Editar</button><button onClick={()=>toggle(row.id,'active',row.active)}>{row.active?'Pausar':'Publicar'}</button><button onClick={()=>toggle(row.id,'featured',row.featured)}>{row.featured?'Desdestacar':'Destacar'}</button><button className="danger" onClick={()=>remove(row)}>Excluir</button></div></article>)}</div>}
     </div>
    </div>
   </section>
  </div>}
 </>
}
