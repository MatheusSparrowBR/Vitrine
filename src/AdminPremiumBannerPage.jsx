import React,{useEffect,useMemo,useState} from 'react'
import './admin-premium-banner.css'

const BUCKET='premium-banners'
const MAX_BYTES=10*1024*1024
const TYPES=new Set(['image/jpeg','image/png','image/webp'])
const slug=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
const formatMoney=v=>v==null?'—':`R$ ${Number(v).toFixed(2).replace('.',',')}`

export default function AdminPremiumBannerPage({supabase}){
  const [session,setSession]=useState(null),[authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true)
  const [banners,setBanners]=useState([]),[cities,setCities]=useState([]),[businesses,setBusinesses]=useState([])
  const [selected,setSelected]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState({text:'',error:false})
  const [form,setForm]=useState(null),[file,setFile]=useState(null)

  async function init(){
    if(!supabase){setChecking(false);setLoading(false);return}
    const {data:{session}}=await supabase.auth.getSession();setSession(session)
    if(!session){setChecking(false);setLoading(false);return}
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',session.user.id).maybeSingle()
    const ok=profile?.role==='admin';setAuthorized(ok);setChecking(false);if(!ok){setLoading(false);return}
    await load()
  }
  async function load(){
    setLoading(true)
    const [b,c,ci]=await Promise.all([
      supabase.from('advertisements').select('id,business_id,city_id,title,description,image_url,image_path,target_url,active,priority,starts_at,ends_at,created_at,cities(name,state),businesses(name)').eq('placement','home_banner').order('priority',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('cities').select('id,name,state,slug,active').order('name'),
      supabase.from('businesses').select('id,name,city_id,status').order('name')
    ])
    if(b.error)toast(b.error.message,true);if(c.error)toast(c.error.message,true);if(ci.error)toast(ci.error.message,true)
    setBanners(b.data||[]);setCities(c.data||[]);setBusinesses(ci.data||[]);setLoading(false)
    if(selected){const fresh=(b.data||[]).find(x=>x.id===selected.id);if(fresh)beginEdit(fresh);else{setSelected(null);setForm(null)}}
  }
  useEffect(()=>{init()},[])
  function toast(text,error=false){setMessage({text,error});window.clearTimeout(window.__vlBannerToast);window.__vlBannerToast=window.setTimeout(()=>setMessage({text:'',error:false}),3600)}
  function beginEdit(row){setSelected(row);setFile(null);setForm({business_id:row.business_id||'',city_id:row.city_id||'',title:row.title||'',description:row.description||'',target_url:row.target_url||'',priority:row.priority||0,starts_at:row.starts_at?new Date(row.starts_at).toISOString().slice(0,16):'',ends_at:row.ends_at?new Date(row.ends_at).toISOString().slice(0,16):'',active:Boolean(row.active),image_url:row.image_url||'',image_path:row.image_path||''})}
  function reset(){setSelected(null);setFile(null);setForm(null)}
  const cityBusinesses=useMemo(()=>businesses.filter(b=>!form?.city_id||b.city_id===form.city_id),[businesses,form?.city_id])
  function setField(key,value){setForm(x=>({...x,[key]:value}))}
  async function save(e){
    e.preventDefault();if(!selected||!form)return
    if(!form.title.trim())return toast('Informe o título do banner.',true)
    if(!form.city_id)return toast('Selecione a cidade.',true)
    if(!form.business_id)return toast('Selecione a empresa.',true)
    let uploadedPath=''
    setSaving(true)
    try{
      if(file){
        if(!TYPES.has(file.type))throw new Error('Use JPG, PNG ou WebP.')
        if(file.size>MAX_BYTES)throw new Error('A imagem deve ter no máximo 10 MB.')
        const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp'
        uploadedPath=`home/${crypto.randomUUID()}.${ext}`
        const upload=await supabase.storage.from(BUCKET).upload(uploadedPath,file,{cacheControl:'31536000',contentType:file.type,upsert:false})
        if(upload.error)throw upload.error
        form.image_url=supabase.storage.from(BUCKET).getPublicUrl(uploadedPath).data.publicUrl
      }
      const payload={business_id:form.business_id,city_id:form.city_id,title:form.title.trim(),description:form.description.trim()||null,image_url:form.image_url||null,image_path:uploadedPath||form.image_path||null,target_url:form.target_url.trim()||null,priority:Number(form.priority)||0,starts_at:form.starts_at?new Date(form.starts_at).toISOString():null,ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,active:Boolean(form.active)}
      const {error}=await supabase.from('advertisements').update(payload).eq('id',selected.id)
      if(error)throw error
      if(uploadedPath&&selected.image_path)await supabase.storage.from(BUCKET).remove([selected.image_path]).catch(()=>{})
      toast('Banner atualizado com sucesso.')
      await load()
    }catch(err){if(uploadedPath)await supabase.storage.from(BUCKET).remove([uploadedPath]).catch(()=>{});toast(err.message||'Não foi possível atualizar o banner.',true)}
    finally{setSaving(false)}
  }
  async function logout(){await supabase?.auth.signOut();window.location.href='/'}
  function back(){window.location.href='/admin'}

  if(checking)return <Screen><div className="apb-state">Verificando acesso administrativo…</div></Screen>
  if(!session)return <Screen><div className="apb-state"><h2>Faça login</h2><p>É necessário estar autenticado como administrador para editar banners Premium.</p><a className="apb-button primary" href="/">Voltar ao site</a></div></Screen>
  if(!authorized)return <Screen><div className="apb-state"><h2>Acesso negado</h2><p>Esta área é restrita a administradores.</p><a className="apb-button primary" href="/">Voltar ao site</a></div></Screen>

  return <Screen>
    <div className="apb-shell">
      <header className="apb-header"><div><span className="apb-kicker">ADMINISTRAÇÃO</span><h1>Banners Premium</h1><p>Edite os banners que aparecem na Home da cidade. As alterações entram em vigor imediatamente quando o banner estiver ativo.</p></div><div className="apb-header-actions"><button className="apb-button" onClick={back}>← Voltar ao admin</button><button className="apb-button danger" onClick={logout}>Sair</button></div></header>
      {message.text&&<div className={`apb-toast ${message.error?'error':''}`}>{message.text}</div>}
      <div className="apb-grid">
        <section className="apb-card"><div className="apb-card-head"><div><h2>Seus banners</h2><p>{banners.length} cadastro(s)</p></div></div>{loading?<div className="apb-muted">Carregando…</div>:!banners.length?<div className="apb-empty"><div>📣</div><strong>Nenhum banner cadastrado</strong><span>Crie o primeiro pela aba Banners Premium da Gestão administrativa.</span></div>:<div className="apb-list">{banners.map(row=><button key={row.id} className={`apb-banner-row ${selected?.id===row.id?'selected':''}`} onClick={()=>beginEdit(row)}><div className="apb-thumb">{row.image_url?<img src={row.image_url} alt=""/>:<span>V</span>}</div><div className="apb-banner-copy"><strong>{row.title}</strong><span>{row.businesses?.name||'Empresa'} · {row.cities?.name||'Cidade'}</span><small>{row.active?'Publicado':'Pausado'} · prioridade {row.priority||0} · {formatMoney(row.businesses?0:null)}</small></div><span className="apb-arrow">→</span></button>)}</div>}</section>
        <section className="apb-card">{!form?<div className="apb-empty apb-editor-empty"><div>✎</div><h2>Selecione um banner</h2><p>Escolha um banner na lista para alterar título, arte, cidade, empresa, link, prioridade ou período de exibição.</p></div>:<form onSubmit={save}><div className="apb-card-head"><div><span className="apb-kicker">EDIÇÃO</span><h2>{selected?.title||'Banner Premium'}</h2><p>Altere somente o que precisar e salve.</p></div><button type="button" className="apb-icon" onClick={reset} aria-label="Fechar edição">×</button></div><div className="apb-preview">{(file?URL.createObjectURL(file):form.image_url)?<img src={file?URL.createObjectURL(file):form.image_url} alt="Prévia do banner"/>:<div>Prévia</div>}<span>★ PREMIUM · PATROCINADO</span></div><div className="apb-form-grid"><label>Título<input value={form.title} onChange={e=>setField('title',e.target.value)} required/></label><label>Cidade<select value={form.city_id} onChange={e=>{setField('city_id',e.target.value);const valid=businesses.some(b=>b.id===form.business_id&&b.city_id===e.target.value);if(!valid)setField('business_id','')}} required><option value="">Selecione</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name} - {c.state}{c.active?'':' (inativa)'}</option>)}</select></label><label>Empresa<select value={form.business_id} onChange={e=>setField('business_id',e.target.value)} required><option value="">Selecione</option>{cityBusinesses.map(b=><option key={b.id} value={b.id}>{b.name}{b.status!=='active'?' (inativa)':''}</option>)}</select></label><label>Link de destino<input type="url" value={form.target_url} onChange={e=>setField('target_url',e.target.value)} placeholder="https://..."/></label><label>Prioridade<input type="number" value={form.priority} onChange={e=>setField('priority',e.target.value)} min="0"/></label><label>Nova imagem<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label>Início<input type="datetime-local" value={form.starts_at} onChange={e=>setField('starts_at',e.target.value)}/></label><label>Fim<input type="datetime-local" value={form.ends_at} onChange={e=>setField('ends_at',e.target.value)}/></label><label className="full">Descrição<textarea rows="4" value={form.description} onChange={e=>setField('description',e.target.value)}/></label><label className="apb-switch"><input type="checkbox" checked={form.active} onChange={e=>setField('active',e.target.checked)}/><span>Banner publicado/ativo</span></label></div><div className="apb-actions"><button type="button" className="apb-button" onClick={reset}>Cancelar</button><button className="apb-button primary" disabled={saving}>{saving?'Salvando…':'Salvar alterações'}</button></div></form>}</section>
      </div>
    </div>
  </Screen>
}

function Screen({children}){return <div className="apb-screen"><div className="apb-brand"><span>V</span><strong>VitrineLocal</strong><small>Administração</small></div>{children}</div>}
