import React,{useEffect,useMemo,useState}from'react'
import{getBusinessReviews,getReviewSummary,getSession,onAuthStateChange,submitReview}from'./review-service.js'
import'./business-reviews.css'

const loginPath=()=>'/usuario/login?next='+encodeURIComponent(location.pathname+location.search+location.hash)
const signupPath=()=>'/usuario/cadastro?next='+encodeURIComponent(location.pathname+location.search+location.hash)

export default function BusinessReviews({businessId}){
 const[d,setD]=useState({avg:0,count:0,rows:[],me:null,session:null,distribution:{1:0,2:0,3:0,4:0,5:0},loading:true,error:''})
 const[r,setR]=useState(5),[c,setC]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')

 const load=async()=>{
  const results=await Promise.all([getReviewSummary(businessId),getBusinessReviews(businessId,50),getSession()])
  const summary=results[0]?.data?.[0]||{}
  const rows=results[1]?.data||[]
  const session=results[2]||null
  const me=rows.find(x=>x.is_mine)||null
  if(me){setR(me.rating);setC(me.comment||'')}
  setD({avg:Number(summary.avg_rating||0),count:Number(summary.review_count||0),rows,me,session,distribution:{1:Number(summary.one_star||0),2:Number(summary.two_stars||0),3:Number(summary.three_stars||0),4:Number(summary.four_stars||0),5:Number(summary.five_stars||0)},loading:false,error:results[1]?.error?.message||results[0]?.error?.message||''})
 }

 useEffect(()=>{
  let live=true
  const start=async()=>{try{await load()}catch(e){if(live)setD(x=>({...x,loading:false,error:e?.message||'Não foi possível carregar as avaliações.'}))}}
  start()
  const auth=onAuthStateChange(()=>{if(live)setTimeout(()=>{if(live)load().catch(()=>{})},0)})
  return()=>{live=false;auth?.data?.subscription?.unsubscribe?.()}
 },[businessId])

 async function save(){
  setNotice('')
  if(!d.session){location.href=loginPath();return}
  setBusy(true)
  const{error}=await submitReview(businessId,r,c)
  setBusy(false)
  if(error){setNotice(error.message||'Não foi possível publicar sua avaliação.');return}
  setNotice(d.me?'Sua avaliação foi atualizada.':'Sua avaliação foi publicada com sucesso.')
  await load()
 }

 const bars=useMemo(()=>[5,4,3,2,1].map(n=>({n,count:d.distribution[n]||0,pct:d.count?Math.round((d.distribution[n]||0)/d.count*100):0})),[d.distribution,d.count])
 const scoreLabel=d.count?`${d.count} ${d.count===1?'avaliação':'avaliações'}`:'Ainda não há avaliações'

 return <section className="vl-reviews" aria-label="Avaliações dos clientes">
  <div className="vl-reviews-head">
   <div><span>REPUTAÇÃO</span><h2>Avaliações dos clientes</h2><p>Veja a experiência de quem já conheceu esta empresa.</p></div>
   <div className="vl-reviews-score"><strong>{d.avg.toFixed(1)}</strong><span aria-label={`${d.avg.toFixed(1)} de 5 estrelas`}>★★★★★</span><small>{scoreLabel}</small></div>
  </div>
  <div className="vl-reviews-summary">
   <div className="vl-review-breakdown">{bars.map(x=><div className="vl-review-bar" key={x.n}><span>{x.n} <b>★</b></span><i><b style={{width:`${x.pct}%`}}/></i><em>{x.count}</em></div>)}</div>
   <div className="vl-review-meta"><div><strong>{d.count}</strong><span>Avaliações</span></div><div><strong>{d.avg?d.avg.toFixed(1):'—'}</strong><span>Nota média</span></div></div>
  </div>
  {d.loading?<div className="vl-review-login vl-review-auth-loading"><div><strong>Verificando sua conta…</strong><span>Estamos preparando a área de avaliação.</span></div></div>:d.session?<div className="vl-review-form">
   <span>{d.me?'SUA AVALIAÇÃO':'DEIXE SUA AVALIAÇÃO'}</span><h3>{d.me?'Como foi sua experiência?':'Ajude outras pessoas a escolher.'}</h3>
   <div className="vl-review-stars-input" role="radiogroup" aria-label="Escolha uma nota de 1 a 5"><small>{r}/5</small>{[1,2,3,4,5].map(n=><button key={n} type="button" className={n<=r?'active':''} onClick={()=>setR(n)} aria-label={`${n} estrelas`} aria-pressed={n<=r}>★</button>)}</div>
   <textarea value={c} maxLength={1000} onChange={e=>setC(e.target.value)} placeholder="Conte sua experiência (opcional)." aria-label="Comentário da avaliação"/>
   <div className="vl-review-form-foot"><small>{c.length}/1000</small><button onClick={save} disabled={busy}>{busy?'Salvando…':d.me?'Atualizar avaliação':'Publicar avaliação'}</button></div>
   {notice&&<div className={`vl-reviews-alert ${notice.includes('sucesso')||notice.includes('atualizada')?'success':''}`}>{notice}</div>}
  </div>:<div className="vl-review-login"><div><strong>Quer avaliar esta empresa?</strong><span>Crie sua conta gratuita ou entre para compartilhar sua experiência.</span></div><div className="vl-review-login-actions"><a href={loginPath()}>Entrar</a><a className="primary" href={signupPath()}>Criar conta</a></div></div>}
  {d.error&&<div className="vl-reviews-alert">Não foi possível carregar todas as informações das avaliações.</div>}
  <div className="vl-review-list">
   {d.loading?<div className="vl-review-empty">Carregando avaliações…</div>:d.rows.length===0?<div className="vl-review-empty"><strong>Seja a primeira pessoa a avaliar.</strong><span> Sua experiência pode ajudar outros clientes.</span></div>:d.rows.map(x=><article key={x.id}>
    <div className="vl-review-item-head">
     <div className="vl-review-avatar" aria-hidden="true">{String(x.reviewer_name||'U').trim().charAt(0).toUpperCase()}</div>
     <div><strong>{x.reviewer_name}</strong><span>{new Date(x.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</span></div>
     <b>{'★'.repeat(x.rating)}</b>
    </div>
    {x.edited_at&&<div className="vl-review-edited" title="Esta avaliação foi editada pela administração">✎ Editado por administrador</div>}
    {x.comment&&<p>{x.comment}</p>}
    {x.owner_response&&<aside className="vl-review-response"><strong>Resposta da empresa</strong><p>{x.owner_response}</p></aside>}
   </article>)}
  </div>
 </section>
}
