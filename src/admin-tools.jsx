import React, { useEffect, useMemo, useState } from 'react'

const BUCKET = 'premium-banners'
const MAX_BANNER_BYTES = 10 * 1024 * 1024
const BANNER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const esc = (v = '') => String(v).replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]))
const slugify = (v = '') => String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const formatMoney = v => v == null ? '—' : `R$ ${Number(v).toFixed(2).replace('.', ',')}`
const isLive = row => {
  const now = Date.now()
  return row.active && (!row.starts_at || new Date(row.starts_at).getTime() <= now) && (!row.ends_at || new Date(row.ends_at).getTime() >= now)
}
const emptyPlan = { code:'', name:'', description:'', price_monthly:'', price_yearly:'', active:true, sort_order:0, features:'{}' }

export default function AdminTools({ supabase, session, onClose, onToast }) {
  const [tab, setTab] = useState('cities')
  const [cities, setCities] = useState([])
  const [categories, setCategories] = useState([])
  const [promotions, setPromotions] = useState([])
  const [banners, setBanners] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCity, setEditingCity] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingPlan, setEditingPlan] = useState(null)
  const [busy, setBusy] = useState('')

  const [cityForm, setCityForm] = useState({ name:'', state:'SC', slug:'', country:'Brasil', active:true })
  const [categoryForm, setCategoryForm] = useState({ name:'', slug:'', icon:'✦', description:'', sort_order:0, active:true })
  const [promotionForm, setPromotionForm] = useState({ business_id:'', title:'', description:'', price:'', original_price:'', starts_at:'', ends_at:'' })
  const [bannerForm, setBannerForm] = useState({ business_id:'', city_id:'', title:'', description:'', target_url:'', priority:0, starts_at:'', ends_at:'', image:null })
  const [planForm, setPlanForm] = useState(emptyPlan)

  const activeBusinesses = useMemo(() => businesses.filter(b => b.status === 'active'), [businesses])
  const pendingPromotions = useMemo(() => promotions.filter(p => p.status === 'pending_review'), [promotions])

  async function loadAll() {
    setLoading(true)
    const [c1,c2,p,b,ads,pl] = await Promise.all([
      supabase.from('cities').select('id,name,state,slug,country,active,created_at,updated_at').order('name'),
      supabase.from('categories').select('id,name,slug,icon,description,sort_order,active').order('sort_order').order('name'),
      supabase.from('promotions').select('id,business_id,title,description,price,original_price,starts_at,ends_at,status,created_at,businesses(name,slug,cities(name,state))').order('created_at',{ascending:false}).limit(200),
      supabase.from('businesses').select('id,name,status,city_id,cities(name,state)').order('name').limit(300),
      supabase.from('advertisements').select('id,business_id,city_id,title,description,image_url,image_path,target_url,active,priority,starts_at,ends_at,cities(name,state),businesses(name)').eq('placement','home_banner').order('created_at',{ascending:false}).limit(200),
      supabase.from('plans').select('id,code,name,description,price_monthly,price_yearly,features,active,sort_order,created_at,updated_at').order('sort_order').order('price_monthly'),
    ])
    if(c1.error) onToast?.(c1.error.message,true)
    if(c2.error) onToast?.(c2.error.message,true)
    if(p.error) onToast?.(p.error.message,true)
    if(b.error) onToast?.(b.error.message,true)
    if(ads.error) onToast?.(ads.error.message,true)
    if(pl.error) onToast?.(pl.error.message,true)
    setCities(c1.data || [])
    setCategories(c2.data || [])
    setPromotions(p.data || [])
    setBusinesses(b.data || [])
    setBanners(ads.data || [])
    setPlans(pl.data || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function resetCity() { setEditingCity(null); setCityForm({ name:'', state:'SC', slug:'', country:'Brasil', active:true }) }
  function editCity(row) { setEditingCity(row); setCityForm({name:row.name,state:row.state,slug:row.slug,country:row.country || 'Brasil',active:row.active}) }
  function resetCategory() { setEditingCategory(null); setCategoryForm({name:'',slug:'',icon:'✦',description:'',sort_order:0,active:true}) }
  function editCategory(row) { setEditingCategory(row); setCategoryForm({name:row.name,slug:row.slug,icon:row.icon||'✦',description:row.description||'',sort_order:row.sort_order||0,active:row.active}) }
  function resetPlan() { setEditingPlan(null); setPlanForm(emptyPlan) }
  function editPlan(row) {
    setEditingPlan(row)
    setPlanForm({
      code:row.code || '', name:row.name || '', description:row.description || '',
      price_monthly:row.price_monthly ?? '', price_yearly:row.price_yearly ?? '',
      active:Boolean(row.active), sort_order:row.sort_order || 0,
      features:JSON.stringify(row.features || {}, null, 2)
    })
  }

  async function saveCity(event) {
    event.preventDefault(); setBusy('city')
    try {
      const payload = { name:cityForm.name.trim(), state:cityForm.state.trim().toUpperCase(), slug:slugify(cityForm.slug || cityForm.name), country:cityForm.country.trim() || 'Brasil', active:Boolean(cityForm.active), updated_at:new Date().toISOString() }
      const result = editingCity ? await supabase.from('cities').update(payload).eq('id',editingCity.id) : await supabase.from('cities').insert(payload)
      if(result.error) throw result.error
      onToast?.(editingCity ? 'Cidade atualizada.' : 'Cidade criada.'); resetCity(); await loadAll()
    } catch(e) { onToast?.(e.message || 'Não foi possível salvar a cidade.', true) }
    finally { setBusy('') }
  }

  async function toggleCity(row) {
    setBusy(row.id)
    const { error } = await supabase.from('cities').update({active:!row.active,updated_at:new Date().toISOString()}).eq('id',row.id)
    if(error) onToast?.(error.message,true); else { onToast?.(row.active ? 'Cidade desativada.' : 'Cidade ativada.'); await loadAll() }
    setBusy('')
  }

  async function saveCategory(event) {
    event.preventDefault(); setBusy('category')
    try {
      const payload = { name:categoryForm.name.trim(), slug:slugify(categoryForm.slug || categoryForm.name), icon:categoryForm.icon.trim() || '✦', description:categoryForm.description.trim() || null, sort_order:Number(categoryForm.sort_order)||0, active:Boolean(categoryForm.active) }
      const result = editingCategory ? await supabase.from('categories').update(payload).eq('id',editingCategory.id) : await supabase.from('categories').insert(payload)
      if(result.error) throw result.error
      onToast?.(editingCategory ? 'Categoria atualizada.' : 'Categoria criada.'); resetCategory(); await loadAll()
    } catch(e) { onToast?.(e.message || 'Não foi possível salvar a categoria.', true) }
    finally { setBusy('') }
  }

  async function toggleCategory(row) {
    setBusy(row.id)
    const { error } = await supabase.from('categories').update({active:!row.active}).eq('id',row.id)
    if(error) onToast?.(error.message,true); else { onToast?.(row.active ? 'Categoria desativada.' : 'Categoria ativada.'); await loadAll() }
    setBusy('')
  }

  async function updatePromotion(id, status) {
    setBusy(id)
    const { error } = await supabase.from('promotions').update({status, updated_at:new Date().toISOString()}).eq('id',id)
    if(error) onToast?.(error.message,true); else { onToast?.(status==='published' ? 'Promoção publicada.' : 'Promoção rejeitada.'); await loadAll() }
    setBusy('')
  }

  async function createPromotion(event) {
    event.preventDefault(); setBusy('promotion')
    const { error } = await supabase.from('promotions').insert({business_id:promotionForm.business_id,title:promotionForm.title.trim(),description:promotionForm.description.trim() || null,price:promotionForm.price === '' ? null : Number(promotionForm.price),original_price:promotionForm.original_price === '' ? null : Number(promotionForm.original_price),starts_at:promotionForm.starts_at ? new Date(promotionForm.starts_at).toISOString() : null,ends_at:promotionForm.ends_at ? new Date(promotionForm.ends_at).toISOString() : null,status:'pending_review'})
    if(error) onToast?.(error.message,true); else { onToast?.('Promoção enviada para revisão.'); setPromotionForm({business_id:'',title:'',description:'',price:'',original_price:'',starts_at:'',ends_at:''}); await loadAll() }
    setBusy('')
  }

  async function createBanner(event) {
    event.preventDefault(); setBusy('banner'); let path = ''
    try {
      const file = bannerForm.image
      if(!file) throw new Error('Selecione a arte do banner.')
      if(!BANNER_TYPES.has(file.type)) throw new Error('Use JPG, PNG ou WebP.')
      if(file.size > MAX_BANNER_BYTES) throw new Error('A imagem deve ter no máximo 10 MB.')
      path = `home/${crypto.randomUUID()}.${file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'}`
      const upload = await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false})
      if(upload.error) throw upload.error
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
      const { error } = await supabase.from('advertisements').insert({business_id:bannerForm.business_id,city_id:bannerForm.city_id,title:bannerForm.title.trim(),description:bannerForm.description.trim() || null,image_url:url,image_path:path,target_url:bannerForm.target_url.trim() || null,placement:'home_banner',priority:Number(bannerForm.priority)||0,starts_at:bannerForm.starts_at ? new Date(bannerForm.starts_at).toISOString() : null,ends_at:bannerForm.ends_at ? new Date(bannerForm.ends_at).toISOString() : null,active:false})
      if(error) throw error
      onToast?.('Banner criado em revisão.'); setBannerForm({business_id:'',city_id:'',title:'',description:'',target_url:'',priority:0,starts_at:'',ends_at:'',image:null}); await loadAll()
    } catch(e) { if(path) await supabase.storage.from(BUCKET).remove([path]).catch(()=>{}); onToast?.(e.message || 'Não foi possível criar o banner.',true) }
    finally { setBusy('') }
  }

  async function toggleBanner(row) {
    setBusy(row.id); const { error } = await supabase.from('advertisements').update({active:!row.active}).eq('id',row.id)
    if(error) onToast?.(error.message,true); else { onToast?.(row.active ? 'Banner pausado.' : 'Banner publicado.'); await loadAll() }; setBusy('')
  }

  async function deleteBanner(row) {
    if(!window.confirm('Excluir este banner?')) return
    setBusy(row.id); const { error } = await supabase.from('advertisements').delete().eq('id',row.id)
    if(error) onToast?.(error.message,true); else { if(row.image_path) await supabase.storage.from(BUCKET).remove([row.image_path]).catch(()=>{}); onToast?.('Banner excluído.'); await loadAll() }; setBusy('')
  }

  async function savePlan(event) {
    event.preventDefault(); setBusy('plan')
    try {
      if(!planForm.name.trim()) throw new Error('Informe o nome do plano.')
      if(!planForm.code.trim()) throw new Error('Informe o código do plano.')
      let features = {}
      try { features = JSON.parse(planForm.features || '{}') } catch { throw new Error('Benefícios/limites devem estar em JSON válido.') }
      const payload = {
        code:planForm.code.trim().toLowerCase(), name:planForm.name.trim(), description:planForm.description.trim() || null,
        price_monthly:planForm.price_monthly === '' ? 0 : Number(planForm.price_monthly),
        price_yearly:planForm.price_yearly === '' ? 0 : Number(planForm.price_yearly),
        features, active:Boolean(planForm.active), sort_order:Number(planForm.sort_order)||0, updated_at:new Date().toISOString()
      }
      const result = editingPlan ? await supabase.from('plans').update(payload).eq('id',editingPlan.id) : await supabase.from('plans').insert(payload)
      if(result.error) throw result.error
      onToast?.(editingPlan ? 'Plano atualizado com sucesso.' : 'Plano criado com sucesso.')
      resetPlan(); await loadAll()
    } catch(e) { onToast?.(e.message || 'Não foi possível salvar o plano.',true) }
    finally { setBusy('') }
  }

  async function togglePlan(row) {
    setBusy(row.id)
    const { error } = await supabase.from('plans').update({active:!row.active,updated_at:new Date().toISOString()}).eq('id',row.id)
    if(error) onToast?.(error.message,true); else { onToast?.(row.active ? 'Plano desativado.' : 'Plano ativado.'); await loadAll() }
    setBusy('')
  }

  return <div className="vl-admin-tools-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}>
    <div className="vl-admin-tools-modal">
      <div className="vl-admin-tools-head"><div><span>CONTROLES DA PLATAFORMA</span><h2>Gestão administrativa</h2><p>Cidades, categorias, promoções, banners Premium e planos comerciais em um único lugar.</p></div><button onClick={onClose}>×</button></div>
      <div className="vl-admin-tools-tabs">
        {[['cities','Cidades'],['categories','Categorias'],['promotions','Promoções'],['banners','Banners Premium'],['plans','Planos']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}{id==='promotions'&&pendingPromotions.length>0?<b>{pendingPromotions.length}</b>:null}</button>)}
      </div>
      {loading ? <div className="vl-admin-tools-loading">Carregando dados administrativos…</div> : <>
        {tab==='cities' && <div className="vl-admin-tools-grid2">
          <form className="vl-admin-form-card" onSubmit={saveCity}><h3>{editingCity?'Editar cidade':'Nova cidade'}</h3><p>Uma cidade ativa fica disponível para moradores e novos cadastros.</p><label>Nome<input value={cityForm.name} onChange={e=>setCityForm({...cityForm,name:e.target.value})} placeholder="Ex.: Tubarão" required/></label><label>UF<input value={cityForm.state} onChange={e=>setCityForm({...cityForm,state:e.target.value})} maxLength={2} required/></label><label>Slug<input value={cityForm.slug} onChange={e=>setCityForm({...cityForm,slug:e.target.value})} placeholder="tubarao"/></label><label>País<input value={cityForm.country} onChange={e=>setCityForm({...cityForm,country:e.target.value})}/></label><label className="check"><input type="checkbox" checked={cityForm.active} onChange={e=>setCityForm({...cityForm,active:e.target.checked})}/> Ativa</label><div className="row-actions"><button type="button" onClick={resetCity}>Limpar</button><button className="primary" disabled={busy==='city'}>{editingCity?'Salvar alterações':'Criar cidade'}</button></div></form>
          <div className="vl-admin-list-card"><div className="list-title"><h3>Cidades cadastradas</h3><span>{cities.length}</span></div>{cities.map(c=><div className="vl-admin-list-row" key={c.id}><div><strong>{esc(c.name)} - {esc(c.state)}</strong><small>/{esc(c.slug)} · {c.active?'Ativa':'Desativada'}</small></div><div><button onClick={()=>editCity(c)}>Editar</button><button onClick={()=>toggleCity(c)} disabled={busy===c.id}>{c.active?'Desativar':'Ativar'}</button></div></div>)}</div>
        </div>}
        {tab==='categories' && <div className="vl-admin-tools-grid2">
          <form className="vl-admin-form-card" onSubmit={saveCategory}><h3>{editingCategory?'Editar categoria':'Nova categoria'}</h3><label>Nome<input value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm,name:e.target.value})} required/></label><label>Slug<input value={categoryForm.slug} onChange={e=>setCategoryForm({...categoryForm,slug:e.target.value})}/></label><label>Ícone<input value={categoryForm.icon} onChange={e=>setCategoryForm({...categoryForm,icon:e.target.value})} placeholder="🍕"/></label><label>Ordem<input type="number" value={categoryForm.sort_order} onChange={e=>setCategoryForm({...categoryForm,sort_order:e.target.value})}/></label><label>Descrição<textarea value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})}/></label><label className="check"><input type="checkbox" checked={categoryForm.active} onChange={e=>setCategoryForm({...categoryForm,active:e.target.checked})}/> Ativa</label><div className="row-actions"><button type="button" onClick={resetCategory}>Limpar</button><button className="primary" disabled={busy==='category'}>{editingCategory?'Salvar alterações':'Criar categoria'}</button></div></form>
          <div className="vl-admin-list-card"><div className="list-title"><h3>Categorias cadastradas</h3><span>{categories.length}</span></div>{categories.map(c=><div className="vl-admin-list-row" key={c.id}><div><strong>{c.icon||'✦'} {esc(c.name)}</strong><small>/{esc(c.slug)} · {c.active?'Ativa':'Desativada'}</small></div><div><button onClick={()=>editCategory(c)}>Editar</button><button onClick={()=>toggleCategory(c)}>{c.active?'Desativar':'Ativar'}</button></div></div>)}</div>
        </div>}
        {tab==='promotions' && <div className="vl-admin-tools-grid2">
          <form className="vl-admin-form-card" onSubmit={createPromotion}><h3>Criar promoção</h3><p>O fluxo também passa por revisão antes da publicação.</p><label>Empresa<select value={promotionForm.business_id} onChange={e=>setPromotionForm({...promotionForm,business_id:e.target.value})} required><option value="">Selecione</option>{activeBusinesses.map(b=><option key={b.id} value={b.id}>{b.name} · {b.cities?.name}</option>)}</select></label><label>Título<input value={promotionForm.title} onChange={e=>setPromotionForm({...promotionForm,title:e.target.value})} required/></label><label>Descrição<textarea value={promotionForm.description} onChange={e=>setPromotionForm({...promotionForm,description:e.target.value})}/></label><div className="split"><label>Preço<input type="number" step="0.01" value={promotionForm.price} onChange={e=>setPromotionForm({...promotionForm,price:e.target.value})}/></label><label>Preço original<input type="number" step="0.01" value={promotionForm.original_price} onChange={e=>setPromotionForm({...promotionForm,original_price:e.target.value})}/></label></div><div className="split"><label>Início<input type="datetime-local" value={promotionForm.starts_at} onChange={e=>setPromotionForm({...promotionForm,starts_at:e.target.value})}/></label><label>Fim<input type="datetime-local" value={promotionForm.ends_at} onChange={e=>setPromotionForm({...promotionForm,ends_at:e.target.value})}/></label></div><button className="primary full" disabled={busy==='promotion'}>Enviar para revisão</button></form>
          <div className="vl-admin-list-card"><div className="list-title"><h3>Fila de promoções</h3><span>{pendingPromotions.length} pendentes</span></div>{promotions.length ? promotions.map(p=><div className="vl-admin-list-row" key={p.id}><div><strong>{esc(p.title)}</strong><small>{esc(p.businesses?.name || 'Empresa')} · {esc(p.businesses?.cities?.name || 'Cidade')} · {p.status} · {formatMoney(p.price)}</small></div><div>{p.status==='pending_review'&&<><button onClick={()=>updatePromotion(p.id,'published')} disabled={busy===p.id}>Aprovar</button><button onClick={()=>updatePromotion(p.id,'rejected')} disabled={busy===p.id}>Rejeitar</button></>}</div></div>) : <div className="vl-admin-empty">Nenhuma promoção cadastrada.</div>}</div>
        </div>}
        {tab==='banners' && <div className="vl-admin-tools-grid2">
          <form className="vl-admin-form-card" onSubmit={createBanner}><h3>Novo banner Premium</h3><p>O banner aparece somente na Home da cidade escolhida.</p><label>Empresa<select value={bannerForm.business_id} onChange={e=>setBannerForm({...bannerForm,business_id:e.target.value})} required><option value="">Selecione</option>{activeBusinesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Cidade<select value={bannerForm.city_id} onChange={e=>setBannerForm({...bannerForm,city_id:e.target.value})} required><option value="">Selecione</option>{cities.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name} - {c.state}</option>)}</select></label><label>Título<input value={bannerForm.title} onChange={e=>setBannerForm({...bannerForm,title:e.target.value})} required/></label><label>Descrição<input value={bannerForm.description} onChange={e=>setBannerForm({...bannerForm,description:e.target.value})}/></label><label>Imagem<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setBannerForm({...bannerForm,image:e.target.files?.[0]||null})} required/></label><label>Link<input type="url" value={bannerForm.target_url} onChange={e=>setBannerForm({...bannerForm,target_url:e.target.value})} placeholder="https://..."/></label><div className="split"><label>Prioridade<input type="number" value={bannerForm.priority} onChange={e=>setBannerForm({...bannerForm,priority:e.target.value})}/></label><label>Início<input type="datetime-local" value={bannerForm.starts_at} onChange={e=>setBannerForm({...bannerForm,starts_at:e.target.value})}/></label></div><label>Fim<input type="datetime-local" value={bannerForm.ends_at} onChange={e=>setBannerForm({...bannerForm,ends_at:e.target.value})}/></label><button className="primary full" disabled={busy==='banner'}>Criar banner</button></form>
          <div className="vl-admin-list-card"><div className="list-title"><h3>Banners cadastrados</h3><span>{banners.length}</span></div>{banners.length ? banners.map(b=><div className="vl-admin-list-row" key={b.id}><div><strong>{esc(b.title)}</strong><small>{esc(b.businesses?.name || 'Empresa')} · {esc(b.cities?.name || 'Cidade')} · {b.active && isLive(b) ? 'Publicado' : b.active ? 'Aguardando data' : 'Em revisão'}</small></div><div><button onClick={()=>toggleBanner(b)} disabled={busy===b.id}>{b.active?'Pausar':'Publicar'}</button><button onClick={()=>deleteBanner(b)} disabled={busy===b.id}>Excluir</button></div></div>) : <div className="vl-admin-empty">Nenhum banner cadastrado.</div>}</div>
        </div>}
        {tab==='plans' && <div className="vl-admin-tools-grid2">
          <form className="vl-admin-form-card" onSubmit={savePlan}>
            <h3>{editingPlan ? `Editar plano: ${editingPlan.name}` : 'Novo plano'}</h3>
            <p>Somente administradores devem alterar preços, benefícios e limites comerciais.</p>
            <label>Código interno<input value={planForm.code} onChange={e=>setPlanForm({...planForm,code:e.target.value})} placeholder="pro" required disabled={Boolean(editingPlan)}/></label>
            <label>Nome<input value={planForm.name} onChange={e=>setPlanForm({...planForm,name:e.target.value})} placeholder="Plano Pro" required/></label>
            <label>Descrição<textarea value={planForm.description} onChange={e=>setPlanForm({...planForm,description:e.target.value})} placeholder="Mais destaque e recursos para crescer."/></label>
            <div className="split"><label>Preço mensal<input type="number" min="0" step="0.01" value={planForm.price_monthly} onChange={e=>setPlanForm({...planForm,price_monthly:e.target.value})}/></label><label>Preço anual<input type="number" min="0" step="0.01" value={planForm.price_yearly} onChange={e=>setPlanForm({...planForm,price_yearly:e.target.value})}/></label></div>
            <div className="split"><label>Ordem<input type="number" value={planForm.sort_order} onChange={e=>setPlanForm({...planForm,sort_order:e.target.value})}/></label><label className="check"><input type="checkbox" checked={planForm.active} onChange={e=>setPlanForm({...planForm,active:e.target.checked})}/> Plano ativo</label></div>
            <label>Benefícios e limites (JSON)<textarea rows="10" value={planForm.features} onChange={e=>setPlanForm({...planForm,features:e.target.value})} spellCheck="false" placeholder={'{\n  "photos": 10,\n  "promotions": true,\n  "analytics": true\n}'}/></label>
            <div className="row-actions"><button type="button" onClick={resetPlan}>Limpar</button><button className="primary" disabled={busy==='plan'}>{busy==='plan'?'Salvando…':editingPlan?'Salvar alterações':'Criar plano'}</button></div>
          </form>
          <div className="vl-admin-list-card"><div className="list-title"><div><h3>Planos comerciais</h3><small>Os valores publicados na página de planos vêm desta tabela.</small></div><span>{plans.length}</span></div>{plans.length ? plans.map(p=><div className="vl-admin-list-row" key={p.id}><div><strong>{esc(p.name)} <small style={{display:'inline'}}>({esc(p.code)})</small></strong><small>{formatMoney(p.price_monthly)}/mês · {formatMoney(p.price_yearly)}/ano · {p.active?'Ativo':'Desativado'}</small></div><div><button onClick={()=>editPlan(p)}>Editar</button><button onClick={()=>togglePlan(p)} disabled={busy===p.id}>{p.active?'Desativar':'Ativar'}</button></div></div>) : <div className="vl-admin-empty">Nenhum plano cadastrado.</div>}</div>
        </div>}
      </>}
    </div>
  </div>
}
