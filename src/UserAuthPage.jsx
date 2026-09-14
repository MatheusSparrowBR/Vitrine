import React,{useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import './auth-page.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null

function safeNext(value){
 const fallback='/laguna'
 const candidate=String(value||'').trim()
 if(!candidate.startsWith('/')||candidate.startsWith('//'))return fallback
 try{const url=new URL(candidate,window.location.origin);if(url.origin!==window.location.origin)return fallback;return `${url.pathname}${url.search}${url.hash}`||fallback}catch{return fallback}
}

function isWeakPasswordError(error){return Boolean(error&&(error.code==='weak_password'||error.name==='AuthWeakPasswordError'||/senha.*(8|fraca)|password.*(weak|strength)/i.test(error.message||'')))}

export default function UserAuthPage(){
 const initialSignup=location.pathname.endsWith('/cadastro')
 const [mode,setMode]=useState(initialSignup?'signup':'login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[name,setName]=useState(''),[msg,setMsg]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false),[showConfirm,setShowConfirm]=useState(false)
 const next=safeNext(new URLSearchParams(location.search).get('next'))
 const passwordRules=useMemo(()=>({length:password.length>=8,mixed:/[A-Za-z]/.test(password)&&/\d/.test(password)}),[password])
 const resetState=()=>{setMsg('');setError('');setConfirmPassword('');setShowPassword(false);setShowConfirm(false)}
 const loginPath=`/usuario/login?next=${encodeURIComponent(next)}`
 const signupPath=`/usuario/cadastro?next=${encodeURIComponent(next)}`

 async function redirectAfterLogin(){
  const{data:{session},error:sessionError}=await db.auth.getSession()
  if(sessionError)throw sessionError
  if(!session?.user?.id)throw new Error('Login concluído, mas a sessão não foi estabelecida. Tente novamente.')
  window.location.assign(next)
 }
 async function submit(e){
  e.preventDefault();setBusy(true);setMsg('');setError('')
  if(!db){setError('Autenticação indisponível.');setBusy(false);return}
  try{
   if(mode==='signup'){
    if(password.length<8)throw new Error('A senha deve ter pelo menos 8 caracteres.')
    if(password!==confirmPassword)throw new Error('As senhas não conferem.')
    const{data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name.trim()||null}}})
    if(error)throw error
    if(data.session)await redirectAfterLogin()
    else setMsg('Conta criada. Verifique seu e-mail para confirmar o cadastro antes de avaliar.')
   }else{
    const{error}=await db.auth.signInWithPassword({email,password})
    if(error){
     if(isWeakPasswordError(error)){
      const{error:resetError}=await db.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/atualizar-senha`})
      if(resetError)throw resetError
      setMode('forgot');setMsg('Sua senha precisa ser atualizada. Enviamos um link para criar uma nova senha com pelo menos 8 caracteres.')
     }else throw error
    }else await redirectAfterLogin()
   }
  }catch(e){setError(e.message||'Não foi possível concluir.')}finally{setBusy(false)}
 }
 async function recover(){
  if(!db||!email)return setError('Informe seu e-mail.')
  setBusy(true);setError('');setMsg('')
  try{const{error}=await db.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/atualizar-senha`});if(error)throw error;setMsg('Enviamos o link de recuperação para seu e-mail.')}catch(e){setError(e.message||'Não foi possível enviar o link.')}finally{setBusy(false)}
 }

 const title=mode==='login'?'Entre para avaliar':mode==='signup'?'Crie sua conta':'Recupere sua senha'
 const subtitle=mode==='login'?'Acesse sua conta gratuita e compartilhe sua experiência nas empresas que você conhece.':mode==='signup'?'Crie um perfil gratuito para avaliar empresas e, em breve, salvar seus lugares favoritos e acompanhar suas interações.':'Informe seu e-mail e enviaremos um link para redefinir sua senha.'
 return <div className="vl-auth-page">
  <div className="vl-auth-card">
   <a className="brand" href={next} aria-label="Voltar para VitrineLocal"><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a>
   <div className="auth-kicker-row"><span className="section-kicker">ÁREA DO CLIENTE</span><span className="auth-secure"><span aria-hidden="true">●</span> conta gratuita</span></div>
   <header className="auth-heading"><h1>{title}</h1><p>{subtitle}</p></header>
   {error&&<div className="auth-alert error" role="alert"><span className="auth-alert-icon" aria-hidden="true">!</span><span>{error}</span></div>}
   {msg&&<div className="auth-alert" role="status" aria-live="polite"><span className="auth-alert-icon" aria-hidden="true">✓</span><span>{msg}</span></div>}
   {mode==='forgot'?<form onSubmit={e=>{e.preventDefault();recover()}} className="auth-form">
    <label className="auth-field"><span>E-mail</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="voce@email.com" inputMode="email"/></label>
    <button className="primary wide" disabled={busy}>{busy?<><span className="auth-spinner"/>Enviando…</>:'Enviar link de recuperação'}</button>
   </form>:<form onSubmit={submit} className="auth-form">
    {mode==='signup'&&<label className="auth-field"><span>Nome</span><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Seu nome"/></label>}
    <label className="auth-field"><span>E-mail</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="voce@email.com" inputMode="email"/></label>
    <label className="auth-field"><span>Senha</span><div className="auth-input-wrap"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode==='signup'?8:1} autoComplete={mode==='login'?'current-password':'new-password'} placeholder={mode==='signup'?'Mínimo de 8 caracteres':'Sua senha'}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}>{showPassword?'Ocultar':'Mostrar'}</button></div>{mode==='signup'&&<div className="password-help"><span className={passwordRules.length?'ok':''}>{passwordRules.length?'✓':'○'} 8 caracteres ou mais</span><span className={passwordRules.mixed?'ok':''}>{passwordRules.mixed?'✓':'○'} letras e números</span></div>}</label>
    {mode==='signup'&&<label className="auth-field"><span>Confirmar senha</span><div className="auth-input-wrap"><input type={showConfirm?'text':'password'} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Digite a senha novamente"/><button type="button" className="password-toggle" onClick={()=>setShowConfirm(v=>!v)} aria-label={showConfirm?'Ocultar confirmação':'Mostrar confirmação'}>{showConfirm?'Ocultar':'Mostrar'}</button></div></label>}
    {mode==='login'&&<div className="auth-actions-row"><button type="button" className="text-button inline" onClick={()=>{setMode('forgot');resetState()}}>Esqueci minha senha</button></div>}
    <button className="primary wide" disabled={busy}>{busy?<><span className="auth-spinner"/>Aguarde…</>:mode==='login'?'Entrar e avaliar':'Criar minha conta'}</button>
   </form>}
   <div className="auth-switch">{mode==='forgot'?<><span>Lembrou da senha?</span><button className="text-button" onClick={()=>{setMode('login');resetState()}}>Voltar para entrar</button></>:<><span>{mode==='login'?'Ainda não tem uma conta?':'Já possui uma conta?'}</span><button className="text-button" onClick={()=>{const nextMode=mode==='login'?'signup':'login';resetState();setMode(nextMode);history.replaceState(null,'',nextMode==='signup'?signupPath:loginPath)}}>{mode==='login'?'Criar conta grátis':'Entrar na conta'}</button></>}</div>
   <a className="auth-back" href={next}>← Voltar para a empresa</a>
  </div>
 </div>
}
