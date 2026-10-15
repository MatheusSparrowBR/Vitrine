import { useEffect, useState } from 'react'
import { supabase as db } from './supabase-client.js'
import { eventWhenLabel } from './event-utils.js'
import { EVENT_PLAN_NOTICE, ownerEventStatus, validateEventDraft } from './owner-event-rules.js'
import './job-postings.css'

const MEDIA_BUCKET = 'business-media'
const EMPTY = { title: '', description: '', event_date: '', event_end_date: '', start_time: '', end_time: '', location: '', address: '', category: '', price: '', external_url: '' }
const slugify = value => String(value || 'evento').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'evento'

export default function OwnerEventsSection({ businessId, businessName, cityId }) {
  const [items, setItems] = useState([])
  const [allowed, setAllowed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [cover, setCover] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', error: false })

  const notify = (text, error = false) => setMessage({ text: String(text || ''), error })
  const update = field => event => setForm(current => ({ ...current, [field]: event.target.value }))

  async function load() {
    if (!db || !businessId) return
    setLoading(true)
    const [events, plan] = await Promise.all([
      db.from('events')
        .select('id,title,description,image_url,event_date,event_end_date,start_time,end_time,location,address,category,price,external_url,active,review_status')
        .eq('business_id', businessId)
        .order('event_date', { ascending: false }),
      db.rpc('business_plan_allows_events', { p_business_id: businessId }),
    ])
    if (events.error) notify(events.error.message, true)
    setItems(events.data || [])
    setAllowed(plan.error ? false : Boolean(plan.data))
    setLoading(false)
  }

  useEffect(() => { load() }, [businessId])

  function startNew() {
    setEditing('new')
    setCover(null)
    setForm({ ...EMPTY, location: businessName || '' })
    notify('')
  }

  function startEdit(event) {
    setEditing(event)
    setCover(null)
    setForm({
      title: event.title || '', description: event.description || '', event_date: event.event_date || '', event_end_date: event.event_end_date || '',
      start_time: event.start_time ? String(event.start_time).slice(0, 5) : '', end_time: event.end_time ? String(event.end_time).slice(0, 5) : '',
      location: event.location || '', address: event.address || '', category: event.category || '', price: event.price ?? '', external_url: event.external_url || '',
    })
    notify('')
  }

  function chooseCover(file) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return notify('Selecione uma imagem JPG, PNG, WEBP ou GIF.', true)
    if (file.size > 8 * 1024 * 1024) return notify('A imagem deve ter no máximo 8 MB.', true)
    setCover(file)
  }

  async function uploadCover() {
    if (!cover) return null
    const ext = (cover.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${businessId}/events/${crypto.randomUUID()}.${ext}`
    const upload = await db.storage.from(MEDIA_BUCKET).upload(path, cover, { cacheControl: '31536000', contentType: cover.type, upsert: false })
    if (upload.error) throw upload.error
    return db.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
  }

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    const problem = validateEventDraft(form)
    if (problem) return notify(problem, true)
    setSaving(true)
    notify('')
    try {
      const imageUrl = await uploadCover()
      const { data: { user } } = await db.auth.getUser()
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_date: form.event_date,
        event_end_date: form.event_end_date || form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location.trim() || null,
        address: form.address.trim() || null,
        category: form.category.trim() || null,
        price: form.price === '' ? null : Number(form.price),
        external_url: form.external_url.trim() || null,
        active: false,
        featured: false,
        review_status: 'pending',
        updated_at: new Date().toISOString(),
        ...(imageUrl ? { image_url: imageUrl } : {}),
      }
      const result = editing === 'new'
        ? await db.from('events').insert({ ...payload, city_id: cityId, business_id: businessId, submitted_by: user?.id || null, slug: `${slugify(form.title)}-${crypto.randomUUID().slice(0, 6)}` })
        : await db.from('events').update(payload).eq('id', editing.id)
      if (result.error) throw result.error
      setEditing(null)
      setForm(EMPTY)
      setCover(null)
      notify('Evento enviado para análise. Ele aparece na agenda depois da aprovação da VitrineLocal.')
      load()
    } catch (error) {
      notify(error.code === '42501' ? EVENT_PLAN_NOTICE : error.message || 'Não foi possível enviar o evento.', true)
    } finally {
      setSaving(false)
    }
  }

  async function remove(event) {
    if (!window.confirm(`Excluir o evento “${event.title}”?`)) return
    const { error } = await db.from('events').delete().eq('id', event.id)
    if (error) return notify(error.message, true)
    notify('Evento excluído.')
    load()
  }

  if (loading) return <div className="job-section"><div className="job-skeleton">Carregando eventos…</div></div>

  return (
    <div className="job-section">
      {message.text && <div className={`job-alert ${message.error ? 'error' : 'success'}`}>{message.text}</div>}
      <section className="account-card job-card">
        <div className="job-card-head">
          <div>
            <span className="account-eyebrow">AGENDA DA CIDADE</span>
            <h2>Eventos da {businessName || 'sua empresa'}</h2>
            <p>Envie eventos para a agenda da cidade. Cada evento passa por uma análise rápida da VitrineLocal antes de ser publicado.</p>
          </div>
          {allowed && !editing && <button type="button" className="job-btn primary" onClick={startNew}>＋ Novo evento</button>}
        </div>

        {allowed === false && (
          <div className="job-upgrade">
            <strong>Recurso dos planos Pro e Premium</strong>
            <p>{EVENT_PLAN_NOTICE}</p>
            <a className="job-btn primary" href={`/planos?business_id=${encodeURIComponent(businessId)}`}>Ver planos</a>
          </div>
        )}

        {allowed && editing && (
          <form className="job-form" onSubmit={submit}>
            <div className="job-form-grid">
              <label className="job-form-full"><span>Nome do evento</span><input required maxLength={140} value={form.title} onChange={update('title')} placeholder="Ex.: Noite do samba" /></label>
              <label><span>Data de início</span><input type="date" required value={form.event_date} onChange={update('event_date')} /></label>
              <label><span>Data de fim</span><input type="date" min={form.event_date || undefined} value={form.event_end_date} onChange={update('event_end_date')} /><small>Deixe em branco se for um dia só.</small></label>
              <label><span>Horário de início</span><input type="time" value={form.start_time} onChange={update('start_time')} /></label>
              <label><span>Horário de término</span><input type="time" value={form.end_time} onChange={update('end_time')} /></label>
              <label><span>Local</span><input value={form.location} onChange={update('location')} placeholder="Nome do local" /></label>
              <label><span>Endereço</span><input value={form.address} onChange={update('address')} placeholder="Rua, número, bairro" /></label>
              <label><span>Categoria</span><input value={form.category} onChange={update('category')} placeholder="Música, gastronomia…" /></label>
              <label><span>Preço</span><input type="number" min="0" step="0.01" value={form.price} onChange={update('price')} placeholder="Em branco = gratuito" /></label>
              <label className="job-form-full"><span>Link de ingressos ou informações</span><input type="url" value={form.external_url} onChange={update('external_url')} placeholder="https://" /></label>
              <label className="job-form-full"><span>Descrição</span><textarea rows={4} maxLength={2000} value={form.description} onChange={update('description')} placeholder="Atrações, programação e informações importantes." /></label>
              <label className="job-form-full"><span>Imagem de capa</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => chooseCover(event.target.files?.[0])} /><small>{cover ? cover.name : editing !== 'new' && editing.image_url ? 'Mantém a capa atual se nenhuma for escolhida.' : 'JPG, PNG, WEBP ou GIF · até 8 MB.'}</small></label>
            </div>
            <p className="job-form-note">O evento fica "Em análise" até a aprovação. Depois de aprovado, ele aparece na agenda da cidade e no perfil da empresa.</p>
            <div className="job-form-actions">
              <button type="button" className="job-btn secondary" onClick={() => { setEditing(null); setForm(EMPTY) }} disabled={saving}>Cancelar</button>
              <button type="submit" className="job-btn primary" disabled={saving}>{saving ? 'Enviando…' : 'Enviar para análise'}</button>
            </div>
          </form>
        )}

        {items.length === 0 && <p className="job-empty">Nenhum evento enviado ainda.</p>}
        {items.length > 0 && (
          <div className="job-list">
            {items.map(event => {
              const [label, tone] = ownerEventStatus(event)
              const editable = event.review_status === 'pending' || event.review_status === 'rejected'
              return (
                <article className="job-row" key={event.id}>
                  <div className="job-row-main">
                    <strong>{event.title}</strong>
                    <span>{eventWhenLabel(event)}{event.location ? ` · ${event.location}` : ''}</span>
                  </div>
                  <span className={`job-status ${tone}`}>{label}</span>
                  <div className="job-row-actions">
                    {editable && allowed && <button type="button" className="job-btn secondary" onClick={() => startEdit(event)}>Editar</button>}
                    <button type="button" className="job-btn secondary" onClick={() => remove(event)}>Excluir</button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
