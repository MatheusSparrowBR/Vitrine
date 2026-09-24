import React,{useCallback,useEffect,useState}from'react'
import AdminShell from './AdminShell.jsx'
import { db } from './supabase-client.js'
import './admin-invitations.css'

function formatDate(value){try{const date=new Date(value);if(Number.isNaN(date.getTime()))return '—';return new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(date)}catch{return '—'}}

export default function AdminInvitationsPage(){
 const[state,setState]=useState({loading:true,pending:[],history:[],error:'',notice:'',busyId:null})
 const load=useCallback(async()=>{
  setState(x=>({...x,loading:true,error:''}))
  try{
   if(!db)throw new Error('Banco indisponível.')
   const{data:{session}}=await db.auth.getSession()
   if(!session)throw new Error('Sessão administrativa não encontrada.')
   const{data,error}=await db.functions.invoke('admin-invitations',{body:{action:'list'}})
   if(error)throw error
   if(data?.error)throw new Error(data.error)
   setState(x=>({...x,loading:false,pending:Array.isArray(data?.pending)?data.pending:[],history:Array.isArray(data?.history)?data.history:[],error:data?.history_error||''}))
  }catch(error){
   setState(x=>({...x,loading:false,error:error?.message||'Não foi possível carregar os convites.'}))
  }
 },[])

 useEffect(()=>{load()},[load])

 const action=async(userId,type)=>{
  setState(x=>({...x,busyId:userId,error:'',notice:''}))
  try{
   if(!db)throw new Error('Banco indisponível.')
   const{data,error}=await db.functions.invoke('admin-invitations',{body:{action:type,user_id:userId}})
   if(error)throw error
   if(data?.error)throw new Error(data.error)
   if(type==='generate_link'){
    await navigator.clipboard?.writeText(data.invite_link||'')
    setState(x=>({...x,busyId:null,notice:'Novo link de convite gerado e copiado para a área de transferência.'}))
   }else if(type==='cancel'){
    setState(x=>({...x,busyId:null,notice:'Convite cancelado. A conta pendente foi removida e poderá ser convidada novamente.'}))
   }else{
    setState(x=>({...x,busyId:null,notice:'Convite cancelado e reenviado com sucesso.'}))
   }
   await load()
  }catch(error){
   setState(x=>({...x,busyId:null,error:error?.message||'Não foi possível concluir a operação.'}))
  }
 }

 const cancel=async(item)=>{
  if(!window.confirm('Cancelar o convite de '+item.email+'? A conta pendente será removida e poderá ser convidada novamente.'))return
  await action(item.id,'cancel')
 }
 const resend=async(item)=>{
  if(!window.confirm('Cancelar o convite atual e enviar um novo convite para '+item.email+'?'))return
  await action(item.id,'cancel_and_resend')
 }

 return <AdminShell active="invitations" title="Convites" description="Acompanhe convites enviados pelo painel, gere links novamente ou cancele convites pendentes." >
  {state.notice&&<div className="ai-notice success">{state.notice}</div>}
  {state.error&&<div className="ai-notice error">{state.error}</div>}

  <section className="ai-hero">
   <div><span className="ai-kicker">AUTENTICAÇÃO</span><h2>Convites enviados</h2><p>Um convite pendente significa que a conta existe no Auth, mas o usuário ainda não confirmou o e-mail e não concluiu o acesso.</p></div>
   <div className="ai-hero-stat"><strong>{state.pending.length}</strong><span>pendentes agora</span></div>
  </section>

  <section className="ai-card">
   <div className="ai-card-head"><div><span className="ai-kicker">PENDENTES</span><h3>Convites que ainda podem ser gerenciados</h3></div><button className="admin-v2-btn" type="button" onClick={load} disabled={state.loading}>{state.loading?'Atualizando…':'Atualizar'}</button></div>
   {state.loading&&!state.pending.length?<div className="ai-empty">Carregando convites…</div>:!state.pending.length?<div className="ai-empty"><strong>Nenhum convite pendente.</strong><span>Quando um usuário for convidado e ainda não criar o acesso, ele aparecerá aqui.</span></div>:<div className="ai-table-wrap"><table className="ai-table"><thead><tr><th>Usuário</th><th>Convite enviado</th><th>Empresa</th><th>Ações</th></tr></thead><tbody>{state.pending.map(item=><tr key={item.id}><td><strong>{item.full_name||'Usuário sem nome'}</strong><small>{item.email}</small></td><td>{item.invited_at?formatDate(item.invited_at):'—'}</td><td>{item.business?<><strong>{item.business.name}</strong><small>{item.business.status}</small></>:<span className="ai-muted">Sem empresa vinculada</span>}</td><td><div className="ai-actions"><button disabled={state.busyId===item.id} onClick={()=>action(item.id,'generate_link')}>Novo link</button><button disabled={state.busyId===item.id} onClick={()=>resend(item)}>Cancelar e reenviar</button><button className="danger" disabled={state.busyId===item.id} onClick={()=>cancel(item)}>Cancelar</button></div></td></tr>)}</tbody></table></div>}
  </section>

  <section className="ai-card">
   <div className="ai-card-head"><div><span className="ai-kicker">HISTÓRICO</span><h3>Últimas operações com convites</h3><p className="ai-history-help">Convites que ainda não foram concluídos mostram as ações de cancelar, reenviar e gerar um novo link.</p></div></div>
   {state.history.length===0?<div className="ai-empty"><strong>Nenhum registro disponível.</strong></div>:<div className="ai-history">{state.history.map(item=><article className="ai-history-row" key={item.id}><div><strong>{item.email}</strong><small>{item.full_name}</small></div><div className="ai-history-status"><span className={'ai-history-badge '+(item.status==='pending'?'pending':item.status==='completed'?'completed':'cancelled')}>{item.status==='pending'?'Pendente':item.status==='completed'?'Concluído':'Cancelado'}</span><span className="ai-history-operation">{item.action==='user_created'?'Convite criado':item.action==='invite_resent'?'Convite reenviado':'Convite cancelado'}</span></div><div className="ai-history-meta"><time>{formatDate(item.created_at)}</time>{item.can_manage&&item.entity_id&&<div className="ai-history-actions"><button disabled={state.busyId===item.entity_id} onClick={()=>action(item.entity_id,'generate_link')}>Gerar novo link</button><button disabled={state.busyId===item.entity_id} onClick={()=>resend({id:item.entity_id,email:item.email})}>Cancelar e reenviar</button><button className="danger" disabled={state.busyId===item.entity_id} onClick={()=>cancel({id:item.entity_id,email:item.email})}>Cancelar</button></div>}</div></article>)}</div>}
  </section>
 </AdminShell>
}
