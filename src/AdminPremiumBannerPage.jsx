import React,{useEffect,useMemo,useState} from 'react'
import AdminShell from './AdminShell.jsx'
import {projectTodayISO} from './promotion-service.js'
import './admin-v2.css'

const BUCKET='premium-banners',MAX_BYTES=10*1024*1024,TYPES=new Set(['image/jpeg','image/png','image/webp']),PROMOTION_TZ='America/Sao_Paulo',PROMOTION_OFFSET='-03:00'
const empty={content_type:'business',event_id:'',business_id:'',city_id:'',title:'',description:'',target_url:'',priority:0,starts_at:'',ends_at:'',active:false,image_url:'',image_path:''}
function toProjectInput(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const parts=new Intl.DateTimeFormat('en-US',{timeZone:PROMOTION_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);const get=k=>parts.find(p=>p.type===k)?.value||'';return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`}
function projectInputToISO(value){if(!value||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(value))return null;const d=new Date(`${value}:00${PROMOTION_OFFSET}`);return Number.isNaN(d.getTime())?null:d.toISOString()}
export default function AdminPremiumBannerPage({supabase}){
 const [session,setSession]=useState(null),[authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true),[banners,setBanners]=useState([]),[cities,setCities]=useState([]),[businesses,setBusinesses]=useState([]),[events,setEvents]=useState([]),[selected,setSelected]=useState(null),[form,setForm]=useState(null),[file,setFile]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState({text:'',error:false})
 const toast=(text,error=false)=>{setMessage({text,error});window.clearTimeout(window.__vlAdminBannerToast);window.__vlAdminBannerToast=window.setTimeout(()=>setMessage({text:'',error:false}),3300)}
 async function init(){if(!supabase){setChecking(false);setLoading(false);return}const {data:{session:s}}=await supabase.auth.getSession();setSession(s||null);if(!s){setChecking(false);setLoading(false);return}const {data:p}=await supabase.from('profiles').select('role').eq('id',s.user.id).maybeSingle();const ok=p?.role==='admin';setAuthorized(ok);setChecking(false);if(ok)await load()}
 async function load(){
  setLoading(true)
  const [b,c,bs,ev]=await Promise.all([
   supabase.from('advertisements').select('id,business_id,event_id,city_id,title,description,image_url,image_path,target_url,active,priority,starts_at,ends_at,created_at,cities(name,state),businesses(name),events(id,title)').eq('placement','home_banner').order('priority',{ascending:false}).order('created_at',{ascending:false}),
   supabase.from('cities').select('id,name,state,slug,active').order('name'),
   supabase.from('businesses').select('id,name,city_id,status').order('name'),
   supabase.from('events').select('id,title,description,image_url,event_date,event_end_date,city_id,active').order('event_date').order('title')
  ])
  if(b.error||c.error||bs.error||ev.error)toast(b.error?.message||c.error?.message||bs.error?.message||ev.error?.message||'Erro ao carregar banners.',true)
  setBanners(b.data||[]);setCities(c.data||[]);setBusinesses(bs.data||[]);setEvents(ev.data||[]);setLoading(false)
  if(selected){const fresh=(b.data||[]).find(x=>x.id===selected.id);if(fresh)beginEdit(fresh);else reset()}
 }
 useEffect(()=>{init()},[])
 function beginEdit(row){setSelected(row);setFile(null);setForm({content_type:row.event_id?'event':'business',event_id:row.event_id||'',business_id:row.business_id||'',city_id:row.city_id||'',title:row.title||'',description:row.description||'',target_url:row.target_url||'',priority:row.priority||0,starts_at:toProjectInput(row.starts_at),ends_at:toProjectInput(row.ends_at),active:Boolean(row.active),image_url:row.image_url||'',image_path:row.image_path||''})}
 function newBanner(){setSelected(null);setFile(null);setForm({...empty,city_id:cities.find(x=>x.active)?.id||''})}
 function reset(){setSelected(null);setFile(null);setForm(null)}
 function selectEvent(eventId){
  const event=events.find(item=>item.id===eventId)
  if(!event){setFile(null);setForm(x=>({...x,event_id:'',business_id:'',title:'',description:'',target_url:'',image_url:'',image_path:''}));return}
  const city=cities.find(item=>item.id===event.city_id)
  const target=city?.slug?window.location.origin+'/'+city.slug+'/evento/'+event.id:''
  setFile(null)
  setForm(x=>({...x,content_type:'event',event_id:event.id,business_id:'',city_id:event.city_id,title:event.title||'',description:event.description||'',target_url:target,image_url:event.image_url||'',image_path:''}))
 }
 const activeCities=useMemo(()=>cities.filter(c=>c.active),[cities])
 const cityBusinesses=useMemo(()=>businesses.filter(b=>b.status==='active'&&(!form?.city_id||b.city_id===form.city_id)),[businesses,form?.city_id])
 const selectableEvents=useMemo(()=>events.filter(event=>activeCities.some(city=>city.id===event.city_id)&&((event.active&&event.event_end_date>=projectTodayISO())||event.id===form?.event_id)),[events,activeCities,form?.event_id])
 const preview=file?URL.createObjectURL(file):form?.image_url||''
 const update=(key,value)=>setForm(x=>({...x,[key]:value}))
 async function save(e){
  e.preventDefault();if(!form)return
  if(!form.title.trim())return toast('Informe o título do banner.',true)
  if(!form.city_id)return toast('Selecione uma cidade.',true)
  let linkedEvent=null
  if(form.content_type==='event'){
   linkedEvent=events.find(event=>event.id===form.event_id&&event.city_id===form.city_id)
   const editingExistingEvent=Boolean(selected?.event_id&&selected.event_id===form.event_id)
   if(!linkedEvent||((!linkedEvent.active||linkedEvent.event_end_date<projectTodayISO())&&(!editingExistingEvent||form.active)))return toast('Selecione um evento ativo e não encerrado. Para manter um evento encerrado no histórico, pause o banner.',true)
   if(!activeCities.some(city=>city.id===form.city_id))return toast('A cidade do evento não está ativa.',true)
  }else{
   if(!form.business_id)return toast('Selecione uma empresa.',true)
   if(!businesses.some(business=>business.id===form.business_id&&business.city_id===form.city_id&&business.status==='active'))return toast('A empresa selecionada não está ativa nessa cidade.',true)
  }
  const starts=projectInputToISO(form.starts_at),ends=projectInputToISO(form.ends_at)
  if(form.starts_at&&!starts||form.ends_at&&!ends)return toast('Data/hora inválida.',true)
  if(starts&&ends&&new Date(ends)<=new Date(starts))return toast('O encerramento deve ser posterior ao início.',true)
  let path='';setSaving(true)
  try{
   if(file){
    if(form.content_type!=='business')throw new Error('A imagem de banners de eventos vem do cadastro do evento.')
    if(!TYPES.has(file.type))throw new Error('Use JPG, PNG ou WebP.')
    if(file.size>MAX_BYTES)throw new Error('A imagem deve ter no máximo 10 MB.')
    const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp'
    path='home/'+crypto.randomUUID()+'.'+ext
    const upload=await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false})
    if(upload.error)throw upload.error
   }
   const image_url=path?supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl:form.image_url||null
   const image_path=path||(form.content_type==='business'?form.image_path||null:null)
   const payload={business_id:form.content_type==='business'?form.business_id:null,event_id:form.content_type==='event'?form.event_id:null,city_id:form.city_id,title:form.title.trim(),description:form.description.trim()||null,target_url:form.target_url.trim()||null,priority:Number(form.priority)||0,starts_at:starts,ends_at:ends,active:Boolean(form.active),image_url,image_path,placement:'home_banner'}
   let r
   if(selected)r=await supabase.from('advertisements').update(payload).eq('id',selected.id)
   else r=await supabase.from('advertisements').insert(payload)
   if(r.error)throw r.error
   if(selected?.image_path&&selected.image_path!==image_path)await supabase.storage.from(BUCKET).remove([selected.image_path]).catch(()=>{})
   toast(selected?'Banner atualizado.':'Banner criado.')
   await load()
  }catch(err){
   if(path)await supabase.storage.from(BUCKET).remove([path]).catch(()=>{})
   toast(err.message||'Não foi possível salvar o banner.',true)
  }finally{setSaving(false)}
 }
 async function toggle(row){const r=await supabase.from('advertisements').update({active:!row.active}).eq('id',row.id);if(r.error)toast(r.error.message,true);else{toast(row.active?'Banner pausado.':'Banner publicado.');await load()}}
 async function remove(row){if(!window.confirm(`Excluir o banner “${row.title}”?`))return;const r=await supabase.from('advertisements').delete().eq('id',row.id);if(r.error)toast(r.error.message,true);else{if(row.image_path)await supabase.storage.from(BUCKET).remove([row.image_path]).catch(()=>{});toast('Banner excluído.');await load();if(selected?.id===row.id)reset()}}
 if(checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!session||!authorized)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Esta área é exclusiva para administradores.</span><a className="admin-v2-btn primary" href="/admin">Voltar ao admin</a></div></main></div>
 return <AdminShell active="banners" title="Banners Premium" description="Controle a mídia patrocinada da Home por cidade, empresa ou evento, prioridade e período." email={session.user.email}>
  {message.text&&<div className={message.error?'admin-v2-alert':'admin-v2-note'}>{message.text}</div>}
  <section className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><span className="admin-v2-kicker">PUBLICIDADE</span><h2>{banners.length} banner(s)</h2><p>O primeiro item na prioridade recebe maior destaque no posicionamento configurado.</p></div><button className="admin-v2-btn primary" onClick={newBanner}>＋ Novo banner</button></div>{loading?<div className="admin-v2-empty"><strong>Carregando banners…</strong></div>:<div className="admin-v2-table-wrap"><table className="admin-v2-table"><thead><tr><th>Banner</th><th>Origem / item</th><th>Cidade</th><th>Status</th><th>Prioridade</th><th></th></tr></thead><tbody>{banners.map(row=><tr key={row.id}><td><div className="admin-v2-maincell"><span className="admin-v2-thumb">{row.image_url?<img src={row.image_url} alt=""/>:'★'}</span><span><strong>{row.title}</strong><small>{row.description||'Sem descrição'}</small></span></div></td><td>{row.event_id?(row.events?.title||'Evento'):(row.businesses?.name||'—')}</td><td>{row.cities?.name||'—'}{row.cities?.state?` - ${row.cities.state}`:''}</td><td><span className={`admin-v2-pill ${row.active?'green':'red'}`}>{row.active?'Publicado':'Pausado'}</span></td><td>{row.priority||0}</td><td><div className="admin-v2-table-actions"><button className="primary" onClick={()=>beginEdit(row)}>Editar</button><button onClick={()=>toggle(row)}>{row.active?'Pausar':'Publicar'}</button><button className="danger" onClick={()=>remove(row)}>Excluir</button></div></td></tr>)}</tbody></table></div>}</section>
  {form&&<section className="admin-v2-card admin-v2-section" style={{marginTop:14}}><div className="admin-v2-section-head"><div><span className="admin-v2-kicker">{selected?'EDIÇÃO':'NOVO REGISTRO'}</span><h2>{selected?`Editar ${selected.title}`:'Novo banner'}</h2><p>Horários interpretados no fuso {PROMOTION_TZ} ({PROMOTION_OFFSET}).</p></div><button className="admin-v2-close-inline" onClick={reset} type="button">×</button></div>{preview&&<div className="admin-v2-banner-preview"><img src={preview} alt="Prévia do banner"/></div>}<form className="admin-v2-form-panel" onSubmit={save}><div className="admin-v2-form-grid">
<label>Título<input value={form.title} onChange={e=>update('title',e.target.value)} required/></label>
<label>Tipo de destaque<select value={form.content_type||'business'} onChange={e=>{const type=e.target.value;setFile(null);setForm(x=>({...x,content_type:type,event_id:'',business_id:'',title:'',description:'',target_url:'',image_url:'',image_path:''}))}}><option value="business">Empresa</option><option value="event">Evento</option></select></label>
<label className="full">Cidade<select value={form.city_id} disabled={form.content_type==='event'} onChange={e=>{const city=e.target.value;const valid=businesses.some(b=>b.id===form.business_id&&b.city_id===city&&b.status==='active');setForm(x=>({...x,city_id:city,business_id:valid?x.business_id:''}))}} required><option value="">Selecione</option>{activeCities.map(city=><option key={city.id} value={city.id}>{city.name} - {city.state}</option>)}</select>{form.content_type==='event'&&<small>A cidade é preenchida pelo evento selecionado.</small>}</label>
{form.content_type==='event'?<label className="full">Evento<select value={form.event_id} onChange={e=>selectEvent(e.target.value)} required><option value="">Selecione um evento</option>{selectableEvents.map(event=>{const city=cities.find(item=>item.id===event.city_id);return <option key={event.id} value={event.id}>{event.title} · {city?.name||'Cidade'}{city?.state?' - '+city.state:''} · {event.event_date}</option>})}</select><small>A imagem é sincronizada com o card do evento e o link abre o perfil público dele.</small></label>:<label>Empresa<select value={form.business_id} onChange={e=>update('business_id',e.target.value)} required><option value="">Selecione</option>{cityBusinesses.map(business=><option key={business.id} value={business.id}>{business.name}</option>)}</select></label>}
<label className="full">Link de destino<input type="url" value={form.target_url} onChange={e=>update('target_url',e.target.value)} placeholder="https://…" readOnly={form.content_type==='event'}/>{form.content_type==='event'&&<small>Link preenchido automaticamente a partir da cidade e do evento.</small>}</label>
<label>Prioridade<input type="number" min="0" value={form.priority} onChange={e=>update('priority',e.target.value)}/></label>
{form.content_type==='business'?<label>Nova imagem<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>:<div className="full"><small>A imagem do banner vem do cadastro do evento. Para alterá-la, edite o próprio evento.</small></div>}
<label>Início<input type="datetime-local" value={form.starts_at} onChange={e=>update('starts_at',e.target.value)}/></label>
<label>Fim<input type="datetime-local" value={form.ends_at} onChange={e=>update('ends_at',e.target.value)}/></label>
<label className="full">Descrição<textarea rows="4" value={form.description} onChange={e=>update('description',e.target.value)}/></label>
</div><div className="admin-v2-form-meta"><div className="checks"><label><input type="checkbox" checked={form.active} onChange={e=>update('active',e.target.checked)}/> Banner ativo</label></div><div className="admin-v2-actions"><button type="button" className="admin-v2-btn" onClick={reset}>Cancelar</button><button className="admin-v2-btn primary" disabled={saving}>{saving?'Salvando…':'Salvar banner'}</button></div></div></form></section>}
 </AdminShell>
}
