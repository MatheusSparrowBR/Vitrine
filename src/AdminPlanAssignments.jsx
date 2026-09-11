import React,{useEffect,useMemo,useState}from'react'

const money=v=>`R$ ${Number(v||0).toFixed(2).replace('.',',')}`
const PLAN_TZ='America/Sao_Paulo'
function zonedDateToISO(dateOnly,endOfDay=false){
 if(!dateOnly)return null
 const iso=`${dateOnly}T${endOfDay?'23:59:59':'00:00:00'}-03:00`
 const d=new Date(iso)
 return Number.isNaN(d.getTime())?null:d.toISOString()
}
function formatDate(value){return value?new Intl.DateTimeFormat('pt-BR',{timeZone:PLAN_TZ,dateStyle:'medium'}).format(new Date(value)):'sem validade'}
const planCopy={free:'Plano gratuito',pro:'Plano profissional',premium:'Plano completo'}

export default function AdminPlanAssignments({supabase,onToast}){
 const[rows,setRows]=useState([]),[plans,setPlans]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(''),[filter,setFilter]=useState(''),[ends,setEnds]=useState({}),[message,setMessage]=useState({text:'',error:false})
 const notify=(text,error=false)=>{setMessage({text,error});onToast?.(text,error);window.clearTimeout(window.__vlPlanAssignmentToast);window.__vlPlanAssignmentToast=window.setTimeout(()=>setMessage({text:'',error:false}),3500)}
 async function load(){
  if(!supabase)return
  setLoading(true)
  const[r,p]=await Promise.all([
   supabase.rpc('admin_list_business_plans'),
   supabase.from('plans').select('id,code,name,price_monthly,active').eq('active',true).order('sort_order').order('price_monthly')
  ])
  if(r.error)notify(r.error.message||'Não foi possível carregar os planos por empresa.',true);else setRows(r.data||[])
  if(p.error)notify(p.error.message||'Não foi possível carregar os planos.',true);else setPlans(p.data||[])
  setLoading(false)
 }
 useEffect(()=>{load()},[])
 async function changePlan(row,code){
  if(!code)return
  const plan=plans.find(p=>p.code===code);if(!plan)return
  const raw=ends[row.business_id]||''
  const end=zonedDateToISO(raw,true)
  const samePlan=code===row.plan_code
  const currentEnd=formatDate(row.subscription_ends_at)
  const newEnd=formatDate(end)
  if(samePlan&&currentEnd===newEnd)return
  const detail=`Aplicar ${plan.name||code} para ${row.business_name}?\n\nPlano: ${samePlan?'manter '+(row.plan_name||row.plan_code):`${row.plan_name||row.plan_code} → ${plan.name||code}`}\nValidade manual: ${newEnd}.`
  if(!window.confirm(detail))return
  setSaving(row.business_id)
  const{error}=await supabase.rpc('admin_set_business_plan',{p_business_id:row.business_id,p_plan_code:code,p_ends_at:end})
  if(error){notify(error.message||'Não foi possível alterar o plano.',true);setSaving('');return}
  notify(`Plano da empresa “${row.business_name}” atualizado.`)
  setSaving('')
  await load()
 }
 const visible=useMemo(()=>rows.filter(r=>{const q=filter.trim().toLowerCase();return !q||[r.business_name,r.owner_name,r.city_name,r.plan_name,r.plan_code,r.subscription_status].filter(Boolean).join(' ').toLowerCase().includes(q)}),[rows,filter])
 return <section className="admin-v2-management-layout">
  <div className="admin-v2-card admin-v2-section admin-v2-list-panel">
   <div className="admin-v2-section-head"><div><span className="admin-v2-kicker">CONCESSÃO MANUAL</span><h2>Planos por empresa</h2><p>Altere manualmente o plano efetivo de uma empresa e, opcionalmente, defina uma data de validade.</p></div><button className="admin-v2-btn" onClick={load} disabled={loading}>↻ Atualizar</button></div>
   {message.text&&<div className={message.error?'admin-v2-alert':'admin-v2-note'}>{message.text}</div>}
   <div className="admin-v2-toolbar"><div className="admin-v2-search"><span>⌕</span><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar empresa, proprietário, cidade ou plano…"/></div></div>
   {loading?<div className="admin-v2-empty"><strong>Carregando empresas…</strong><span>Consultando o plano efetivo de cada empresa.</span></div>:!visible.length?<div className="admin-v2-empty"><strong>Nenhuma empresa encontrada.</strong><span>Ajuste a busca ou cadastre uma empresa.</span></div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Empresa</th><th>Proprietário</th><th>Cidade</th><th>Plano atual</th><th>Validade manual</th><th>Novo plano</th></tr></thead><tbody>{visible.map(row=><tr key={row.business_id}>
    <td><strong>{row.business_name}</strong><small className="muted">{row.business_id.slice(0,8)}…</small></td>
    <td>{row.owner_name||'—'}</td>
    <td>{row.city_name||'—'}</td>
    <td><span className="status-pill">{row.plan_name||row.plan_code}</span>{row.subscription_status&&<small className="muted">{row.subscription_status}</small>}{row.subscription_ends_at&&<small className="muted">até {formatDate(row.subscription_ends_at)}</small>}</td>
    <td><input type="date" value={ends[row.business_id]||''} onChange={e=>setEnds(x=>({...x,[row.business_id]:e.target.value}))} title={`Opcional: ao chegar nesta data a empresa perde o plano manual. Fuso ${PLAN_TZ}.`}/></td>
    <td><select value={row.plan_code||'free'} onChange={e=>changePlan(row,e.target.value)} disabled={saving===row.business_id}>{plans.map(p=><option key={p.code} value={p.code}>{p.name} — {money(p.price_monthly)}/mês</option>)}</select>{saving===row.business_id&&<small className="muted">Salvando…</small>}</td>
   </tr>)}</tbody></table></div>}
   <div className="admin-v2-note"><strong>Plano manual:</strong> {planCopy.pro} ou {planCopy.premium} podem ser concedidos pelo administrador sem cobrança Stripe, com validade opcional. Para evitar divergência de cobrança, o banco bloqueia a concessão manual quando existe uma assinatura Stripe ativa; primeiro é necessário encerrar a cobrança Stripe.</div>
  </div>
 </section>
}
