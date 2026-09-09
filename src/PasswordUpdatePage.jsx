import React,{useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import './auth-page.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null

export default function PasswordUpdatePage(){
 const [ready,setReady]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{
  if(!db){setReady(true);return}
  let active=true
  const check=async()=>{
   const {data}=await db.auth.getSession()
   if(active)setReady(Boolean(data.session))
  }
  check()
  const sub=db.auth.onAuthStateChange((_event,session)=>{if(active)setReady(Boolean(session))})
  return()=>{active=false;sub.data.subscription.unsubscribe()}
 },[])
 async function submit(e){
  e.preventDefault();setError('');setMsg('')
  if(password.length<8)return setError('A nova senha deve ter pelo menos 8 caracteres.')
  if(password!==confirm)return setError('As senhas não conferem.')
  if(!db)return setError('Autenticação indisponível.')
  setBusy(true)
  const {error:updateError}=await db.auth.updateUser({password})
  setBusy(false)
  if(updateError)return setError(updateError.message||'Não foi possível atualizar sua senha.')
  setPassword('');setConfirm('');setMsg('Senha atualizada com sucesso. Redirecionando…')
  window.setTimeout(()=>{location.href='/laguna'},900)
 }
 if(!ready)return <div className="vl-auth-page"><div className="vl-auth-card"><span className="section-kicker">SEGURANÇA DA CONTA</span><h1>Verificando acesso…</h1><p>Validando seu link de recuperação.</p></div></div>
 return <div className="vl-auth-page"><div className="vl-auth-card"><a className="brand" href="/laguna"><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a><span className="section-kicker">SEGURANÇA DA CONTA</span><h1>Atualize sua senha</h1><p>Escolha uma nova senha com pelo menos 8 caracteres para continuar usando o VitrineLocal.</p>{error&&<div className="auth-alert error">{error}</div>}{msg&&<div className="auth-alert">{msg}</div>}<form onSubmit={submit}><label>Nova senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete="new-password"/></label><label>Confirmar nova senha<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8} autoComplete="new-password"/></label><button className="primary wide" disabled={busy}>{busy?'Atualizando…':'Atualizar senha'}</button></form><a className="auth-back" href="/login">← Voltar para o login</a></div></div>
}
