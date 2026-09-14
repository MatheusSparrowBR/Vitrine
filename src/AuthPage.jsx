import React,{useMemo,useState}from'react'
import{db}from'./review-service.js'
import'./auth-page.css'

const isWeakPasswordError=e=>Boolean(e&&(e.code==='weak_password'||e.name==='AuthWeakPasswordError'||/senha.*(8|fraca)|password.*(weak|strength)/i.test(e.message||'')))
const friendlyAuthError=(e,mode)=>{
 const raw=String(e?.message||'').trim()
 if(/invalid login credentials/i.test(raw))return'E-mail ou senha incorretos. Confira os dados e tente novamente.'
 if(/already registered|user already exists|already been registered/i.test(raw))return'Já existe uma conta com este e-mail. Entre ou recupere sua senha.'
 if(/rate limit|too many requests/i.test(raw))return'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.'
 if(mode==='signup'&&/password.*(weak|strength)|senha.*fraca/i.test(raw))return'Crie uma senha com pelo menos 8 caracteres, usando letras e números.'
 return raw||'Não foi possível concluir. Tente novamente.'
}
function safeNext(value){const fallback='/laguna',candidate=String(value||'').trim();if(!candidate.startsWith('/')||candidate.startsWith('//'))return fallback;try{const url=new URL(candidate,window.location.origin);return url.origin!==window.location.origin?fallback:`${url.pathname}${url.search}${url.hash}`||fallback}catch{return fallback}}

export default function AuthPage(){
 const[m,setM]=useState('login'),[email,setE]=useState(''),[pw,setP]=useState(''),[name,setN]=useState(''),[msg,setMsg]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false)
 const isSignup=m==='signup',isForgot=m==='forgot',next=safeNext(new URLSearchParams(location.search).get('next'))
 const rules=useMemo(()=>({length:pw.length>=8,mixed:/[A-Za-z]/.test(pw)&&/\d/.test(pw)}),[pw])
 const signupReady=Boolean(name.trim().length>=2&&email.trim()&&rules.length&&rules.mixed)
 const reset=()=>{setMsg('');setError('');setShow(false)}
 const switchMode=mode=>{setM(mode);reset()}
 const recover=async()=>{if(!db)return setError('Autenticação indisponível.');if(!email.trim())return setError('Informe seu e-mail para receber o link.');setBusy(true);setError('');setMsg('');try{const{error:e}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${location.origin}/atualizar-senha`});if(e)throw e;setMsg('Enviamos o link de recuperação para seu e-mail. Confira também a caixa de spam.')}catch(e){setError(friendlyAuthError(e,'forgot'))}finally{setBusy(false)}}
 const redirect=async()=>{const{data,error:e}=await db.auth.getSession();if(e)throw e;if(!data.session?.user?.id)throw new Error('Login concluído, mas a sessão não foi estabelecida. Tente novamente.');location.assign(next)}
 const submit=async e=>{e.preventDefault();if(busy)return;setBusy(true);setMsg('');setError('');if(!db){setError('Autenticação indisponível.');setBusy(false);return}try{
   if(isSignup){
    if(name.trim().length<2)throw new Error('Informe seu nome para continuar.')
    if(!rules.length||!rules.mixed)throw new Error('Crie uma senha com pelo menos 8 caracteres, usando letras e números.')
    const{data,error:e}=await db.auth.signUp({email:email.trim(),password:pw,options:{data:{full_name:name.trim()}}});if(e)throw e
    if(data.session)await redirect();else setMsg('Conta criada. Enviamos um link para confirmar seu e-mail antes do primeiro acesso.')
   }else{
    const{error:e}=await db.auth.signInWithPassword({email:email.trim(),password:pw});if(e){if(isWeakPasswordError(e)){await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${location.origin}/atualizar-senha`});setM('forgot');setMsg('Sua senha precisa ser atualizada. Enviamos um link para criar uma nova senha segura.')}else throw e}else await redirect()
   }
  }catch(e){setError(friendlyAuthError(e,isSignup?'signup':'login'))}finally{setBusy(false)}}
 const title=isForgot?'Recupere seu acesso':isSignup?'Crie sua conta':'Entre na sua conta'
 const subtitle=isForgot?'Informe seu e-mail e enviaremos um link para redefinir sua senha.':isSignup?'Crie seu acesso gratuito e cadastre sua empresa quando estiver pronto.':'Acesse seu painel para gerenciar empresa, conteúdo e resultados.'
 return <div className="vl-auth-page"><div className={`vl-auth-card ${isSignup?'is-signup':''}`}>
  <div className="auth-brand-row"><a className="brand" href="/laguna"><span className="brand-mark">V</span><span>Vitrine<span className="brand-accent">Local</span></span></a><span className="auth-secure"><span aria-hidden="true">●</span>Acesso protegido</span></div>
  <div className="auth-kicker-row"><span className="section-kicker">ÁREA DO COMERCIANTE</span>{!isForgot&&<span className="auth-progress">{isSignup?'01 · CRIAÇÃO':'01 · ACESSO'}</span>}</div>
  <header className="auth-heading"><div className="auth-context">{isSignup?'Comece em menos de 1 minuto':'Seu painel começa aqui'}</div><h1>{title}</h1><p>{subtitle}</p></header>
  {isSignup&&<div className="auth-benefits" aria-label="Benefícios da conta"><div><b>01</b><span>Acesso ao painel</span></div><div><b>02</b><span>Cadastre sua empresa</span></div><div><b>03</b><span>Comece grátis</span></div></div>}
  {error&&<div className="auth-alert error" role="alert"><span className="auth-alert-icon">!</span><span>{error}</span></div>}
  {msg&&<div className="auth-alert" role="status"><span className="auth-alert-icon">✓</span><span>{msg}</span></div>}
  {isForgot?<form onSubmit={e=>{e.preventDefault();recover()}} className="auth-form"><label className="auth-field"><span>E-mail</span><input type="email" value={email} onChange={e=>setE(e.target.value)} placeholder="voce@empresa.com" required autoComplete="email" autoFocus/></label><button className="primary wide" disabled={busy}>{busy?<><i className="auth-spinner"/>Enviando link…</>:'Enviar link de recuperação'}</button></form>:<form onSubmit={submit} className="auth-form">
   {isSignup&&<label className="auth-field"><span>Seu nome</span><input value={name} onChange={e=>setN(e.target.value)} placeholder="Como podemos chamar você?" autoComplete="name" required minLength={2} autoFocus/></label>}
   <label className="auth-field"><span>E-mail</span><input type="email" value={email} onChange={e=>setE(e.target.value)} placeholder="voce@empresa.com" required autoComplete="email" autoFocus={!isSignup}/></label>
   <label className="auth-field"><span>Senha</span><div className="auth-input-wrap"><input type={show?'text':'password'} value={pw} onChange={e=>setP(e.target.value)} placeholder={isSignup?'Crie uma senha segura':'Digite sua senha'} required minLength={isSignup?8:1} autoComplete={isSignup?'new-password':'current-password'} aria-describedby={isSignup?'password-help':undefined}/><button type="button" className="password-toggle" onClick={()=>setShow(v=>!v)} aria-label={show?'Ocultar senha':'Mostrar senha'}>{show?'Ocultar':'Mostrar'}</button></div>{isSignup&&<div id="password-help" className="password-rules"><span className={rules.length?'is-valid':''}>{rules.length?'✓':'○'} 8 caracteres ou mais</span><span className={rules.mixed?'is-valid':''}>{rules.mixed?'✓':'○'} letras e números</span></div>}</label>
   {!isSignup&&<div className="auth-actions-row"><button type="button" className="text-button inline" onClick={()=>switchMode('forgot')}>Esqueci minha senha</button></div>}
   <button className="primary wide" disabled={busy||(isSignup&&!signupReady)}>{busy?<><i className="auth-spinner"/>Aguarde…</>:isSignup?'Criar minha conta':'Entrar na minha conta'}</button>
   {isSignup?<p className="auth-under-note">Você poderá cadastrar sua empresa depois. Primeiro criamos seu acesso seguro.</p>:<p className="auth-under-note">Acesso protegido com autenticação segura.</p>}
  </form>}
  <div className="auth-switch">{isForgot?<><span>Lembrou da senha?</span><button className="text-button" onClick={()=>switchMode('login')}>Voltar para entrar</button></>:<><span>{isSignup?'Já possui uma conta?':'Ainda não tem uma conta?'}</span><button className="text-button" onClick={()=>switchMode(isSignup?'login':'signup')}>{isSignup?'Entrar na conta':'Criar conta grátis'}</button></>}</div>
  <a className="auth-back" href={next}>← Voltar ao site</a>
 </div></div>
}
