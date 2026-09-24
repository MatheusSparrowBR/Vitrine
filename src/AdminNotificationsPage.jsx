
import React,{useEffect,useMemo,useState}from'react'
import AdminShell from './AdminShell.jsx'
import './admin-notifications.css'

const EMPTY={source_type:'custom',source_id:'',title:'',body:'',image_url:'',url:'/laguna',target_city_id:'',target_category_id:''}
const MAX_UPLOAD_BYTES=1572864
const SOURCE_OPTIONS=[['custom','Mensagem personalizada'],['promotion','Promoção'],['event','Evento'],['business','Empresa']]

function clean(v){return String(v||'').trim()}
function sourceTypeLabel(value){return SOURCE_OPTIONS.find(([id])=>id===value)?.[1]||'Mensagem personalizada'}
async function parseFunctionError(error,fallback){
 const response=error&&error.context
 if(response&&response.json)return response.clone().json().then(payload=>payload?.error||fallback).catch(()=>error?.message||fallback)
 return Promise.resolve(error?.message||fallback)
}

export default function AdminNotificationsPage({supabase}){
 const[checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[session,setSession]=useState(null)
 const[cities,setCities]=useState([]),[categories,setCategories]=useState([]),[promotions,setPromotions]=useState([]),[events,setEvents]=useState([]),[businesses,setBusinesses]=useState([])
 const[form,setForm]=useState(EMPTY),[imageFile,setImageFile]=useState(null),[preview,setPreview]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[message,setMessage]=useState({text:'',error:false}),[result,setResult]=useState(null)

 const sourceItems=form.source_type==='promotion'?promotions:form.source_type==='event'?events:form.source_type==='business'?businesses:[]
 const selectedSource=useMemo(()=>sourceItems.find(item=>item.id===form.source_id)||null,[sourceItems,form.source_id])
 const sourceLabel=sourceTypeLabel(form.source_type)
 const update=(key,value)=>setForm(current=>({...current,[key]:value}))

 useEffect(()=>{let live=true;(async()=>{
  if(!supabase){setChecking(false);return}
  const{data:{session:s}}=await supabase.auth.getSession()
  if(!live)return
  setSession(s||null)
  if(!s){setChecking(false);return}
  const{data:profile,error}=await supabase.from('profiles').select('role,account_status').eq('id',s.user.id).maybeSingle()
  if(!live)return
  const ok=!error&&profile?.role==='admin'&&profile?.account_status==='active'
  setAllowed(ok);setChecking(false);if(!ok)return
  const[cityRes,categoryRes,promotionRes,eventRes,businessRes]=await Promise.all([
   supabase.from('cities').select('id,name,state,slug').eq('active',true).order('name'),
   supabase.from('categories').select('id,name').eq('active',true).order('name'),
   supabase.from('promotions').select('id,business_id,title,description,image_url,status').eq('status','published').order('created_at',{ascending:false}).limit(100),
   supabase.from('events').select('id,city_id,title,description,image_url,event_date,event_end_date,active').eq('active',true).order('event_date').limit(100),
   supabase.from('businesses').select('id,city_id,category_id,name,slug,short_description,description,logo_url,cover_url,status').eq('status','active').order('name').limit(200)
  ])
  if(!live)return
  const firstError=[cityRes,categoryRes,promotionRes,eventRes,businessRes].map(x=>x.error).find(Boolean)
  if(firstError)setMessage({text:firstError.message||'Não foi possível carregar as opções.',error:true})
  setCities(cityRes.data||[]);setCategories(categoryRes.data||[]);setPromotions(promotionRes.data||[]);setEvents(eventRes.data||[]);setBusinesses(businessRes.data||[]);setLoading(false)
 })();return()=>{live=false}},[supabase])

 useEffect(()=>{if(!selectedSource)return
  if(form.source_type==='promotion'){
   const business=businesses.find(item=>item.id===selectedSource.business_id)
   const slug=cities.find(city=>city.id===business?.city_id)?.slug||'laguna'
   setForm(current=>({...current,title:selectedSource.title||'',body:selectedSource.description||'',image_url:selectedSource.image_url||'',target_city_id:business?.city_id||'',target_category_id:business?.category_id||'',url:'/'+slug+'?promotion='+encodeURIComponent(selectedSource.id)}))
  }else if(form.source_type==='event'){
   const slug=cities.find(city=>city.id===selectedSource.city_id)?.slug||'laguna'
   setForm(current=>({...current,title:selectedSource.title||'',body:selectedSource.description||'',image_url:selectedSource.image_url||'',target_city_id:selectedSource.city_id||'',target_category_id:'',url:'/'+slug+'/eventos'}))
  }else if(form.source_type==='business'){
   const slug=cities.find(city=>city.id===selectedSource.city_id)?.slug||'laguna'
   setForm(current=>({...current,title:selectedSource.name||'',body:selectedSource.short_description||selectedSource.description||'',image_url:selectedSource.logo_url||selectedSource.cover_url||'',target_city_id:selectedSource.city_id||'',target_category_id:selectedSource.category_id||'',url:'/'+slug+'/empresa/'+selectedSource.slug}))
  }
 },[selectedSource,form.source_type,businesses,cities])

 useEffect(()=>{if(imageFile){const objectUrl=URL.createObjectURL(imageFile);setPreview(objectUrl);return()=>URL.revokeObjectURL(objectUrl)}setPreview(form.image_url||'')},[imageFile,form.image_url])

 function reset(){setForm(EMPTY);setImageFile(null);setPreview('');setResult(null);setMessage({text:'',error:false})}
 function chooseSourceType(value){setForm({...EMPTY,source_type:value});setImageFile(null);setPreview('');setResult(null);setMessage({text:'',error:false})}
 function chooseImage(file){
  setMessage({text:'',error:false})
  if(!file){setImageFile(null);return}
  if(!String(file.type||'').startsWith('image/'))return setMessage({text:'Selecione JPG, PNG, WEBP ou GIF.',error:true})
  if(file.size>MAX_UPLOAD_BYTES)return setMessage({text:'A imagem deve ter no máximo 1,5 MB.',error:true})
  setImageFile(file);setForm(current=>({...current,image_url:''}))
 }
 function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file)})
 }
 async function send(event){
  event.preventDefault();if(sending)return
  const title=clean(form.title),body=clean(form.body)
  if(!title)return setMessage({text:'Informe o título da notificação.',error:true})
  if(!body)return setMessage({text:'Informe o texto da notificação.',error:true})
  if(form.source_type!=='custom'&&!form.source_id)return setMessage({text:'Selecione uma '+sourceLabel.toLowerCase()+'.',error:true})
  setSending(true);setMessage({text:'',error:false});setResult(null)
  try{
   const image_data=imageFile?await fileToDataUrl(imageFile):''
   const{data,error}=await supabase.functions.invoke('send-admin-notification',{body:{...form,title,body,image_data,image_type:imageFile?.type||''}})
   if(error)throw error
   if(data?.error)throw new Error(data.error)
   setForm(EMPTY);setImageFile(null);setPreview('')
   setResult(data)
   setMessage({text:'Notificação processada: '+Number(data?.sent||0)+' envio(s) aceito(s) pelo Push. '+Number(data?.invalid||0)+' subscription(ões) inválida(s) foram desativadas.',error:false})
  }catch(error){
   setMessage({text:await parseFunctionError(error,'Não foi possível enviar a notificação.'),error:true})
  }finally{setSending(false)}
 }

 if(checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Esta área é exclusiva para administradores.</span><a className="admin-v2-btn primary" href="/admin">Voltar ao admin</a></div></main></div>

 return <AdminShell active="notifications" title="Notificações" description="Envie Push personalizados, reaproveite promoções, eventos e empresas e acompanhe o resultado do disparo." email={session?.user?.email}>
  {message.text&&<div className={'admin-notification-alert '+(message.error?'error':'')}>{message.text}</div>}
  <div className="admin-notification-layout">
   <section className="admin-notification-card">
    <div className="admin-notification-head"><div><span className="admin-v2-kicker">DISPARO ADMINISTRATIVO</span><h2>Nova notificação Push</h2><p>O envio respeita a preferência de notificações do usuário e os filtros de cidade/categoria definidos.</p></div><span className="admin-notification-type">{sourceLabel}</span></div>
    <form onSubmit={send}>
     <div className="admin-notification-section">
      <div className="admin-notification-section-title"><span>01</span><div><strong>Fonte</strong><small>Escreva do zero ou reutilize conteúdo já cadastrado.</small></div></div>
      <label>Tipo de conteúdo<select value={form.source_type} disabled={sending} onChange={e=>chooseSourceType(e.target.value)}>{SOURCE_OPTIONS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
      {form.source_type!=='custom'&&<label>{sourceLabel}<select value={form.source_id} disabled={sending||loading} onChange={e=>update('source_id',e.target.value)}><option value="">Selecione…</option>{sourceItems.map(item=><option value={item.id} key={item.id}>{item.title||item.name}</option>)}</select></label>}
     </div>

     <div className="admin-notification-section">
      <div className="admin-notification-section-title"><span>02</span><div><strong>Mensagem</strong><small>Edite o conteúdo antes de enviar.</small></div></div>
      <label>Título<input maxLength={120} value={form.title} disabled={sending} onChange={e=>update('title',e.target.value)} placeholder="Ex.: Nova oportunidade no VitrineLocal"/></label>
      <label>Texto<textarea maxLength={500} rows={5} value={form.body} disabled={sending} onChange={e=>update('body',e.target.value)} placeholder="Escreva a mensagem que aparecerá na notificação…"/><small>{form.body.length}/500 caracteres</small></label>
     </div>

     <div className="admin-notification-section">
      <div className="admin-notification-section-title"><span>03</span><div><strong>Imagem e destino</strong><small>Imagem recomendada: proporção próxima de 1200×630. O suporte visual pode variar por navegador.</small></div></div>
      <label>URL da imagem<input type="url" value={form.image_url} disabled={sending||Boolean(imageFile)} onChange={e=>update('image_url',e.target.value)} placeholder="https://…"/></label>
      <div className="admin-notification-upload-row"><label className="admin-notification-upload">Ou carregar imagem<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={sending} onChange={e=>chooseImage(e.target.files?.[0])}/><span>{imageFile?'Trocar imagem':'Selecionar imagem'}</span></label>{imageFile&&<small>{imageFile.name} · {(imageFile.size/1024/1024).toFixed(1)} MB</small>}</div>
      <label>Destino ao tocar<input value={form.url} disabled={sending} onChange={e=>update('url',e.target.value)} placeholder="/laguna"/></label>
     </div>

     <div className="admin-notification-section">
      <div className="admin-notification-section-title"><span>04</span><div><strong>Público</strong><small>Deixe “todos” para não limitar a campanha por cidade ou categoria.</small></div></div>
      <div className="admin-notification-two"><label>Cidade<select value={form.target_city_id} disabled={sending} onChange={e=>update('target_city_id',e.target.value)}><option value="">Todas as cidades</option>{cities.map(city=><option value={city.id} key={city.id}>{city.name} - {city.state}</option>)}</select></label><label>Categoria<select value={form.target_category_id} disabled={sending} onChange={e=>update('target_category_id',e.target.value)}><option value="">Todas as categorias</option>{categories.map(category=><option value={category.id} key={category.id}>{category.name}</option>)}</select></label></div>
     </div>

     <div className="admin-notification-preview"><div className="admin-notification-preview-media">{preview?<img src={preview} alt="Pré-visualização"/>:<span>🔔</span>}</div><div><small>PRÉ-VISUALIZAÇÃO</small><strong>{form.title||'Título da notificação'}</strong><p>{form.body||'Texto da notificação aparecerá aqui.'}</p><em>{sourceLabel}</em></div></div>
     <div className="admin-notification-actions"><button className="admin-v2-btn" type="button" onClick={reset} disabled={sending}>Limpar</button><button className="admin-v2-btn primary" disabled={sending||loading}>{sending?'Enviando…':'Enviar notificação'}</button></div>
    </form>
   </section>

   <aside className="admin-notification-side">
    <section className="admin-notification-card">
     <span className="admin-v2-kicker">COMO FUNCIONA</span>
     <h3>O que será considerado no envio</h3>
     <div className="admin-notification-check-list"><div><b>✓</b><span>Somente subscriptions Push ativas.</span></div><div><b>✓</b><span>Preferência do usuário para o tipo da mensagem.</span></div><div><b>✓</b><span>Filtros de cidade e categoria.</span></div><div><b>✓</b><span>Subscriptions expiradas são desativadas automaticamente.</span></div><div><b>✓</b><span>O resultado fica registrado no histórico de notificações.</span></div></div>
    </section>
    {result&&<section className="admin-notification-result"><span className="admin-v2-kicker">ÚLTIMO ENVIO</span><strong>{result.sent||0} enviados</strong><div><span>Elegíveis</span><b>{result.eligible||0}</b></div><div><span>Não elegíveis</span><b>{result.ineligible||0}</b></div><div><span>Inválidos</span><b>{result.invalid||0}</b></div><div><span>Falhas</span><b>{result.failed||0}</b></div></section>}
   </aside>
  </div>
 </AdminShell>
}
