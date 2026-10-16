import React,{useMemo,useState} from 'react'
import { db } from './review-service.js'
import Icon from './ui-icons.jsx'
import './auth-page.css'

// Entrada única do site (/login, /usuario/login e /usuario/cadastro): a mesma conta serve para avaliar, salvar
// favoritos e gerenciar empresas. Depois de entrar, cada pessoa vai para o lugar certo.
function safeNext(value){const candidate=String(value||'').trim();if(!candidate.startsWith('/')||candidate.startsWith('//'))return null;try{const url=new URL(candidate,window.location.origin);if(url.origin!==window.location.origin)return null;return `${url.pathname}${url.search}${url.hash}`||null}catch{return null}}
function isWeakPasswordError(error){return Boolean(error&&(error.code==='weak_password'||error.name==='AuthWeakPasswordError'||/senha.*(8|fraca)|password.*(weak|strength)/i.test(error.message||'')))}
const friendlyAuthError=(e,mode)=>{
 const raw=String(e?.message||'').trim()
 if(/invalid login credentials/i.test(raw))return'E-mail ou senha incorretos. Confira os dados e tente novamente.'
 if(/email not confirmed/i.test(raw))return'Confirme seu e-mail pelo link que enviamos antes de entrar. Confira também a caixa de spam.'
 if(/already registered|user already exists|already been registered/i.test(raw))return'Já existe uma conta com este e-mail. Entre ou recupere sua senha.'
 if(/rate limit|too many requests/i.test(raw))return'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.'
 if(mode==='signup'&&/password.*(weak|strength)|senha.*fraca/i.test(raw))return'Crie uma senha com pelo menos 8 caracteres, usando letras e números.'
 return raw||'Não foi possível concluir. Tente novamente.'
}
const cidadeAtual=()=>{try{return localStorage.getItem('vl_city_slug')||'laguna'}catch{return'laguna'}}

export default function UserAuthPage(){
 const params=new URLSearchParams(location.search)
 const initialSignup=location.pathname.endsWith('/cadastro')||params.get('mode')==='signup'
 const blocked=params.get('blocked')
 const moderationMessage=blocked==='banned'?'Esta conta foi banida e não pode acessar a plataforma.':blocked==='suspended'?'Esta conta está temporariamente suspensa. Entre em contato com a administração se precisar de esclarecimentos.':''
 const nextParam=safeNext(params.get('next'))
 const querEmpresa=Boolean(nextParam&&/^\/conta(\/nova|\?new=business)/.test(nextParam))
 const[mode,setMode]=useState(initialSignup?'signup':'login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[name,setName]=useState(''),[experienceMode,setExperienceMode]=useState(querEmpresa?'business':'personal'),[msg,setMsg]=useState(moderationMessage),[error,setError]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false),[showConfirm,setShowConfirm]=useState(false)
 const passwordRules=useMemo(()=>({length:password.length>=8,mixed:/[A-Za-z]/.test(password)&&/\d/.test(password)}),[password])
 const resetState=()=>{setMsg(moderationMessage);setError('');setConfirmPassword('');setShowPassword(false);setShowConfirm(false)}
 const qs=nextParam?`?next=${encodeURIComponent(nextParam)}`:''
 const loginPath=`/login${qs}`,signupPath=`/usuario/cadastro${qs}`
 // sem destino pedido: empresa ativa (ou admin) vai para o painel; quem só usa o site, para o perfil
 async function destino(session){
  if(nextParam)return nextParam
  try{const[{data:profile},{data:businesses}]=await Promise.all([db.from('profiles').select('role').eq('id',session.user.id).maybeSingle(),db.from('businesses').select('status').eq('owner_id',session.user.id)]);if(profile?.role==='admin'||(businesses||[]).some(row=>row.status==='active'))return'/conta'}catch{}
  return'/usuario/perfil?mode=personal'
 }
 async function redirectAfterLogin(){const{data:{session},error:e}=await db.auth.getSession();if(e)throw e;if(!session?.user?.id)throw new Error('Login concluído, mas a sessão não foi estabelecida. Tente novamente.');location.assign(await destino(session))}
 async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setMsg('');setError('');if(!db){setError('Autenticação indisponível.');setBusy(false);return}try{if(mode==='signup'){if(password.length<8||!passwordRules.mixed)throw new Error('Crie uma senha com pelo menos 8 caracteres, usando letras e números.');if(password!==confirmPassword)throw new Error('As senhas não conferem.');const{data,error:e}=await db.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim()||null,experience_mode:experienceMode}}});if(e)throw e;if(data.session){if(!nextParam&&experienceMode!=='personal'){location.assign('/conta/nova');return}await redirectAfterLogin()}else setMsg('Conta criada! Enviamos um link para o seu e-mail — confirme o cadastro para entrar.')}else{const{error:e}=await db.auth.signInWithPassword({email:email.trim(),password});if(e){if(isWeakPasswordError(e)){const{error:re}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${location.origin}/atualizar-senha`});if(re)throw re;setMode('forgot');setMsg('Sua senha precisa ser atualizada. Enviamos um link para criar uma nova senha com pelo menos 8 caracteres.')}else throw e}else await redirectAfterLogin()}}catch(e){setError(friendlyAuthError(e,mode))}finally{setBusy(false)}}
 async function recover(){if(!db)return setError('Autenticação indisponível.');if(!email.trim())return setError('Informe seu e-mail para receber o link.');setBusy(true);setError('');setMsg('');try{const{error:e}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${location.origin}/atualizar-senha`});if(e)throw e;setMsg('Enviamos o link de recuperação para o seu e-mail. Confira também a caixa de spam.')}catch(e){setError(friendlyAuthError(e,'forgot'))}finally{setBusy(false)}}
 const title=mode==='login'?'Entre na sua conta':mode==='signup'?'Crie sua conta grátis':'Recupere sua senha'
 const subtitle=mode==='login'?(querEmpresa?'Entre para cadastrar e gerenciar sua empresa.':'Uma conta só para avaliar empresas, salvar favoritos e gerenciar o seu negócio.'):mode==='signup'?'Leva menos de 1 minuto. Você pode cadastrar sua empresa logo depois.':'Informe seu e-mail e enviaremos um link para criar uma nova senha.'
 const olho=(mostrar,alternar,rotulo)=><button type="button" className="password-toggle vl-eye" onClick={alternar} aria-label={mostrar?`Ocultar ${rotulo}`:`Mostrar ${rotulo}`} title={mostrar?'Ocultar':'Mostrar'}><Icon name={mostrar?'eyeOff':'eye'} size={20}/></button>
 return <div className="vl-auth-page"><div className="vl-auth-card">
  <a className="vl-auth-logo" href={`/${cidadeAtual()}`} aria-label="VitrineLocal — voltar ao início"><img src="/vitrine-local-header-logo.svg" alt="VitrineLocal" width="170" height="40"/></a>
  <header className="auth-heading"><h1>{title}</h1><p>{subtitle}</p></header>
  {error&&<div className="auth-alert error" role="alert"><span className="auth-alert-icon">!</span><span>{error}</span></div>}
  {msg&&<div className="auth-alert" role="status"><span className="auth-alert-icon">✓</span><span>{msg}</span></div>}
  {mode==='forgot'?<form onSubmit={e=>{e.preventDefault();recover()}} className="auth-form"><label className="auth-field"><span>E-mail</span><input type="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="voce@email.com" autoFocus/></label><button className="primary wide" disabled={busy}>{busy?'Enviando…':'Enviar link de recuperação'}</button></form>:<form onSubmit={submit} className="auth-form">
   {mode==='signup'&&<label className="auth-field"><span>Seu nome</span><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Como podemos chamar você?" autoFocus/></label>}
   {mode==='signup'&&<fieldset className="auth-experience"><legend>Como você vai usar o VitrineLocal?</legend><p>Dá para mudar depois, sem perder nada.</p>{[['personal','Descobrir e avaliar empresas'],['business','Divulgar minha empresa'],['both','Os dois']].map(([id,label])=><label key={id}><input type="radio" name="experience_mode" value={id} checked={experienceMode===id} onChange={()=>setExperienceMode(id)}/><span>{label}</span></label>)}</fieldset>}
   <label className="auth-field"><span>E-mail</span><input type="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="voce@email.com" autoFocus={mode==='login'}/></label>
   <label className="auth-field"><span>Senha</span><div className="auth-input-wrap"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode==='signup'?8:1} autoComplete={mode==='login'?'current-password':'new-password'} placeholder={mode==='signup'?'Crie uma senha':'Sua senha'}/>{olho(showPassword,()=>setShowPassword(v=>!v),'senha')}</div>{mode==='signup'&&<div className="password-help"><span className={passwordRules.length?'is-valid':''}>{passwordRules.length?'✓':'○'} 8 caracteres ou mais</span><span className={passwordRules.mixed?'is-valid':''}>{passwordRules.mixed?'✓':'○'} letras e números</span></div>}</label>
   {mode==='signup'&&<label className="auth-field"><span>Confirmar senha</span><div className="auth-input-wrap"><input type={showConfirm?'text':'password'} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Digite a senha de novo"/>{olho(showConfirm,()=>setShowConfirm(v=>!v),'confirmação de senha')}</div></label>}
   {mode==='login'&&<div className="auth-actions-row"><button type="button" className="text-button inline" onClick={()=>{setMode('forgot');resetState()}}>Esqueci minha senha</button></div>}
   <button className="primary wide" disabled={busy}>{busy?'Aguarde…':mode==='login'?'Entrar':'Criar minha conta'}</button>
  </form>}
  <div className="auth-switch">{mode==='forgot'?<><span>Lembrou da senha?</span><button className="text-button" onClick={()=>{setMode('login');resetState()}}>Voltar para entrar</button></>:<><span>{mode==='login'?'Ainda não tem uma conta?':'Já tem uma conta?'}</span><button className="text-button" onClick={()=>{const nextMode=mode==='login'?'signup':'login';resetState();setMode(nextMode);history.replaceState(null,'',nextMode==='signup'?signupPath:loginPath)}}>{mode==='login'?'Criar conta grátis':'Entrar'}</button></>}</div>
  <a className="auth-back" href={nextParam&&!nextParam.startsWith('/conta')?nextParam:`/${cidadeAtual()}`}>← Voltar ao site</a>
 </div></div>
}
