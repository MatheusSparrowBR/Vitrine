import React,{useEffect,useState}from'react'

const money=v=>`R$ ${Number(v||0).toFixed(2).replace('.',',')}`
const PLAN_TZ='America/Sao_Paulo'
function zonedDateToISO(dateOnly,endOfDay=false){
 if(!dateOnly)return null
 const suffix=endOfDay?'T23:59:59':'T00:00:00'
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:PLAN_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit'}).formatToParts(new Date(`${dateOnly}${suffix}-03:00`))
 const d=new Date(`${dateOnly}${suffix}-03:00`)
 return Number.isNaN(d.getTime())?null:d.toISOString()
}
function formatDate(value){return value?new Intl.DateTimeFormat('pt-BR',{timeZone:PLAN_TZ,dateStyle:'short'}).format(new Date(value)):'sem validade'}

export default function AdminPlanAssignments({supabase,onToast}){
 const[rows,setRows]=useState([]),[plans,setPlans]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(''),[filter,setFilter]=useState(''),[ends,setEnds]=useState({})
 async function load(){
  if(!supabase)return
  setLoading(true)
  const[r,p]=await Promise.all([
   supabase.rpc('admin_list_business_plans'),
   supabase.from('plans').select('id,code,name,price_monthly,active').eq('active',true).order('sort_order').order('price_monthly')
  ])
  if(r.error){onToast?.(r.error.message,true);setRows([])}else setRows(r.data||[])
  if(p.error)onToast?.(p.error.message,true);else setPlans(p.data||[])
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
  const ok=window.confirm(`Aplicar ${plan.name||code} para ${row.business_name}?\n\nPlano: ${samePlan?'manter '+(row.plan_name||row.plan_code):`${row.plan_name||row.plan_code} → ${plan.name||code}`}\nValidade: ${newEnd}`)
  if(!ok)return
  setSaving(row.business_id)
  const{error}=await supabase.rpc('admin_set_business_plan',{p_business_id:row.business_id,p_plan_code:code,p_ends_at:end})
  setSaving('')
  if(error){onToast?.(error.message,true);return}
  onToast?.(`Plano da empresa "${row.business_name}" atualizado.`)
  await load()
 }
 const visible=rows.filter(r=>{const q=filter.trim().toLowerCase();return !q||[r.business_name,r.owner_name,r.city_name,r.plan_name,r.plan_code].filter(Boolean).join(' ').toLowerCase().includes(q)})
 return <section className="admin-card">
  <div className="admin-card-head"><div><h2>Planos por empresa</h2><p className="muted">Altere manualmente o plano de qualquer empresa. A mudança é aplicada no banco e passa a valer imediatamente.</p></div><button className="outline" onClick={load} disabled={loading}>↻ Atualizar</button></div>
  <div className="admin-toolbar"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar empresa, proprietário ou cidade..."/></div>
  {loading?<div className="empty">Carregando empresas...</div>:!visible.length?<div className="empty"><h3>Nenhuma empresa encontrada.</h3></div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Empresa</th><th>Proprietário</th><th>Cidade</th><th>Plano atual</th><th>Validade opcional</th><th>Novo plano</th></tr></thead><tbody>{visible.map(row=><tr key={row.business_id}>
   <td><strong>{row.business_name}</strong><small className="muted">{row.business_id.slice(0,8)}…</small></td>
   <td>{row.owner_name||'—'}</td><td>{row.city_name||'—'}</td>
   <td><span className="status-pill">{row.plan_name||row.plan_code}</span>{row.subscription_ends_at&&<small className="muted">até {formatDate(row.subscription_ends_at)}</small>}</td>
   <td><input type="date" value={ends[row.business_id]||''} onChange={e=>setEnds(x=>({...x,[row.business_id]:e.target.value}))} title={`Opcional: ao chegar nesta data a empresa volta ao plano gratuito (${PLAN_TZ})`}/></td>
   <td><select value={row.plan_code||'free'} onChange={e=>changePlan(row,e.target.value)} disabled={saving===row.business_id}>{plans.map(p=><option key={p.code} value={p.code}>{p.name} — {money(p.price_monthly)}/mês</option>)}</select>{saving===row.business_id&&<small className="muted">Salvando...</small>}</td>
  </tr>)}</tbody></table></div>}
  <div className="plan-admin-note"><strong>Como funciona:</strong> sem assinatura ativa, a empresa usa automaticamente o <b>Grátis</b>. O administrador pode conceder Pro/Premium manualmente e definir uma data de validade. O bloqueio de limites também é feito no banco, não apenas na interface.</div>
 </section>
}