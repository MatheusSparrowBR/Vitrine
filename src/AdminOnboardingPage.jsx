import React,{useEffect,useMemo,useState}from'react'
import{db}from'./supabase-client.js'
import AdminShell from'./AdminShell.jsx'
import Icon from'./ui-icons.jsx'
import'./admin-onboarding.css'
import'./business-service-badges.css'

const emptyBusiness={name:'',slug:'',short_description:'',description:'',city_id:'',category_id:'',address:'',neighborhood:'',phone:'',whatsapp:'',instagram_url:'',website_url:'',ifood_url:'',facebook_url:'',status:'pending',plan_code:'free',plan_ends_at:'',owner_id:'',has_delivery:false,has_pickup:false,has_dine_in:false}

export default function AdminOnboardingPage({mode='partner'}){
 const[s,setS]=useState({loading:true,allowed:false,session:null,cities:[],categories:[],owners:[],error:'',notice:'',busy:false,created:null})
 const[user,setUser]=useState({full_name:'',email:''})
 const[business,setBusiness]=useState(emptyBusiness)
 const load=async()=>{
  if(!db){setS(x=>({...x,loading:false,error:'Banco indisponível.'}));return}
  const{data:{session}}=await db.auth.getSession()
  if(!session){setS(x=>({...x,loading:false}));return}
  const{data:profile,error:profileError}=await db.from('profiles').select('role,account_status').eq('id',session.user.id).maybeSingle()
  if(profileError||profile?.role!=='admin'||profile?.account_status!=='active'){setS(x=>({...x,loading:false,session,allowed:false,error:profileError?.message||''}));return}
  const{data:c,error:cErr}=await db.from('cities').select('id,name,state').eq('active',true).order('name')
  const{data:cat,error:catErr}=await db.from('categories').select('id,name').eq('active',true).order('sort_order').order('name')
  let owners=[]
   let ownerError=null
   if(mode==='business'){
    const{o,error:oErr}=await db.rpc('admin_list_business_owners')
    ownerError=oErr
    if(!oErr)owners=o||[]
   }
   setS(x=>({...x,loading:false,allowed:true,session,cities:c||[],categories:cat||[],owners,error:cErr?.message||catErr?.message||ownerError?.message||''}))
 }
 useEffect(()=>{load()},[mode])
  const title=mode==='business'?'Nova empresa':mode==='user'?'Novo usuário':'Novo parceiro'
  const description=mode==='business'?'Cadastre uma empresa para um proprietário já existente ou vincule o usuário depois.':mode==='user'?'Crie uma conta de proprietário de empresa pelo painel administrativo.':'Cadastre o responsável e, opcionalmente, a empresa no mesmo fluxo.'
 const updateBusiness=(k,v)=>setBusiness(x=>({...x,[k]:v}))
  const canSubmit=useMemo(()=>{if(mode==='business')return Boolean(business.name.trim()&&business.city_id&&(business.plan_code==='free'||business.owner_id));if(!user.full_name.trim()||!user.email.trim())return false;if(mode==='partner')return !business.name.trim()||Boolean(business.city_id);return true},[mode,user,business])
 const submit=async(e)=>{
  e.preventDefault();if(!db||!canSubmit||s.busy)return
  setS(x=>({...x,busy:true,error:'',notice:'',created:null}))
  const action=mode==='business'?'create_business':'create_partner'
  const payload=mode==='business'?{action,business}:{action,user,business:{...business,create:mode==='partner'&&Boolean(business.name.trim())}}
  const serviceFields={has_delivery:Boolean(business.has_delivery),has_pickup:Boolean(business.has_pickup),has_dine_in:Boolean(business.has_dine_in)}
  const finalPayload=mode==='business'?{action,business:{...business,...serviceFields}}:{action,user,business:{...business,...serviceFields,create:mode==='partner'&&Boolean(business.name.trim())}}
  const{data,error}=await db.functions.invoke('admin-onboarding',{body:finalPayload})
  if(error){
   let detail=error.message||'Não foi possível concluir o cadastro.'
   try{const response=error?.context;if(response?.json){const payload=await response.clone().json().catch(()=>null);if(payload?.error)detail=payload.error}}catch{}
   setS(x=>({...x,busy:false,error:detail}));return
  }
  if(data?.error){setS(x=>({...x,busy:false,error:data.error}));return}
  setS(x=>({...x,busy:false,notice:mode==='partner'?'Parceiro criado com sucesso.':mode==='business'?'Empresa criada com sucesso.':'Usuário criado com sucesso.',created:data}))
  if(mode==='user')setUser({full_name:'',email:''})
  else if(mode==='business')setBusiness(emptyBusiness)
  else{setUser({full_name:'',email:''});setBusiness(emptyBusiness)}
 }
 const createdEmail=s.created?.user?.email||null
 const createdBusiness=s.created?.business||null
 if(s.loading)return <div className="admin-v2-shell"><div className="admin-v2-empty"><span>Verificando acesso administrativo…</span></div></div>
 if(!s.allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><h2>Acesso restrito</h2><span>Esta área é exclusiva para administradores.</span><a className="admin-v2-btn primary" href="/admin">Voltar ao admin</a></div></main></div>
 return <AdminShell active={mode==='business'?'businesses':'users'} title={title} description={description} email={s.session?.user?.email}>
  <div className="ao-actions"><a className="admin-v2-btn" href="/admin/usuarios">Usuários</a><a className="admin-v2-btn" href="/admin/empresas">Empresas</a><a className="admin-v2-btn" href="/admin/convites">Convites</a></div>
  {s.error&&<div className="ao-alert error">{s.error}</div>}
  {s.notice&&<div className="ao-alert success">{s.notice}</div>}
  {s.created&&<section className="ao-success-card"><div><span className="ao-check">✓</span><div><strong>{s.notice}</strong><p>{createdEmail&&<>E-mail: <b>{createdEmail}</b></>}{createdBusiness&&<> · Empresa: <b>{createdBusiness.name}</b></>}</p></div></div><div className="ao-success-actions">{createdEmail&&<button type="button" onClick={()=>navigator.clipboard?.writeText(`${createdEmail}\n${dataAccessUrl(s.created?.access_url)}`)}>Copiar acesso</button>}{createdBusiness?.id&&<a href={createdBusiness.owner_id?`/conta?business_id=${encodeURIComponent(createdBusiness.id)}`:'/admin/empresas'}>{createdBusiness.owner_id?'Abrir empresa':'Gerenciar vínculo'}</a>}</div></section>}
  <form className="ao-grid" onSubmit={submit}>
   {(mode==='partner'||mode==='user')&&<section className="ao-card"><span className="ao-kicker">RESPONSÁVEL</span><h2>Dados do usuário</h2><p>O usuário será criado como proprietário de empresa, nunca como administrador.</p><div className="ao-form-grid"><label>Nome completo<input value={user.full_name} onChange={e=>setUser(x=>({...x,full_name:e.target.value}))} placeholder="Nome do responsável" required/></label><label>E-mail<input type="email" value={user.email} onChange={e=>setUser(x=>({...x,email:e.target.value}))} placeholder="responsavel@empresa.com" required/></label><small className="ao-help">Um convite será enviado para este endereço.</small></div></section>}
   {mode==='business'&&<section className="ao-card"><span className="ao-kicker">RESPONSÁVEL</span><h2>Proprietário da empresa</h2><p>Escolha agora ou deixe sem vínculo para conectar um usuário depois.</p><label className="ao-full">Usuário<select value={business.owner_id||''} onChange={e=>updateBusiness('owner_id',e.target.value)}><option value="">Sem proprietário — vincular depois</option>{s.owners.map(o=><option value={o.id} key={o.id}>{o.full_name||o.email||o.id} · {o.role==='admin'?'Administrador':'Proprietário'}</option>)}</select><small>{business.owner_id?'O usuário terá acesso à empresa após o cadastro.':'Sem proprietário, a empresa permanece no plano Grátis até ser vinculada.'}</small></label></section>}
   {mode!=='user'&&<section className="ao-card"><span className="ao-kicker">EMPRESA</span><h2>Dados do negócio</h2><p>Preencha o essencial agora; o proprietário poderá completar o perfil depois.</p><div className="ao-form-grid"><label>Nome da empresa<input value={business.name} onChange={e=>updateBusiness('name',e.target.value)} placeholder="Ex.: Bistrô Laguna" required/></label><label>Slug<input value={business.slug} onChange={e=>updateBusiness('slug',e.target.value)} placeholder="bistro-laguna"/></label><label>Cidade<select value={business.city_id} onChange={e=>updateBusiness('city_id',e.target.value)} required><option value="">Selecione…</option>{s.cities.map(c=><option value={c.id} key={c.id}>{c.name} - {c.state}</option>)}</select></label><label>Categoria<select value={business.category_id} onChange={e=>updateBusiness('category_id',e.target.value)}><option value="">Selecione…</option>{s.categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Status<select value={business.status} onChange={e=>updateBusiness('status',e.target.value)}><option value="pending">Pendente</option><option value="active">Ativa</option></select></label><label>Plano inicial<select value={business.plan_code} onChange={e=>updateBusiness('plan_code',e.target.value)}><option value="free">Grátis</option><option value="pro">Pro</option><option value="premium">Premium</option></select></label><label>Validade do plano<input type="date" value={business.plan_ends_at} onChange={e=>updateBusiness('plan_ends_at',e.target.value)}/><small>Opcional. Deixe vazio para não definir data.</small></label><label>Telefone<input value={business.phone} onChange={e=>updateBusiness('phone',e.target.value)} placeholder="(48) 99999-9999"/></label><label>WhatsApp<input value={business.whatsapp} onChange={e=>updateBusiness('whatsapp',e.target.value)} placeholder="5548999999999"/></label><label>Instagram<input value={business.instagram_url} onChange={e=>updateBusiness('instagram_url',e.target.value)} placeholder="https://instagram.com/empresa"/></label><label>Site<input value={business.website_url} onChange={e=>updateBusiness('website_url',e.target.value)} placeholder="https://empresa.com.br"/></label><label>iFood<input value={business.ifood_url} onChange={e=>updateBusiness('ifood_url',e.target.value)} placeholder="https://www.ifood.com.br/delivery/..."/></label><label>Bairro<input value={business.neighborhood} onChange={e=>updateBusiness('neighborhood',e.target.value)} placeholder="Centro"/></label><label>Endereço<input value={business.address} onChange={e=>updateBusiness('address',e.target.value)} placeholder="Rua, número"/></label><label className="ao-full">Descrição curta<textarea value={business.short_description} onChange={e=>updateBusiness('short_description',e.target.value)} rows="3" maxLength="180" placeholder="Uma apresentação curta da empresa."/></label><label className="ao-full">Descrição<textarea value={business.description} onChange={e=>updateBusiness('description',e.target.value)} rows="5" placeholder="Apresente a empresa com mais detalhes."/></label></div><BusinessServiceOptions values={business} update={updateBusiness}/></section>}
   <div className="ao-footer"><a className="admin-v2-btn" href={mode==='business'?'/admin/empresas':'/admin/usuarios'}>Cancelar</a><button className="admin-v2-btn primary" disabled={!canSubmit||s.busy}>{s.busy?'Criando…':mode==='business'?'Criar empresa':mode==='user'?'Criar usuário':'Criar parceiro'}</button></div>
  </form>
 </AdminShell>
}
function BusinessServiceOptions({values,update}){const items=[['has_delivery','motorcycle','Delivery','Entrega pedidos no endereço do cliente.'],['has_pickup','bag','Retirada no local','Permite retirar pedidos ou produtos no estabelecimento.'],['has_dine_in','utensils','Consumo no local','Recebe clientes para consumir no estabelecimento.']];return <div className="business-service-section"><div className="business-service-head"><div><span className="ao-kicker">ATENDIMENTO</span><strong>Como a empresa atende seus clientes?</strong><small>Selecione todos os formatos oferecidos. Eles serão exibidos no perfil público da empresa.</small></div></div><div className="business-service-grid">{items.map(([key,icon,title,description])=><label className="business-service-option" key={key}><input type="checkbox" checked={Boolean(values[key])} onChange={e=>update(key,e.target.checked)}/><span className="business-service-icon"><Icon name={icon} size={18}/></span><span className="business-service-copy"><strong>{title}</strong><small>{description}</small></span></label>)}</div></div>}

function dataAccessUrl(url){return url||'https://vitrinelocal.net/usuario/login'}

