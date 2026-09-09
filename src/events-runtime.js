import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = URL && KEY ? createClient(URL, KEY) : null

const css = `
.vl-events{margin:28px 0}.vl-events-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:14px}.vl-events-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.vl-event{overflow:hidden;border:1px solid #e8edf5;border-radius:16px;background:#fff;box-shadow:0 6px 24px rgba(15,35,65,.05)}.vl-event img,.vl-event-placeholder{width:100%;height:150px;object-fit:cover}.vl-event-placeholder{display:grid;place-items:center;background:#f1f5fb;font-size:38px}.vl-event-body{padding:14px}.vl-event-date{font-size:11px;font-weight:900;color:#1f6df2;text-transform:uppercase}.vl-event h3{margin:5px 0 6px;font-size:17px}.vl-event p{margin:0 0 8px;color:#667085;font-size:12px;line-height:1.45}.vl-event-meta{font-size:11px;color:#667085}.vl-events-link{display:inline-block;margin-top:12px;font-weight:800;color:#1f6df2;text-decoration:none}.vl-events-page{max-width:1100px;margin:auto;padding:28px 20px}.vl-events-page .vl-events-grid{grid-template-columns:repeat(3,1fr)}.vl-events-empty{padding:30px;border:1px dashed #d8e0ec;border-radius:16px;color:#667085;text-align:center}@media(max-width:760px){.vl-events-grid,.vl-events-page .vl-events-grid{grid-template-columns:1fr}.vl-events-head{align-items:flex-start;flex-direction:column}}
.vl-events-admin{padding:20px}.vl-events-admin form{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.vl-events-admin label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}.vl-events-admin input,.vl-events-admin textarea,.vl-events-admin select{padding:9px;border:1px solid #dbe2ea;border-radius:9px}.vl-events-admin .full{grid-column:1/-1}.vl-events-admin-actions{display:flex;gap:8px;flex-wrap:wrap}.vl-events-admin table{width:100%;border-collapse:collapse;margin-top:18px}.vl-events-admin th,.vl-events-admin td{text-align:left;padding:9px;border-bottom:1px solid #edf0f4;font-size:12px}.vl-events-admin button{border:0;border-radius:8px;padding:8px 11px;cursor:pointer;font-weight:800}.vl-events-admin .primary{background:#1f6df2;color:#fff}
`
if(!document.getElementById('vl-events-css')){const s=document.createElement('style');s.id='vl-events-css';s.textContent=css;document.head.appendChild(s)}

const slugify=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
const money=v=>v==null?'Gratuito':`R$ ${Number(v).toFixed(2).replace('.',',')}`
const fmtDate=v=>new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})

async function getCity(){
 if(!db)return null
 const slug=location.pathname.split('/').filter(Boolean)[0]||localStorage.getItem('vitrinelocal:selected-city')||'laguna'
 const {data}=await db.from('cities').select('id,name,state,slug').eq('active',true).eq('slug',slug).maybeSingle()
 if(data)return data
 return (await db.from('cities').select('id,name,state,slug').eq('active',true).order('name').limit(1).maybeSingle()).data
}

async function getEvents(cityId){
 if(!db||!cityId)return []
 const today=new Date().toISOString().slice(0,10)
 const {data}=await db.from('events').select('*').eq('city_id',cityId).eq('active',true).gte('event_date',today).order('featured',{ascending:false}).order('event_date').order('start_time').limit(6)
 return data||[]
}

function card(e){return `<article class="vl-event">${e.image_url?`<img src="${e.image_url}" alt="">`:'<div class="vl-event-placeholder">📅</div>'}<div class="vl-event-body"><span class="vl-event-date">${fmtDate(e.event_date)}</span><h3>${escapeHtml(e.title)}</h3>${e.description?`<p>${escapeHtml(e.description)}</p>`:''}<div class="vl-event-meta">${e.start_time?`🕐 ${e.start_time.slice(0,5)}`:''}${e.location?` · 📍 ${escapeHtml(e.location)}`:''}<br/>${money(e.price)}</div>${e.external_url?`<a class="vl-events-link" target="_blank" rel="noreferrer" href="${safeUrl(e.external_url)}">Mais informações →</a>`:''}</div></article>`}
function escapeHtml(v=''){return String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function safeUrl(v=''){try{const u=new URL(v,location.origin);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}}

async function renderHomeEvents(){
 const home=document.querySelector('.hero')?.parentElement
 if(!home||location.pathname.includes('/empresa/'))return
 const city=await getCity();if(!city)return
 const events=await getEvents(city.id)
 const old=document.getElementById('vl-events-home');if(old)old.remove()
 const section=document.createElement('section');section.id='vl-events-home';section.className='page section vl-events'
 section.innerHTML=`<div class="vl-events-head"><div><span class="section-kicker">Agenda da cidade</span><h2>Próximos eventos em ${escapeHtml(city.name)}</h2><p class="muted">Eventos cadastrados e publicados pela administração.</p></div>${events.length?`<a class="vl-events-link" href="/${encodeURIComponent(city.slug)}/eventos">Ver agenda completa →</a>`:''}</div>${events.length?`<div class="vl-events-grid">${events.map(card).join('')}</div>`:'<div class="vl-events-empty">Nenhum evento próximo cadastrado.</div>'}`
 const marker=[...document.querySelectorAll('.page.section')].find(x=>x.querySelector('.content-grid'))
 ;(marker||home.lastElementChild)?.after(section)
}

function hideCommunity(){
 document.querySelectorAll('button,a,.section-kicker,.section-head,h2,h3,aside,section').forEach(el=>{
  const t=(el.textContent||'').trim().toLowerCase()
  if(t==='enviar conteúdo'||t==='enviar conteudo'||t==='comunidade'||t.includes('conteúdo local')||t.includes('o que está acontecendo?')||t.includes('conteudo local')){
   if(el.closest('#vl-events-home'))return
   if(el.tagName==='BUTTON'||el.tagName==='A'||el.classList.contains('section-kicker')||el.tagName==='ASIDE'||el.tagName==='SECTION')el.style.display='none'
  }
 })
}

async function renderEventsPage(){
 const p=location.pathname.split('/').filter(Boolean)
 if(p.length<2||p[1]!=='eventos')return false
 const city=await getCity();if(!city)return true
 const root=document.getElementById('root');if(!root)return true
 root.innerHTML='<main class="vl-events-page"><div class="vl-events-empty">Carregando agenda…</div></main>'
 const events=await getEvents(city.id)
 root.innerHTML=`<main class="vl-events-page"><a class="vl-events-link" href="/${encodeURIComponent(city.slug)}">← Voltar</a><div class="vl-events-head"><div><span class="section-kicker">Agenda da cidade</span><h1>Eventos em ${escapeHtml(city.name)}</h1><p class="muted">Confira os próximos eventos cadastrados na cidade.</p></div></div>${events.length?`<div class="vl-events-grid">${events.map(card).join('')}</div>`:'<div class="vl-events-empty">Nenhum evento próximo cadastrado.</div>'}</main>`
 return true
}

async function adminEvents(){
 if(location.pathname!=='/admin')return
 const admin=document.querySelector('.admin-main');if(!admin)return
 const nav=document.querySelector('.admin-nav');if(!nav||document.getElementById('vl-events-admin-btn'))return
 const btn=document.createElement('button');btn.id='vl-events-admin-btn';btn.className='admin-nav-item';btn.innerHTML='<span>📅</span>Eventos';nav.appendChild(btn)
 btn.onclick=async()=>{
  document.querySelectorAll('.admin-nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active')
  const main=document.querySelector('.admin-main');main.innerHTML='<div class="vl-events-admin"><div class="admin-head"><div><span class="section-kicker">Agenda</span><h1>Eventos da cidade</h1><p>Cadastre e gerencie os eventos que aparecem na página inicial.</p></div></div><div id="vl-events-admin-content">Carregando…</div></div>'
  const {data:cities}=await db.from('cities').select('id,name,state').order('name')
  let rows=(await db.from('events').select('* , cities(name,state)').order('event_date').order('start_time')).data||[]
  const render=()=>{document.getElementById('vl-events-admin-content').innerHTML=`<form id="vl-event-form"><label>Evento<input name="title" required placeholder="Nome do evento"></label><label>Cidade<select name="city_id" required>${(cities||[]).map(c=>`<option value="${c.id}">${escapeHtml(c.name)} - ${c.state}</option>`).join('')}</select></label><label>Data<input type="date" name="event_date" required></label><label>Horário<input type="time" name="start_time"></label><label>Fim<input type="time" name="end_time"></label><label>Categoria<input name="category" placeholder="Cultura, esporte…"></label><label>Preço<input type="number" step="0.01" min="0" name="price" placeholder="0 = gratuito"></label><label>Local<input name="location" placeholder="Ex.: Praça República Juliana"></label><label class="full">Endereço<input name="address"></label><label class="full">Imagem (URL)<input name="image_url" type="url"></label><label class="full">Descrição<textarea name="description" rows="4"></textarea></label><label class="full">Link externo<input name="external_url" type="url"></label><label><span>Opções</span><select name="featured"><option value="false">Normal</option><option value="true">Destacar na Home</option></select></label><div class="vl-events-admin-actions full"><button class="primary">Cadastrar evento</button></div></form><table><thead><tr><th>Evento</th><th>Cidade</th><th>Data</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(e=>`<tr><td><strong>${escapeHtml(e.title)}</strong></td><td>${escapeHtml(e.cities?.name||'—')}</td><td>${fmtDate(e.event_date)}</td><td>${e.active?'Ativo':'Inativo'}</td><td><button data-toggle="${e.id}">${e.active?'Desativar':'Ativar'}</button><button data-delete="${e.id}">Excluir</button></td></tr>`).join('')}</tbody></table>`
  document.getElementById('vl-event-form').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.currentTarget);const payload={title:f.get('title').trim(),slug:`${slugify(f.get('title'))}-${crypto.randomUUID().slice(0,8)}`,city_id:f.get('city_id'),event_date:f.get('event_date'),start_time:f.get('start_time')||null,end_time:f.get('end_time')||null,category:f.get('category')||null,price:f.get('price')?Number(f.get('price')):null,location:f.get('location')||null,address:f.get('address')||null,image_url:f.get('image_url')||null,description:f.get('description')||null,external_url:f.get('external_url')||null,featured:f.get('featured')==='true',active:true};const {error}=await db.from('events').insert(payload);if(error)alert(error.message);else{alert('Evento cadastrado.');rows=(await db.from('events').select('* , cities(name,state)').order('event_date').order('start_time')).data||[];render()}}
  document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{await db.from('events').update({active:b.textContent==='Ativar'}).eq('id',b.dataset.toggle);rows=(await db.from('events').select('* , cities(name,state)').order('event_date').order('start_time')).data||[];render()})
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este evento?'))return;await db.from('events').delete().eq('id',b.dataset.delete);rows=(await db.from('events').select('* , cities(name,state)').order('event_date').order('start_time')).data||[];render()})}
  render()
 }
}

let lastPath=''
async function boot(){
 if(location.pathname!==lastPath){lastPath=location.pathname;if(await renderEventsPage())return}
 hideCommunity();
 if(location.pathname==='/admin')adminEvents()
 if(!location.pathname.includes('/eventos'))renderHomeEvents()
}
setInterval(boot,1200)
boot()
