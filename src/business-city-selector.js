import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null
const CITY_KEY = 'vitrinelocal:selected-city'
const state = { bootedForms: new WeakSet(), cities: null }

const esc = (value='') => String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))
const slugify = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')

async function loadCities(){
  if(!supabase) return []
  if(state.cities) return state.cities
  const {data,error}=await supabase.from('cities').select('id,name,state,slug').eq('active',true).order('name')
  if(error) throw error
  state.cities=data||[]
  return state.cities
}

function addStyles(){
  if(document.getElementById('vl-business-city-css')) return
  const style=document.createElement('style'); style.id='vl-business-city-css'; style.textContent=`
    .vl-business-city-field{grid-column:1/-1!important;display:grid;gap:6px}.vl-business-city-field span{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#6c7b90}.vl-business-city-field select{width:100%;box-sizing:border-box;border:1px solid #d9e1ea;border-radius:10px;background:#fff;padding:11px 12px;font:600 12px 'DM Sans';color:#26384f;outline:none}.vl-business-city-help{font-size:10px;color:#7b8798;line-height:1.4}.vl-business-city-error{grid-column:1/-1;color:#a42f2f;font-size:11px}
  `; document.head.appendChild(style)
}

async function wireForm(form){
  if(state.bootedForms.has(form) || !supabase) return
  const kicker=form.closest('.modal')?.querySelector('.modal-kicker')
  if(!kicker || !String(kicker.textContent||'').includes('Nova empresa')) return
  state.bootedForms.add(form); addStyles()
  const cities=await loadCities()
  const existing=form.querySelector('[data-business-city]')
  if(existing) return
  const field=document.createElement('label'); field.className='vl-business-city-field'; field.innerHTML=`<span>Cidade da empresa *</span><select data-business-city required><option value="">Selecione a cidade</option>${cities.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} - ${esc(c.state)}</option>`).join('')}</select><small class="vl-business-city-help">A empresa ficará vinculada a esta cidade e aparecerá somente nela.</small>`
  const category=form.querySelector('select')
  if(category) category.insertAdjacentElement('afterend',field); else form.prepend(field)
  const select=field.querySelector('select')
  const preferred=localStorage.getItem(CITY_KEY)
  const preferredCity=cities.find(c=>c.slug===preferred)
  if(preferredCity) select.value=preferredCity.id

  form.addEventListener('submit',async(event)=>{
    event.preventDefault(); event.stopImmediatePropagation()
    const cityId=select.value
    if(!cityId){ window.alert('Selecione a cidade à qual a empresa pertence.'); return }
    const userRes=await supabase.auth.getUser()
    if(userRes.error || !userRes.data.user){ window.alert('Entre na sua conta para cadastrar a empresa.'); return }
    const city=cities.find(c=>c.id===cityId)
    const get=placeholder=>form.querySelector(`[placeholder="${CSS.escape(placeholder)}"]`)
    const name=get('Nome da empresa')?.value?.trim()||''
    const short_description=get('Descrição curta')?.value?.trim()||null
    const whatsapp=get('WhatsApp')?.value?.trim()||null
    const instagram_url=get('Instagram URL')?.value?.trim()||null
    const website_url=get('Site URL')?.value?.trim()||null
    const phone=get('Telefone')?.value?.trim()||null
    const neighborhood=get('Bairro')?.value?.trim()||null
    const address=get('Endereço')?.value?.trim()||null
    const cover_url=get('URL da imagem de capa (opcional)')?.value?.trim()||null
    const description=form.querySelector('textarea[placeholder="Descrição completa"]')?.value?.trim()||null
    const category_id=form.querySelector('select:not([data-business-city])')?.value||null
    const errorNode=document.createElement('div'); errorNode.className='vl-business-city-error'; form.appendChild(errorNode)
    if(!name){errorNode.textContent='Informe o nome da empresa.';return}
    const submit=form.querySelector('button[type="submit"]'); submit.disabled=true; submit.textContent='Enviando…'
    try{
      const {error}=await supabase.from('businesses').insert({owner_id:userRes.data.user.id,city_id:cityId,category_id,name,slug:`${slugify(name)}-${Math.random().toString(36).slice(2,7)}`,short_description,description,whatsapp,instagram_url,website_url,phone,neighborhood,address,cover_url,status:'pending'})
      if(error) throw error
      window.alert(`Empresa enviada para análise. Cidade: ${city.name} - ${city.state}.`)
      form.closest('.modal')?.querySelector('.modal-close')?.click()
      window.location.reload()
    }catch(error){ errorNode.textContent=error?.message||'Não foi possível cadastrar a empresa.'; submit.disabled=false; submit.textContent='Enviar para análise' }
  },true)
}

function boot(){
  const observer=new MutationObserver(()=>document.querySelectorAll('.modal.wide form.form-grid').forEach(form=>wireForm(form).catch(()=>{})))
  observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
}
boot()
