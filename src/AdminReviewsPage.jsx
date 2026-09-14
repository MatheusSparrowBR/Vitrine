import React,{useEffect,useMemo,useState}from'react'
import{db}from'./supabase-client.js'
import AdminShell from'./AdminShell.jsx'
import'./admin-reviews.css'

const dateFormat=new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'})
const starLabel=rating=>Array.from({length:5},(_,i)=>i<Number(rating)?'★':'☆').join('')

export default function AdminReviewsPage(){
 const[s,setS]=useState({loading:true,allowed:false,reviews:[],reports:[],businesses:[],status:'all',businessId:'',search:'',error:'',notice:'',editingId:null,draft:{rating:5,comment:''},saving:false})
 const load=async(nextFilters={})=>{
  if(!db){setS(x=>({...x,loading:false,error:'Banco indisponível.'}));return}
  const{data:{session}}=await db.auth.getSession()
  if(!session){setS(x=>({...x,loading:false}));return}
  const{data:p}=await db.from('profiles').select('role').eq('id',session.user.id).maybeSingle()
  if(p?.role!=='admin'){setS(x=>({...x,loading:false,allowed:false}));return}
  const status=nextFilters.status??s.status
  const businessId=nextFilters.businessId??s.businessId
  let rq=db.from('business_reviews').select('id,business_id,reviewer_name,rating,comment,owner_response,created_at,updated_at,status,edited_at,edited_by,businesses(name)').order('created_at',{ascending:false}).limit(300)
  if(status!=='all')rq=rq.eq('status',status)
  if(businessId)rq=rq.eq('business_id',businessId)
  const[{data:reviews,error},{data:reports,error:reportsError},{data:businesses,error:businessError}]=await Promise.all([
   rq,
   db.from('business_review_reports').select('id,review_id,reason,details,status,created_at,business_reviews(reviewer_name,business_id,businesses(name))').order('created_at',{ascending:false}).limit(200),
   db.from('businesses').select('id,name,status').order('name')
  ])
  setS(x=>({...x,loading:false,allowed:true,reviews:reviews||[],reports:reports||[],businesses:businesses||[],status,businessId,error:error?.message||reportsError?.message||businessError?.message||''}))
 }
 useEffect(()=>{load({status:s.status,businessId:s.businessId})},[s.status,s.businessId])
 const filtered=useMemo(()=>{const term=s.search.trim().toLowerCase();if(!term)return s.reviews;return s.reviews.filter(r=>[r.businesses?.name,r.reviewer_name,r.comment,r.owner_response].filter(Boolean).join(' ').toLowerCase().includes(term))},[s.reviews,s.search])
 const startEdit=r=>setS(x=>({...x,editingId:r.id,draft:{rating:Number(r.rating)||5,comment:r.comment||''},notice:'',error:''}))
 const cancelEdit=()=>setS(x=>({...x,editingId:null,notice:'',saving:false}))
 const saveEdit=async r=>{const rating=Math.max(1,Math.min(5,Number(s.draft.rating)||5)),comment=String(s.draft.comment||'').trim();if(comment.length>1000){setS(x=>({...x,error:'O comentário deve ter no máximo 1000 caracteres.'}));return}setS(x=>({...x,saving:true,error:'',notice:''}));const{error}=await db.from('business_reviews').update({rating,comment}).eq('id',r.id);if(error){setS(x=>({...x,saving:false,error:error.message}));return}setS(x=>({...x,saving:false,editingId:null,notice:'Avaliação atualizada. O sistema registrou a edição administrativa.'}));await load({status:s.status,businessId:s.businessId})}
 const moderate=async(id,status)=>{setS(x=>({...x,error:'',notice:''}));const{error}=await db.from('business_reviews').update({status,hidden_at:status==='hidden'?new Date().toISOString():null,hidden_reason:status==='hidden'?'Ocultada pela administração':null}).eq('id',id);if(error){setS(x=>({...x,error:error.message}));return}setS(x=>({...x,notice:status==='hidden'?'Avaliação ocultada.':'Avaliação publicada.'}));await load({status:s.status,businessId:s.businessId})}
 if(s.loading)return <div className="admin-v2-shell"><div className="admin-v2-empty">Carregando avaliações…</div></div>
 if(!s.allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Faça login com uma conta administradora para continuar.</span></div></main></div>
 return <AdminShell active="reviews" title="Avaliações" description="Gerencie a reputação pública, encontre avaliações por empresa e faça ajustes com rastreabilidade.">
  <section className="ar-overview"><div><span className="ar-kicker">CENTRAL DE REPUTAÇÃO</span><h2>Moderação de avaliações</h2><p>Filtre por empresa, revise o conteúdo e edite quando necessário.</p></div><div className="ar-count"><strong>{filtered.length}</strong><span>avaliações na lista</span></div></section>
  {s.notice&&<div className="ar-notice success">{s.notice}</div>}{s.error&&<div className="ar-notice error">{s.error}</div>}
  <section className="ar-filters"><div className="ar-filter-main"><label><span>Empresa</span><select value={s.businessId} onChange={e=>setS(x=>({...x,businessId:e.target.value}))}><option value="">Todas as empresas</option>{s.businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="ar-search"><span>Buscar</span><input value={s.search} onChange={e=>setS(x=>({...x,search:e.target.value}))} placeholder="Empresa, cliente ou texto da avaliação…"/></label></div><div className="ar-status-tabs" role="tablist" aria-label="Status das avaliações">{['all','published','hidden'].map(status=><button key={status} className={s.status===status?'active':''} onClick={()=>setS(x=>({...x,status}))}>{status==='all'?'Todas':status==='published'?'Publicadas':'Ocultadas'}</button>)}</div></section>
  <section className="ar-results-head"><div><strong>{filtered.length}</strong> resultado{filtered.length===1?'':'s'}</div><span>As alterações administrativas ficam identificadas publicamente.</span></section>
  {filtered.length===0?<div className="ar-empty"><strong>Nenhuma avaliação encontrada.</strong><span>Tente outra empresa, status ou termo de busca.</span></div>:<div className="ar-grid">{filtered.map(r=>{const editing=s.editingId===r.id;return <article className={`ar-card ${editing?'is-editing':''}`} key={r.id}>
    <header className="ar-card-head"><div className="ar-company"><strong>{r.businesses?.name||'Empresa'}</strong><span>{r.reviewer_name} · {dateFormat.format(new Date(r.created_at))}</span></div><div className="ar-rating" aria-label={`${r.rating} de 5 estrelas`}>{starLabel(r.rating)} <b>{r.rating}/5</b></div></header>
    {r.edited_at&&<div className="ar-edited"><span>✎</span> Editado por administrador · {dateFormat.format(new Date(r.edited_at))}</div>}
    {editing?<div className="ar-editor"><label><span>Nota</span><div className="ar-editor-stars">{[1,2,3,4,5].map(n=><button type="button" key={n} className={n<=s.draft.rating?'active':''} onClick={()=>setS(x=>({...x,draft:{...x.draft,rating:n}}))} aria-label={`${n} estrelas`}>★</button>)}</div></label><label><span>Comentário</span><textarea value={s.draft.comment} maxLength={1000} onChange={e=>setS(x=>({...x,draft:{...x.draft,comment:e.target.value}}))}/><small>{s.draft.comment.length}/1000</small></label><div className="ar-editor-actions"><button type="button" className="ar-btn ghost" onClick={cancelEdit}>Cancelar</button><button type="button" className="ar-btn primary" disabled={s.saving} onClick={()=>saveEdit(r)}>{s.saving?'Salvando…':'Salvar alterações'}</button></div></div>:<><div className="ar-comment">{r.comment||'Sem comentário.'}</div>{r.owner_response&&<aside className="ar-response"><b>Resposta da empresa</b><p>{r.owner_response}</p></aside>}</>}
    <footer className="ar-card-footer"><div className="ar-footer-status"><span className={`ar-status ${r.status}`}>{r.status==='published'?'Publicado':'Ocultado'}</span>{r.edited_at&&<span className="ar-history">Histórico atualizado</span>}</div>{!editing&&<div className="ar-card-actions"><button className="ar-btn ghost" onClick={()=>startEdit(r)}>Editar</button>{r.status==='published'?<button className="ar-btn danger" onClick={()=>moderate(r.id,'hidden')}>Ocultar</button>:<button className="ar-btn primary" onClick={()=>moderate(r.id,'published')}>Publicar</button>}</div>}</footer>
   </article>})}</div>}
  <section className="ar-reports"><div className="ar-reports-heading"><div><span className="ar-kicker">MODERAÇÃO</span><h2>Denúncias recebidas</h2><p>Confira relatos enviados sobre avaliações públicas.</p></div><span className="ar-report-count">{s.reports.length}</span></div>{s.reports.length===0?<div className="ar-empty compact"><strong>Nenhuma denúncia registrada.</strong><span>As denúncias aparecerão aqui quando houver relatos.</span></div>:<div className="ar-report-list">{s.reports.map(x=><article className="ar-report" key={x.id}><div><strong>{x.business_reviews?.businesses?.name||'Empresa'}</strong><span>{x.business_reviews?.reviewer_name||'Avaliação'} · {x.reason}</span></div><p>{x.details||'Sem detalhes.'}</p><small>{dateFormat.format(new Date(x.created_at))}</small></article>)}</div>}</section>
 </AdminShell>
}
