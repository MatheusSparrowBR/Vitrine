import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null
const state = { open:false, initialized:false, rows:[], filter:'pending_review', search:'' }

const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const money = v => v == null ? '—' : `R$ ${Number(v).toFixed(2).replace('.', ',')}`
const dt = v => v ? new Date(v).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }) : 'Sem data'
const expired = p => p.ends_at && new Date(p.ends_at) < new Date()

function styles(){
  if(document.getElementById('vl-promo-admin-v2-css')) return
  const s=document.createElement('style'); s.id='vl-promo-admin-v2-css'; s.textContent=`
  .vlpa-backdrop{position:fixed;inset:0;z-index:30000;background:rgba(4,10,20,.64);backdrop-filter:blur(6px);display:grid;place-items:center;padding:18px}.vlpa-modal{width:min(1100px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:22px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.28)}.vlpa-head{display:flex;justify-content:space-between;gap:18px}.vlpa-kicker{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.3px;color:#2474ff}.vlpa-head h2{font:800 28px/1.05 Manrope;color:#122033;margin:7px 0}.vlpa-head p{margin:0;color:#718096;font-size:12px;line-height:1.5}.vlpa-close{border:0;background:#eef3f8;border-radius:50%;width:36px;height:36px;font-size:22px;color:#617087;cursor:pointer}.vlpa-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 15px}.vlpa-search{flex:1;min-width:220px;border:1px solid #d9e1ea;border-radius:10px;padding:10px 12px;outline:0;font:500 13px 'DM Sans'}.vlpa-tab{border:1px solid #d9e1ea;background:#fff;border-radius:999px;padding:9px 12px;font:700 11px 'DM Sans';color:#526276;cursor:pointer}.vlpa-tab.active{background:#10253f;color:#fff;border-color:#10253f}.vlpa-card{display:grid;grid-template-columns:170px 1fr auto;gap:15px;padding:13px;border:1px solid #e1e8ef;border-radius:16px;margin-bottom:12px}.vlpa-media{height:130px;border-radius:11px;overflow:hidden;background:#eef3f8;display:grid;place-items:center;color:#8da0b7;font:800 28px Manrope}.vlpa-media img{width:100%;height:100%;object-fit:cover}.vlpa-info h3{margin:5px 0;font:800 18px Manrope;color:#1c3048}.vlpa-info p{margin:0;color:#6e7c90;font-size:12px;line-height:1.5}.vlpa-meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.vlpa-chip{border:1px solid #dfe6ee;background:#fafbfd;border-radius:999px;padding:5px 8px;font-size:10px;color:#5e6d82}.vlpa-business{font-weight:800;color:#2474ff}.vlpa-status{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px}.vlpa-pending{background:#fff5da;color:#986700}.vlpa-published{background:#eaf8f0;color:#218151}.vlpa-rejected{background:#fff0f0;color:#a52f2f}.vlpa-archived{background:#edf1f5;color:#66758a}.vlpa-actions{display:flex;flex-direction:column;justify-content:center;gap:7px;min-width:145px}.vlpa-actions button{border:1px solid #d6dee8;background:#fff;border-radius:9px;padding:9px 10px;font:700 11px 'DM Sans';color:#34465d;cursor:pointer}.vlpa-actions .approve{background:#2474ff;color:#fff;border-color:#2474ff}.vlpa-actions .reject{background:#fff5f5;color:#a02e2e;border-color:#f1cccc}.vlpa-actions button:disabled{opacity:.55;cursor:not-allowed}.vlpa-empty{border:1px dashed #ccd7e4;border-radius:14px;padding:45px 20px;text-align:center;color:#7b8899}.vlpa-empty strong{display:block;color:#34465c;font:800 17px Manrope;margin-bottom:6px}.vlpa-empty span{font-size:11px}.vlpa-foot{font-size:10px;color:#8491a3;margin-top:14px}@media(max-width:820px){.vlpa-card{grid-template-columns:110px 1fr}.vlpa-actions{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);min-width:0}.vlpa-media{height:100px}}@media(max-width:560px){.vlpa-modal{padding:18px}.vlpa-card{grid-template-columns:1fr}.vlpa-media{height:160px}.vlpa-actions{grid-template-columns:1fr}.vlpa-toolbar{display:grid}.vlpa-search{min-width:0}.vlpa-head h2{font-size:24px}}
  `; document.head.appendChild(s)
}

async function isAdmin(){
  if(!supabase) return false
  const {data:u}=await supabase.auth.getUser(); if(!u.user) return false
  const {data:p}=await supabase.from('profiles').select('role').eq('id',u.user.id).maybeSingle()
  return p?.role === 'admin'
}

async function load(){
  const {data,error}=await supabase.from('promotions').select('id,business_id,title,description,image_url,price,original_price,starts_at,ends_at,status,created_at,businesses(name,slug,cities(name,state))').order('created_at',{ascending:false}).limit(200)
  if(error) throw error
  state.rows=data||[]
}

function label(status){const m={pending_review:['Em revisão','vlpa-pending'],published:['Publicada','vlpa-published'],rejected:['Rejeitada','vlpa-rejected'],archived:['Arquivada','vlpa-archived'],draft:['Rascunho','vlpa-archived']};return m[status]||[status,'vlpa-archived']}
function visible(){const q=state.search.trim().toLowerCase();return state.rows.filter(p=>{const ok=state.filter==='all'?true:state.filter==='expired'?expired(p):p.status===state.filter;const text=[p.title,p.description,p.businesses?.name,p.businesses?.cities?.name].filter(Boolean).join(' ').toLowerCase();return ok&&(!q||text.includes(q))})}

async function action(id,type){
  const patch=type==='publish'?{status:'published'}:type==='reject'?{status:'rejected'}:{status:'archived'}
  const {error}=await supabase.from('promotions').update(patch).eq('id',id); if(error) throw error
  await load(); render()
}

function render(){
  const root=document.getElementById('vl-promotions-admin-v2'); if(!root) return
  const counts={pending_review:state.rows.filter(p=>p.status==='pending_review').length,published:state.rows.filter(p=>p.status==='published'&&!expired(p)).length,rejected:state.rows.filter(p=>p.status==='rejected').length,archived:state.rows.filter(p=>p.status==='archived').length,expired:state.rows.filter(expired).length}
  const rows=visible()
  const cards=rows.length?rows.map(p=>{const [st,stc]=label(p.status);const buttons=[];if(p.status==='pending_review'||p.status==='draft')buttons.push(`<button class="approve" data-pa="publish" data-id="${p.id}">Aprovar e publicar</button>`);if(p.status!=='rejected'&&p.status!=='archived')buttons.push(`<button class="reject" data-pa="reject" data-id="${p.id}">Rejeitar</button>`);if(p.status==='published')buttons.push(`<button data-pa="archive" data-id="${p.id}">Pausar</button>`);if(p.status==='rejected'||p.status==='archived')buttons.push(`<button data-pa="publish" data-id="${p.id}">Publicar novamente</button>`);return `<article class="vlpa-card"><div class="vlpa-media">${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:'🔥'}</div><div class="vlpa-info"><span class="vlpa-status ${stc}">${st}</span><h3>${esc(p.title||'Promoção sem título')}</h3><p>${esc(p.description||'Sem descrição.')}</p><div class="vlpa-meta"><span class="vlpa-chip vlpa-business">${esc(p.businesses?.name||'Empresa')}</span><span class="vlpa-chip">${esc(p.businesses?.cities?.name||'Cidade')}</span><span class="vlpa-chip">${money(p.price)}${p.original_price?` · de ${money(p.original_price)}`:''}</span><span class="vlpa-chip">Início: ${dt(p.starts_at)}</span><span class="vlpa-chip">Fim: ${p.ends_at?dt(p.ends_at):'Sem término'}</span></div></div><div class="vlpa-actions">${buttons.join('')||'<span style="font-size:11px;color:#7b8798;text-align:center">Sem ações</span>'}</div></article>`}).join(''):`<div class="vlpa-empty"><strong>Nenhuma promoção nesta fila</strong><span>Promoções aguardando revisão aparecerão aqui.</span></div>`
  root.innerHTML=`<div class="vlpa-backdrop"><div class="vlpa-modal"><div class="vlpa-head"><div><span class="vlpa-kicker">Moderação comercial</span><h2>Aprovação de promoções</h2><p>Revise e controle as promoções antes que elas apareçam para os moradores.</p></div><button class="vlpa-close" id="vlpa-close">×</button></div><div class="vlpa-toolbar"><input id="vlpa-search" class="vlpa-search" value="${esc(state.search)}" placeholder="Buscar promoção, empresa ou cidade…"><button class="vlpa-tab ${state.filter==='pending_review'?'active':''}" data-filter="pending_review">Pendentes (${counts.pending_review})</button><button class="vlpa-tab ${state.filter==='published'?'active':''}" data-filter="published">Publicadas (${counts.published})</button><button class="vlpa-tab ${state.filter==='rejected'?'active':''}" data-filter="rejected">Rejeitadas (${counts.rejected})</button><button class="vlpa-tab ${state.filter==='archived'?'active':''}" data-filter="archived">Arquivadas (${counts.archived})</button><button class="vlpa-tab ${state.filter==='expired'?'active':''}" data-filter="expired">Expiradas (${counts.expired})</button><button class="vlpa-tab ${state.filter==='all'?'active':''}" data-filter="all">Todas</button></div><div>${cards}</div><div class="vlpa-foot">A publicação também respeita as datas de início e fim definidas na promoção.</div></div></div>`
  root.querySelector('#vlpa-close').onclick=close
  root.querySelector('#vlpa-search').oninput=e=>{state.search=e.target.value;render()}
  root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;render()})
  root.querySelectorAll('[data-pa]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await action(b.dataset.id,b.dataset.pa)}catch(e){alert(`Erro: ${e.message||e}`);b.disabled=false}})
}

async function open(){if(state.open||!supabase)return;if(!(await isAdmin()))return;state.open=true;styles();const root=document.createElement('div');root.id='vl-promotions-admin-v2';document.body.appendChild(root);try{await load();render()}catch(e){root.innerHTML=`<div class="vlpa-backdrop"><div class="vlpa-modal"><button class="vlpa-close" id="vlpa-close">×</button><h2>Erro ao carregar promoções</h2><p>${esc(e.message||e)}</p></div></div>`;root.querySelector('#vlpa-close').onclick=close}}
function close(){document.getElementById('vl-promotions-admin-v2')?.remove();state.open=false}
function ensureButton(){const nav=document.querySelector('.admin-nav');if(!nav||nav.querySelector('[data-vl-promo-v2]'))return;const b=document.createElement('button');b.type='button';b.className='admin-nav-item';b.dataset.vlPromoV2='true';b.innerHTML='<span>🔥</span>Promoções';b.onclick=open;const anchor=[...nav.querySelectorAll('button')].find(x=>(x.textContent||'').includes('Empresas'));if(anchor)anchor.insertAdjacentElement('afterend',b);else nav.appendChild(b)}
async function refreshBadge(){const b=document.querySelector('[data-vl-promo-v2]');if(!b)return;try{if(!(await isAdmin()))return;const {count}=await supabase.from('promotions').select('id',{count:'exact',head:true}).eq('status','pending_review');b.querySelector('.vlpa-nav-badge')?.remove();if(count){const s=document.createElement('b');s.className='vlpa-nav-badge';s.textContent=count;b.appendChild(s)}}catch{}}
function boot(){if(state.initialized)return;state.initialized=true;const obs=new MutationObserver(()=>ensureButton());obs.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});ensureButton();window.setInterval(refreshBadge,30000);setTimeout(refreshBadge,1200)}
boot()
