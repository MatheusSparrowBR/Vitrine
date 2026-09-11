import React,{useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import './auth-page.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null

function isWeakPasswordError(error){return Boolean(error&&(error.code==='weak_password'||error.name==='AuthWeakPasswordError'||/senha.*(8|fraca)|password.*(weak|strength)/i.test(error.message||'')))}
function safeNext(value){
 const fallback='/laguna'
 const candidate=String(value||'').trim()
 if(!candidate.startsWith('/')||candidate.startsWith('//'))return fallback
 try{const url=new URL(candidate,window.location.origin);if(url.origin!==window.location.origin)return fallback;return `${url.pathname}${url.search}${url.hash}`||fallback}catch{return fallback}
}

export default function AuthPage(){
 const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[name,setName]=useState(''),[msg,setMsg]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false),[showConfirm,setShowConfirm]=useState(false)
 const next=safeNext(new URLSearchParams(location.search).get('next'))
 const passwordRules=useMemo(()=>({length:password.length>=8,mixed:/[A-Za-z]/.test(password)&&/\d/.test(password)}),[password])
 const resetState=()=>{setMsg('');setError('');setConfirmPassword('');setShowPassword(false);setShowConfirm(false)}
 async function sendRecovery(targetEmail=email){if(!db||!targetEmail)return false;const {error:resetError}=await db.auth.resetPasswordForEmail(targetEmail,{redirectTo:`${location.origin}/atualizar-senha`});if(resetError)throw resetError;return true}
 async function submit(e){
  e.preventDefault();setBusy(true);setMsg('');setError('')
  if(!db){setError('Autenticação indisponível.');setBusy(false);return}
  try{
   if(mode==='signup'){
    if(password.length<8)throw new Error('A senha deve ter pelo menos 8 caracteres.')
    if(password!==confirmPassword)throw new Error('As senhas não conferem.')
    const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name.trim()||null}}})
    if(error)throw error
    if(data.session)location.href=next
    else setMsg('Conta criada. Verifique seu e-mail para confirmar o cadastro.')
   }else{
    const {error}=await db.auth.signInWithPassword({email,password})
    if(error){
     if(isWeakPasswordError(error)){await sendRecovery(email);setMode('forgot');setMsg('Sua senha antiga não atende mais aos requisitos de segurança. Enviamos um link para você criar uma nova senha com pelo menos 8 caracteres.')}
     else throw error
    }else location.href=next
   }
  }catch(e){setError(e.message||'Não foi possível concluir.')}finally{setBusy(false)}
 }
 async function recover(){if(!db||!email)return setError('Informe seu e-mail.');setBusy(true);setError('');setMsg('');try{await sendRecovery(email);setMsg('Enviamos o link de recuperação para seu e-mail.')}catch(e){setError(e.message||'Não foi possível enviar o link.')}finally{setBusy(false)}}
 const title=mode==='login'?'Entre na sua conta':mode==='signup'?'Crie sua conta':'Recupere sua senha'
 const subtitle=mode==='login'?'Gerencie sua empresa, publique conteúdo e acompanhe seus resultados.':mode==='signup'?'Comece gratuitamente e coloque sua empresa na VitrineLocal.':'Informe seu e-mail e enviaremos um link para redefinir sua senha.'
 return <div className="vl-auth-page">
  <div className="vl-auth-card">
   <a className="brand" href="/laguna" aria-label="Voltar para VitrineLocal"><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a>
   <div className="auth-kicker-row"><span className="section-kicker">ÁREA DO COMERCIANTE</span><span className="auth-secure"><span aria-hidden="true">●</span> acesso seguro</span></div>
   <header className="auth-heading">
    <h1>{title}</h1>
    <p>{subtitle}</p>
   </header>
   {error&&<div className="auth-alert error" role="alert"><span className="auth-alert-icon" aria-hidden="true">!</span><span>{error}</span></div>}
   {msg&&<div className="auth-alert" role="status" aria-live="polite"><span className="auth-alert-icon" aria-hidden="true">✓</span><span>{msg}</span></div>}
   {mode==='forgot'?<form onSubmit={e=>{e.preventDefault();recover()}} className="auth-form">
    <label className="auth-field"><span>E-mail</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="voce@empresa.com" inputMode="email"/></label>
    <button className="primary wide" disabled={busy}>{busy?<><span className="auth-spinner"/>Enviando…</>:'Enviar link de recuperação'}</button>
   </form>:<form onSubmit={submit} className="auth-form">
    {mode==='signup'&&<label className="auth-field"><span>Nome</span><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Seu nome"/></label>}
    <label className="auth-field"><span>E-mail</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="voce@empresa.com" inputMode="email"/></label>
    <label className="auth-field"><span>Senha</span><div className="auth-input-wrap"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode==='signup'?8:1} autoComplete={mode==='login'?'current-password':'new-password'} placeholder={mode==='signup'?'Mínimo de 8 caracteres':'Sua senha'}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}>{showPassword?'Ocultar':'Mostrar'}</button></div>{mode==='signup'&&<div className="password-help"><span className={passwordRules.length?'ok':''}>{passwordRules.length?'✓':'○'} 8 caracteres ou mais</span><span className={passwordRules.mixed?'ok':''}>{passwordRules.mixed?'✓':'○'} letras e números</span></div>}</label>
    {mode==='signup'&&<label className="auth-field"><span>Confirmar senha</span><div className="auth-input-wrap"><input type={showConfirm?'text':'password'} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Digite a senha novamente"/ ><button type="button" className="password-toggle" onClick={()=>setShowConfirm(v=>!v)} aria-label={showConfirm?'Ocultar confirmação':'Mostrar confirmação'}>{showConfirm?'Ocultar':'Mostrar'}</button></div></label>}
    <div className="auth-actions-row">{mode==='login'?<button type="button" className="text-button inline" onClick={()=>{setMode('forgot');resetState()}}>Esqueci minha senha</button>:<span className="auth-hint">Seus dados ficam protegidos.</span>}</div>
    <button className="primary wide" disabled={busy}>{busy?<><span className="auth-spinner"/>Aguarde…</>:mode==='login'?'Entrar na minha conta':'Criar minha conta'}</button>
   </form>}
   <div className="auth-switch">{mode==='forgot'?<><span>Lembrou da senha?</span><button className="text-button" onClick={()=>{setMode('login');resetState()}}>Voltar para entrar</button></>:<><span>{mode==='login'?'Ainda não tem uma conta?':'Já possui uma conta?'}</span><button className="text-button" onClick={()=>{setMode(mode==='login'?'signup':'login');resetState()}}>{mode==='login'?'Criar conta grátis':'Entrar na conta'}</button></>}</div>
   <a className="auth-back" href={next}>← Voltar ao site</a>
  </div>
 </div>
}
