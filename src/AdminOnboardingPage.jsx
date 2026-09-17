import React,{useEffect,useMemo,useState}from'react'
import{db}from'./supabase-client.js'
import AdminShell from'./AdminShell.jsx'
import'./admin-onboarding.css'

const emptyBusiness={name:'',slug:'',short_description:'',description:'',city_id:'',category_id:'',address:'',neighborhood:'',phone:'',whatsapp:'',instagram_url:'',website_url:'',facebook_url:'',status:'pending',plan_code:'free',plan_ends_at:''}

export default function AdminOnboardingPage({mode='partner'}){
 const[s,setS]=useState({loading:true,allowed:false,session:null,cities:[],categories:[],owners:[],error:'',notice:'',busy:false,created:null})
 const[user,setUser]=useState({full_name:'',email:''})
 const[business,setBusiness]=useState(emptyBusiness)
 const load=async()=>{
  if(!db){setS(x=>({...x,loading:false,error:'Banco indisponível.'}));return}
  const{data:{session}}=await db.auth.getSession()
  if(!session){setS(x=>({...x,loading:false}));return}
  const{data:profile,error:profileError}=await db.from('profiles').select('role,account_status').eq('id',session.user.id).maybeSingle()
  if(profileError||profile?.role!=='admin'||profile?.account_status!=='active'){setS(x=>({...x,loading:false,session,allowed:false}));return}
  const[c,cErr]=await db.from('cities').select('id,name,state').eq('active',true).order('name')
  const[cat,catErr]=await db.from('categories').select('id,name').eq('active',true).order('sort_order').order('name')
  let owners=[]
  if(mode==='business'){
   const{o,error:oErr}=await db.from('profiles').select('id,full_name,username,role').in('role',['business_owner','admin']).eq('account_status','active').order('full_name')
   if(!oErr)owners=o||[]
  }
  setS(x=>({...x,loading:false,allowed:true,session,cities:c||[],categories:cat||[],owners,error:cErr?.message||catErr?.message||''}))
 }
 useEffect(()=>{load()},[mode])
 const title=mode==='business'?'Nova empresa':mode==='user'?'Novo usuário':'Novo parceiro'
 const description=mode==='business'?'Cadastre uma empresa para um proprietário já existente.':mode==='user'?'Crie uma conta de proprietário de empresa pelo painel administrativo.':'Cadastre o responsável e, opcionalmente, a empresa no mesmo fluxo.'
 const updateBusiness=(k,v)=>setBusiness(x=>({...x,[k]:v}))
 const canSubmit=useMemo(()=>{if(mode==='business')return Boolean(business.name.trim()&&business.city_id);if(!user.full_name.trim()||!user.email.trim())return false;if(mode==='partner')return !business.name.trim()||Boolean(business.city_id);return true},[mode,user,business])
 const submit=async(e)=>{
  e.preventDefault();if(!db||!canSubmit||s.busy)return
  setS(x=>({...x,busy:true,error:'',notice:'',created:null}))
  const action=mode==='business'?'create_business':'create_partner'
  const payload=mode==='business'?{action,business}:{action,user,business:{...business,create:mode==='partner'&&Boolean(business.name.trim())}}
  const{data,error}=await db.functions.invoke('admin-onboarding',{body:payload})
  if(error){setS(x=>({...x,busy:false,error:error.message||'Não foi possível concluir o cadastro.'}));return}
  if(data?.error){setS(x=>({...x,busy:false,error:data.error}));return}
  setS(x=>({...x,busy:false,notice:mode==='business'?'Empresa criada com sucesso.':mode==='user'?'Usuário criado com sucesso.':'Parceiro criado com sucesso.',created:data}))
  if(mode==='user')setUser({full_name:'',email:''})
  else if(mode==='business')setBusiness(emptyBusiness)
  else{setUser({full_name:'',email:''});setBusiness(emptyBusiness)}
 }
 const createdEmail=s.created?.user?.email||null
 const createdBusiness=s.created?.business||null
 if(s.loading)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!s.allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><h2>Acesso restrito</h2><span>Esta área é exclusiva para administradores.</span><a className="admin-v2-btn primary" href="/admin">Voltar ao admin</a></div></main></div>
 return <AdminShell active={mode==='business'?'businesses':'users'} title={title} description={description} email={s.session?.user?.email}>
  <div className="ao-actions"><a className="admin-v2-btn" href="/admin/usuarios">Usuários</a><a className="admin-v2-btn" href="/admin/empresas">Empresas</a></div>
  {s.error&&<div className="ao-alert error">{s.error}</div>}
  {s.notice&&<div className="ao-alert success">{s.notice}</div>}
  {s.created&&<section className="ao-success-card"><div><span className="ao-check">✓</span><div><strong>{s.notice}</strong><p>{createdEmail&&<>E-mail: <b>{createdEmail}</b></>}{createdBusiness&&<> · Empresa: <b>{createdBusiness.name}</b></>}</p></div></div><div className="ao-success-actions"><button type="button" onClick={()=>navigator.clipboard?.writeText(createdEmail?`${createdEmail}\n${dataAccessUrl(s.created?.access_url)}`)}>Copiar acesso</button>{createdBusiness?.id&&<a href={`/conta?business_id=${encodeURIComponent(createdBusiness.id)}`}>Abrir empresa</a>}</div></section>}
  <form className="ao-grid" onSubmit={submit}>
   {(mode==='partner'||mode==='user')&&<section className="ao-card"><span className="ao-kicker">RESPONSÁVEL</span><h2>Dados do usuário</h2><p>O usuário será criado como proprietário de empresa, nunca como administrador.</p><div className="ao-form-grid"><label>Nome completo<input value={user.full_name} onChange={e=>setUser(x=>({...x,full_name:e.target.value}))} placeholder="Nome do responsável" required/></label><label>E-mail<input type="email" value={user.email} onChange={e=>setUser(x=>({...x,email:e.target.value}))} placeholder="responsavel@empresa.com" required/><small className="ao-help">Um convite será enviado para este endereço.</small></div></section>}
   {mode==='business'&&<section className="ao-card"><span className="ao-kicker">RESPONSÁVEL</span><h2>Proprietário da empresa</h2><p>Escolha o usuário que será dono da empresa.</p><label className="ao-full">Usuário<select value={business.owner_id||''} onChange={e=>updateBusiness('owner_id',e.target.value)} required><option value="">Selecione o proprietário…</option>{s.owners.map(o=><option value={o.id} key={o.id}>{o.full_name||o.username||o.id} · {o.role==='admin'?'Administrador':'Proprietário'}</option>)}</select></label></section>}
   {mode!=='user'&&<section className="ao-card"><span className="ao-kicker">EMPRESA</span><h2>Dados do negócio</h2><p>Preencha o essencial agora; o proprietário poderá completar o perfil depois.</p><div className="ao-form-grid"><label>Nome da empresa<input value={business.name} onChange={e=>updateBusiness('name',e.target.value)} placeholder="Ex.: Bistrô Laguna" required/></label><label>Slug<input value={business.slug} onChange={e=>updateBusiness('slug',e.target.value)} placeholder="bistro-laguna"/></label><label>Cidade<select value={business.city_id} onChange={e=>updateBusiness('city_id',e.target.value)} required><option value="">Selecione…</option>{s.cities.map(c=><option value={c.id} key={c.id}>{c.name} - {c.state}</option>)}</select></label><label>Categoria<select value={business.category_id} onChange={e=>updateBusiness('category_id',e.target.value)}><option value="">Selecione…</option>{s.categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Status<select value={business.status} onChange={e=>updateBusiness('status',e.target.value)}><option value="pending">Pendente</option><option value="active">Ativa</option></select></label><label>Plano inicial<select value={business.plan_code} onChange={e=>updateBusiness('plan_code',e.target.value)}><option value="free">Grátis</option><option value="pro">Pro</option><option value="premium">Premium</option></select></label><label>Validade do plano<input type="date" value={business.plan_ends_at} onChange={e=>updateBusiness('plan_ends_at',e.target.value)}/><small>Opcional. Deixe vazio para não definir data.</small></label><label>Telefone<input value={business.phone} onChange={e=>updateBusiness('phone',e.target.value)} placeholder="(48) 99999-9999"/></label><label>WhatsApp<input value={business.whatsapp} onChange={e=>updateBusiness('whatsapp',e.target.value)} placeholder="5548999999999"/></label><label>Instagram<input value={business.instagram_url} onChange={e=>updateBusiness('instagram_url',e.target.value)} placeholder="https://instagram.com/empresa"/></label><label>Site<input value={business.website_url} onChange={e=>updateBusiness('website_url',e.target.value)} placeholder="https://empresa.com.br"/></label><label>Bairro<input value={business.neighborhood} onChange={e=>updateBusiness('neighborhood',e.target.value)} placeholder="Centro"/></label><label>Endereço<input value={business.address} onChange={e=>setBusiness(x=>({...x,address:e.target.value}))} placeholder="Rua, número"/></label><label className="ao-full">Descrição curta<textarea value={business.short_description} onChange={e=>updateBusiness('short_description',e.target.value)} rows="3" maxLength="180" placeholder="Uma apresentação curta da empresa."/></label><label className="ao-full">Descrição<textarea value={business.description} onChange={e=>updateBusiness('description',e.target.value)} rows="5" placeholder="Apresente a empresa com mais detalhes."/></label></div></section>}
   <div className="ao-footer"><a className="admin-v2-btn" href={mode==='business'?'/admin/empresas':'/admin/usuarios'}>Cancelar</a><button className="admin-v2-btn primary" disabled={!canSubmit||s.busy}>{s.busy?'Criando…':mode==='business'?'Criar empresa':mode==='user'?'Criar usuário':'Criar parceiro'}</button></div>
  </form>
 </AdminShell>
}
function dataAccessUrl(url){return url||'https://vitrinelocal.net/usuario/login'}
