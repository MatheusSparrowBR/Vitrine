import React,{useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import './auth-page.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null

function isWeakPasswordError(error){
 return Boolean(error&&(error.code==='weak_password'||error.name==='AuthWeakPasswordError'||/senha.*(8|fraca)|password.*(weak|strength)/i.test(error.message||'')))
}

export default function AuthPage(){
 const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[msg,setMsg]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const next=new URLSearchParams(location.search).get('next')||'/laguna'
 async function sendRecovery(targetEmail=email){
  if(!db||!targetEmail)return false
  const {error:resetError}=await db.auth.resetPasswordForEmail(targetEmail,{redirectTo:`${location.origin}/atualizar-senha`})
  if(resetError)throw resetError
  return true
 }
 async function submit(e){
  e.preventDefault();setBusy(true);setMsg('');setError('')
  if(!db){setError('Autenticação indisponível.');setBusy(false);return}
  try{
   if(mode==='signup'){
    if(password.length<8)throw new Error('A senha deve ter pelo menos 8 caracteres.')
    const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name.trim()||null}}})
    if(error)throw error
    if(data.session)location.href=next
    else setMsg('Conta criada. Verifique seu e-mail para confirmar o cadastro.')
   }else{
    const {error}=await db.auth.signInWithPassword({email,password})
    if(error){
     if(isWeakPasswordError(error)){
      await sendRecovery(email)
      setMode('forgot')
      setMsg('Sua senha antiga não atende mais aos requisitos de segurança. Enviamos um link para você criar uma nova senha com pelo menos 8 caracteres.')
     }else throw error
    }else location.href=next
   }
  }catch(e){setError(e.message||'Não foi possível concluir.')}finally{setBusy(false)}
 }
 async function recover(){
  if(!db||!email)return setError('Informe seu e-mail.')
  setBusy(true);setError('');setMsg('')
  try{await sendRecovery(email);setMsg('Enviamos o link de recuperação para seu e-mail.')}catch(e){setError(e.message||'Não foi possível enviar o link.')}finally{setBusy(false)}
 }
 return <div className="vl-auth-page"><div className="vl-auth-card"><a className="brand" href="/laguna"><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a><span className="section-kicker">ÁREA DO COMERCIANTE</span><h1>{mode==='login'?'Entre na sua conta':mode==='signup'?'Crie sua conta':'Recupere sua senha'}</h1><p>{mode==='login'?'Acesse sua empresa e seus recursos.':mode==='signup'?'Comece gratuitamente no VitrineLocal.':'Receba um link para criar uma nova senha.'}</p>{error&&<div className="auth-alert error">{error}</div>}{msg&&<div className="auth-alert">{msg}</div>}{mode==='forgot'?<form onSubmit={e=>{e.preventDefault();recover()}}><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><button className="primary wide" disabled={busy}>{busy?'Enviando…':'Enviar recuperação'}</button></form>:<form onSubmit={submit}>{mode==='signup'&&<label>Nome<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}<label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode==='signup'?8:1} autoComplete={mode==='login'?'current-password':'new-password'}/>{mode==='signup'&&<small>A senha deve ter pelo menos 8 caracteres.</small>}</label><button className="primary wide" disabled={busy}>{busy?'Aguarde…':mode==='login'?'Entrar':'Criar conta'}</button></form>}{mode==='login'&&<button className="text-button" onClick={()=>{setMode('forgot');setMsg('');setError('')}}>Esqueci minha senha</button>}{mode==='forgot'?<button className="text-button" onClick={()=>{setMode('login');setMsg('');setError('')}}>← Voltar</button>:<button className="text-button" onClick={()=>{setMode(mode==='login'?'signup':'login');setMsg('');setError('')}}>{mode==='login'?'Criar uma conta':'Já tenho conta'}</button>}<a className="auth-back" href={next}>← Voltar ao site</a></div></div>
}
