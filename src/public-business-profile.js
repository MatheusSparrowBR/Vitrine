import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null
const state = { mountedFor:'' }
const esc = (v='') => String(v).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))
const days = [['monday','Segunda'],['tuesday','Terça'],['wednesday','Quarta'],['thursday','Quinta'],['friday','Sexta'],['saturday','Sábado'],['sunday','Domingo']]

function injectStyles(){
  if(document.getElementById('vl-public-business-profile-css')) return
  const s=document.createElement('style'); s.id='vl-public-business-profile-css'; s.textContent=`
  .vlpb-brand-row{display:flex;align-items:center;gap:14px;margin-bottom:10px}.vlpb-logo{width:72px;height:72px;border-radius:18px;overflow:hidden;background:#eef3f8;border:1px solid #dce5ee;display:grid;place-items:center;font:800 25px Manrope;color:#91a4bb;flex:0 0 auto}.vlpb-logo img{width:100%;height:100%;object-fit:cover}.vlpb-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.vlpb-card{border:1px solid #dfe6ee;border-radius:18px;background:#fff;padding:20px}.vlpb-card h2{font:800 20px Manrope;color:#25364e;margin:0 0 12px}.vlpb-card p{margin:0;color:#68778b;font-size:12px;line-height:1.55}.vlpb-hours{display:grid;gap:7px}.vlpb-hour{display:flex;justify-content:space-between;gap:15px;padding:9px 11px;background:#f7f9fc;border-radius:9px;color:#4f5f74;font-size:11px}.vlpb-hour strong{color:#26384f}.vlpb-hour.closed{color:#9a6a6a}.vlpb-map{margin-top:14px;border:1px solid #dfe6ee;border-radius:16px;overflow:hidden;background:#fff}.vlpb-map-head{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e7edf3}.vlpb-map-head strong{font:800 13px Manrope;color:#26384f}.vlpb-map-head a{color:#2474ff;font-size:10px;font-weight:800;text-decoration:none}.vlpb-map iframe{width:100%;height:270px;border:0;display:block}.vlpb-address-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.vlpb-address-actions a,.vlpb-address-actions button{border:1px solid #d7e0e9;background:#fff;color:#30425b;border-radius:9px;padding:8px 10px;font:700 10px 'DM Sans';text-decoration:none;cursor:pointer}.vlpb-address-actions .primary{background:#2474ff;border-color:#2474ff;color:#fff}.vlpb-note{font-size:10px!important;color:#8592a3!important;margin-top:8px!important}
  @media(max-width:720px){.vlpb-contact-grid{grid-template-columns:1fr}.vlpb-brand-row{align-items:flex-start}.vlpb-logo{width:62px;height:62px}}
  `; document.head.appendChild(s)
}

function formatHour(value){return value || '--'}
function hourBlock(b){const h=b.opening_hours&&typeof b.opening_hours==='object'?b.opening_hours:{};return days.map(([key,label])=>{const row=h[key]||{};const closed=Boolean(row.closed);return `<div class="vlpb-hour ${closed?'closed':''}"><strong>${label}</strong><span>${closed?'Fechado':`${formatHour(row.open)} – ${formatHour(row.close)}`}</span></div>`}).join('')}

async function mount(){
  const hero=document.querySelector('.profile-hero');
  const title=hero?.querySelector('.profile-head h1')?.textContent?.trim();
  if(!supabase || !hero || !title || state.mountedFor===title) return
  state.mountedFor=title; injectStyles()
  const {data:b,error}=await supabase.from('businesses').select('id,name,logo_url,address,neighborhood,latitude,longitude,opening_hours,phone,whatsapp,website_url,instagram_url,facebook_url,status,cities(name,state)').eq('name',title).eq('status','active').limit(1).maybeSingle()
  if(error || !b) return
  const container=document.createElement('div'); container.className='vlpb-public-profile';
  const coordinates=Number.isFinite(Number(b.latitude))&&Number.isFinite(Number(b.longitude))
  const mapUrl=coordinates?`https://www.openstreetmap.org/export/embed.html?bbox=${Number(b.longitude)-.008}%2C${Number(b.latitude)-.008}%2C${Number(b.longitude)+.008}%2C${Number(b.latitude)+.008}&layer=mapnik&marker=${Number(b.latitude)}%2C${Number(b.longitude)}`:''
  const mapsLink=coordinates?`https://www.google.com/maps/search/?api=1&query=${Number(b.latitude)},${Number(b.longitude)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([b.address,b.neighborhood,b.cities?.name,b.cities?.state].filter(Boolean).join(', '))}`
  const address=[b.address,b.neighborhood,b.cities?.name,b.cities?.state].filter(Boolean).join(', ')
  container.innerHTML=`<div class="vlpb-contact-grid">
    <article class="vlpb-card"><div class="vlpb-brand-row"><div class="vlpb-logo">${b.logo_url?`<img src="${esc(b.logo_url)}" alt="Logo ${esc(b.name)}">`:'V'}</div><div><span class="business-category">IDENTIDADE</span><h2>${esc(b.name)}</h2><p>Informações de contato e presença digital</p></div></div><div class="vlpb-address-actions">${b.phone?`<a href="tel:${esc(b.phone.replace(/\s/g,''))}">☎ Ligar</a>`:''}${b.whatsapp?`<a class="primary" href="https://wa.me/${esc(b.whatsapp.replace(/\D/g,''))}" target="_blank" rel="noreferrer">💬 WhatsApp</a>`:''}${b.website_url?`<a href="${esc(b.website_url)}" target="_blank" rel="noreferrer">🌐 Site</a>`:''}</div></article>
    <article class="vlpb-card"><h2>Horário de funcionamento</h2><div class="vlpb-hours">${hourBlock(b)}</div><p class="vlpb-note">Os horários informados pela empresa podem sofrer alterações em feriados e datas especiais.</p></article>
  </div>
  <article class="vlpb-card"><h2>Como chegar</h2><p>${esc(address||'Endereço não informado')}</p><div class="vlpb-address-actions"><a class="primary" href="${esc(mapsLink)}" target="_blank" rel="noreferrer">📍 Abrir no Google Maps</a></div><div class="vlpb-map">${coordinates?`<div class="vlpb-map-head"><strong>Localização da empresa</strong><a href="${esc(mapsLink)}" target="_blank" rel="noreferrer">Abrir mapa →</a></div><iframe src="${mapUrl}" title="Mapa de ${esc(b.name)}" loading="lazy"></iframe>`:`<div class="vlpb-map-head"><strong>Localização</strong><a href="${esc(mapsLink)}" target="_blank" rel="noreferrer">Pesquisar no Maps →</a></div><div style="padding:26px;color:#718096;font-size:11px">A empresa ainda não informou latitude e longitude. Use o botão acima para pesquisar o endereço.</div>`}</div></article>`
  const anchor=hero.parentElement?.querySelector('.profile-grid') || hero.nextElementSibling
  if(anchor) anchor.insertAdjacentElement('afterend',container)
  else hero.insertAdjacentElement('afterend',container)
}

function boot(){const observer=new MutationObserver(()=>{if(!document.querySelector('.profile-hero'))state.mountedFor='';else mount()});observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});mount()}
boot()
