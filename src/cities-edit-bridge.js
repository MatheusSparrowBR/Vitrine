import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null
const state = { open:false, initialized:false }

const esc = (v='') => String(v).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))
const slugify = (v='') => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')

async function isAdmin(){
  if(!supabase) return false
  const {data:u}=await supabase.auth.getUser(); if(!u.user) return false
  const {data:p}=await supabase.from('profiles').select('role').eq('id',u.user.id).maybeSingle()
  return p?.role === 'admin'
}

function styles(){
  if(document.getElementById('vlcity-edit-css')) return
  const s=document.createElement('style'); s.id='vlcity-edit-css'; s.textContent=`
  .vlce-btn{border:1px solid #d7e0ea!important;background:#fff!important;color:#3e5066!important;border-radius:8px!important;padding:7px 9px!important;font:700 10px 'DM Sans'!important;cursor:pointer!important}.vlce-btn:hover{border-color:#2474ff!important;color:#2474ff!important}.vlce-backdrop{position:fixed;inset:0;z-index:37000;background:rgba(4,10,20,.66);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.vlce-modal{width:min(650px,100%);background:#fff;border-radius:22px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.3)}.vlce-head{display:flex;justify-content:space-between;gap:18px}.vlce-head h2{margin:7px 0 8px;font:800 27px/1.05 Manrope;color:#122033}.vlce-head p{margin:0;color:#738196;font-size:12px;line-height:1.55}.vlce-kicker{font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#2474ff}.vlce-close{border:0;background:#eef3f8;border-radius:50%;width:36px;height:36px;font-size:22px;color:#607089;cursor:pointer}.vlce-grid{display:grid;grid-template-columns:1.2fr .55fr 1fr 1fr;gap:11px;margin-top:20px}.vlce-field{display:grid;gap:6px}.vlce-field span{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#6c7b90}.vlce-field input{width:100%;box-sizing:border-box;border:1px solid #d9e1ea;border-radius:10px;background:#fff;padding:11px 12px;font:500 12px 'DM Sans';outline:none;color:#26384f}.vlce-check{display:flex;align-items:center;gap:7px;margin-top:12px;font-size:11px;color:#506077}.vlce-status{min-height:18px;margin-top:10px;font-size:11px;color:#65748a}.vlce-status.error{color:#a42f2f}.vlce-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.vlce-actions button{border:1px solid #d6dfe9;background:#fff;border-radius:9px;padding:10px 13px;font:700 11px 'DM Sans';color:#34465c;cursor:pointer}.vlce-actions .primary{background:#2474ff;border-color:#2474ff;color:#fff}.vlce-actions button:disabled{opacity:.6;cursor:not-allowed}@media(max-width:700px){.vlce-grid{grid-template-columns:1fr 1fr}.vlce-grid .wide{grid-column:1/-1}}@media(max-width:520px){.vlce-modal{padding:18px}.vlce-grid{grid-template-columns:1fr}.vlce-actions{flex-direction:column}.vlce-actions button{width:100%}}
  `; document.head.appendChild(s)
}

function close(){document.getElementById('vlce-root')?.remove();state.open=false}

async function openEdit(id){
  if(state.open || !supabase || !(await isAdmin())) return
  state.open=true; styles()
  const root=document.createElement('div'); root.id='vlce-root'
  root.innerHTML='<div class="vlce-backdrop"><div class="vlce-modal"><div class="vlce-head"><div><span class="vlce-kicker">Administração</span><h2>Editar cidade</h2><p>Altere os dados da cidade. Empresas, promoções e conteúdos existentes continuarão vinculados ao mesmo registro.</p></div><button class="vlce-close" type="button">×</button></div><div class="vlce-status" id="vlce-loading">Carregando…</div></div></div>'
  document.body.appendChild(root); root.querySelector('.vlce-close').onclick=close
  try{
    const {data:city,error}=await supabase.from('cities').select('id,name,state,slug,country,active').eq('id',id).single(); if(error) throw error
    const form=document.createElement('form'); form.innerHTML=`<div class="vlce-grid"><label class="vlce-field wide"><span>Nome da cidade</span><input name="name" maxlength="90" required value="${esc(city.name)}"></label><label class="vlce-field"><span>UF</span><input name="state" maxlength="2" required value="${esc(city.state||'SC')}"></label><label class="vlce-field"><span>Slug</span><input name="slug" maxlength="90" required value="${esc(city.slug)}"></label><label class="vlce-field"><span>País</span><input name="country" maxlength="2" value="${esc(city.country||'BR')}"></label></div><label class="vlce-check"><input name="active" type="checkbox" ${city.active?'checked':''}> Cidade ativa no seletor público</label><div class="vlce-status" id="vlce-status"></div><div class="vlce-actions"><button type="button" class="vlce-cancel">Cancelar</button><button type="submit" class="primary">Salvar alterações</button></div>`
    const modal=root.querySelector('.vlce-modal'); modal.querySelector('#vlce-loading')?.remove(); modal.appendChild(form)
    const name=form.querySelector('[name=name]'), slug=form.querySelector('[name=slug]'); name.addEventListener('input',()=>{if(!slug.value || slug.value===city.slug) slug.value=slugify(name.value)})
    form.querySelector('.vlce-cancel').onclick=close
    form.onsubmit=async e=>{e.preventDefault();const status=form.querySelector('#vlce-status');status.classList.remove('error');const data=new FormData(form);const payload={name:String(data.get('name')||'').trim(),state:String(data.get('state')||'').trim().toUpperCase(),slug:slugify(String(data.get('slug')||'')),country:String(data.get('country')||'BR').trim().toUpperCase(),active:data.get('active')==='on',updated_at:new Date().toISOString()};if(!payload.name||payload.state.length!==2||!payload.slug){status.textContent='Preencha nome, UF e slug corretamente.';status.classList.add('error');return}const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Salvando…';const {error}=await supabase.from('cities').update(payload).eq('id',id);if(error){status.textContent=error.message;status.classList.add('error');button.disabled=false;return}close();window.location.reload()}
  }catch(error){root.querySelector('.vlce-modal').querySelector('#vlce-loading').textContent=error?.message||'Não foi possível carregar a cidade.'}
}

function addEditButtons(){
  const nav=document.querySelector('.admin-nav'); const title=document.querySelector('.admin-head h1')?.textContent?.trim();
  if(!nav || title!=='Cidades') { document.querySelectorAll('[data-vl-city-edit]').forEach(x=>x.remove()); return }
  document.querySelectorAll('.city-card-admin').forEach(card=>{
    if(card.querySelector('[data-vl-city-edit]')) return
    const small=card.querySelector('small'); const strong=card.querySelector('strong'); if(!small||!strong) return
    const slugMatch=(small.textContent||'').match(/\/([^·\s]+)/); const slug=slugMatch?.[1]?.trim(); if(!slug) return
    const controls=card.querySelector('button:last-of-type')?.parentElement || card
    const btn=document.createElement('button'); btn.type='button'; btn.className='vlce-btn'; btn.dataset.vlCityEdit='true'; btn.textContent='Editar';
    btn.onclick=async()=>{const {data,error}=await supabase.from('cities').select('id').eq('slug',slug).maybeSingle(); if(error||!data?.id){alert(error?.message||'Cidade não encontrada.');return} openEdit(data.id)}
    controls.appendChild(btn)
  })
}

function boot(){if(state.initialized)return;state.initialized=true;const obs=new MutationObserver(addEditButtons);obs.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});addEditButtons()}
boot()
