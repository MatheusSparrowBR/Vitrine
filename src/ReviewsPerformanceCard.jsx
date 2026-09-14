import React,{useEffect,useMemo,useState}from'react'
import{addOwnerResponse,getBusinessReviews,getReviewSummary}from'./review-service.js'
import'./review-performance.css'

const fmtDate=value=>value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):''
const initials=name=>String(name||'U').trim().slice(0,1).toUpperCase()

export default function ReviewsPerformanceCard({businessId}){
 const[d,setD]=useState({avg:0,count:0,rows:[],distribution:{1:0,2:0,3:0,4:0,5:0},loading:true,error:''})
 const[filter,setFilter]=useState('all'),[sort,setSort]=useState('recent'),[openId,setOpenId]=useState(null),[drafts,setDrafts]=useState({}),[busyId,setBusyId]=useState(''),[notice,setNotice]=useState('')
 const load=async()=>{
  const[{data:summary,error:summaryError},{data:reviews,error:reviewsError}]=await Promise.all([getReviewSummary(businessId),getBusinessReviews(businessId,50)])
  const s=summary?.[0]||{},rows=reviews||[]
  setD({avg:Number(s.avg_rating||0),count:Number(s.review_count||0),rows,distribution:{1:Number(s.one_star||0),2:Number(s.two_stars||0),3:Number(s.three_stars||0),4:Number(s.four_stars||0),5:Number(s.five_stars||0)},loading:false,error:reviewsError?.message||summaryError?.message||''})
 }
 useEffect(()=>{
  let live=true
  if(!businessId)return
  ;(async()=>{try{await load()}catch(error){if(live)setD(x=>({...x,loading:false,error:error?.message||'Não foi possível carregar as avaliações.'}))}})()
  return()=>{live=false}
 },[businessId])
 const responded=d.rows.filter(r=>Boolean(r.owner_response)).length
 const waiting=Math.max(0,d.count-responded)
 const filtered=useMemo(()=>{
  const rows=d.rows.filter(r=>filter==='responded'?Boolean(r.owner_response):filter==='waiting'?!r.owner_response:true)
  return [...rows].sort((a,b)=>sort==='highest'?(b.rating||0)-(a.rating||0):sort==='lowest'?(a.rating||0)-(b.rating||0):new Date(b.created_at)-new Date(a.created_at))
 },[d.rows,filter,sort])
 const bars=[5,4,3,2,1].map(n=>({n,count:d.distribution[n]||0,pct:d.count?Math.round((d.distribution[n]||0)/d.count*100):0}))
 const responseRate=d.count?Math.round((responded/d.count)*100):0
 const updateDraft=(id,value)=>setDrafts(x=>({...x,[id]:value}))
 async function saveResponse(review){
  const response=String(drafts[review.id]??review.owner_response??'').trim()
  if(!response){setNotice('Escreva uma resposta antes de salvar.');return}
  setBusyId(review.id);setNotice('')
  const{error}=await addOwnerResponse(review.id,response)
  setBusyId('')
  if(error){setNotice(error.message||'Não foi possível salvar a resposta.');return}
  setNotice('Resposta publicada com sucesso.')
  setOpenId(null)
  setDrafts(x=>{const next={...x};delete next[review.id];return next})
  await load()
 }
 return <section className="vp-card" aria-label="Desempenho das avaliações">
  <header className="vp-head">
   <div><span className="vp-eyebrow">REPUTAÇÃO</span><h2>Sua reputação no VitrineLocal</h2><p>Transforme cada avaliação em confiança, relacionamento e novas oportunidades.</p></div>
   <div className="vp-score-box"><strong>{d.avg.toFixed(1)}</strong><span aria-label={`${d.avg.toFixed(1)} de 5 estrelas`}>★★★★★</span><small>{d.count} {d.count===1?'avaliação':'avaliações'}</small></div>
  </header>
  {d.loading?<div className="vp-loading"><i/>Carregando sua reputação…</div>:<>
   <div className="vp-overview">
    <div className="vp-breakdown"><div className="vp-section-title"><strong>Distribuição das notas</strong><span>últimas avaliações</span></div>{bars.map(x=><div className="vp-bar" key={x.n}><span>{x.n} <b>★</b></span><div><i style={{width:`${x.pct}%`}}/></div><em>{x.count}</em></div>)}</div>
    <div className="vp-health"><div className="vp-health-top"><span>ATENDIMENTO</span><b>{responseRate}% respondidas</b></div><div className="vp-health-grid"><div><strong>{d.count}</strong><small>Total</small></div><div><strong>{responded}</strong><small>Respondidas</small></div><div className={waiting?'attention':''}><strong>{waiting}</strong><small>Aguardando</small></div></div><div className="vp-progress"><i style={{width:`${responseRate}%`}}/></div><small className="vp-health-caption">Responder avaliações mostra cuidado e aumenta a confiança de quem visita seu perfil.</small></div>
   </div>
   <div className="vp-toolbar"><div className="vp-filters" role="tablist" aria-label="Filtrar avaliações"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Todas <b>{d.count}</b></button><button className={filter==='waiting'?'active':''} onClick={()=>setFilter('waiting')}>Aguardando <b>{waiting}</b></button><button className={filter==='responded'?'active':''} onClick={()=>setFilter('responded')}>Respondidas <b>{responded}</b></button></div><label className="vp-sort">Ordenar<select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Mais recentes</option><option value="highest">Maior nota</option><option value="lowest">Menor nota</option></select></label></div>
   {notice&&<div className="vp-notice">{notice}</div>}
   {d.error&&<div className="vp-error">Não foi possível carregar todas as informações das avaliações.</div>}
   <div className="vp-list">{filtered.length===0?<div className="vp-empty"><div>☆</div><strong>{d.count?'Nenhuma avaliação neste filtro':'Sua empresa ainda não recebeu avaliações'}</strong><span>{d.count?'Troque o filtro para visualizar outras avaliações.':'As primeiras avaliações aparecerão aqui assim que os clientes começarem a avaliar.'}</span></div>:filtered.map(review=>{
    const expanded=openId===review.id,draft=drafts[review.id]??review.owner_response??''
    return <article className={`vp-review ${expanded?'open':''}`} key={review.id}>
     <div className="vp-review-head"><div className="vp-avatar">{review.reviewer_avatar_url?<img src={review.reviewer_avatar_url} alt=""/>:<span>{initials(review.reviewer_name)}</span>}</div><div className="vp-reviewer"><strong>{review.reviewer_name||'Usuário do VitrineLocal'}</strong>{review.reviewer_username&&<small>@{review.reviewer_username}</small>}<time>{fmtDate(review.created_at)}</time></div><div className="vp-rating"><span>{'★'.repeat(Number(review.rating)||0)}</span><b>{Number(review.rating)||0}/5</b></div></div>
     {review.edited_at&&<div className="vp-edited">✎ Editado pela administração</div>}
     <p className="vp-comment">{review.comment||'O cliente não deixou um comentário por escrito.'}</p>
     {review.owner_response&&!expanded&&<div className="vp-response"><div><span>SUA RESPOSTA</span><time>{fmtDate(review.owner_response_at)}</time></div><p>{review.owner_response}</p><button onClick={()=>{setDrafts(x=>({...x,[review.id]:review.owner_response}));setOpenId(review.id)}}>Editar resposta</button></div>}
     {!review.owner_response&&!expanded&&<button className="vp-reply-button" onClick={()=>{setDrafts(x=>({...x,[review.id]:''}));setOpenId(review.id)}}>Responder avaliação <span>→</span></button>}
     {expanded&&<div className="vp-composer"><div className="vp-composer-head"><div><span>RESPOSTA DA EMPRESA</span><strong>{review.owner_response?'Atualize sua resposta':'Mostre que você ouviu o cliente'}</strong></div><button aria-label="Fechar resposta" onClick={()=>setOpenId(null)}>×</button></div><textarea value={draft} maxLength={1000} onChange={e=>updateDraft(review.id,e.target.value)} placeholder="Escreva uma resposta profissional, cordial e útil…"/><div className="vp-composer-foot"><small>{draft.length}/1000</small><div><button className="secondary" onClick={()=>setOpenId(null)}>Cancelar</button><button className="primary" disabled={busyId===review.id} onClick={()=>saveResponse(review)}>{busyId===review.id?'Salvando…':'Publicar resposta'}</button></div></div></div>}
    </article>
   })}</div>
  </>}
 </section>
}
