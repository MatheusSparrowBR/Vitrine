import { useMemo, useState } from 'react'
import { accentWarning, isValidPageSlug, normalizeEventTheme, pageSlug, THEME_LIMITS, themeStyle, youtubeEmbedUrl } from './event-theme.js'
import EventThemeSections, { EventCountdown } from './EventThemeSections.jsx'
import './event-profile.css'
import './event-theme.css'
import './admin-event-page-editor.css'

const BUCKET = 'events-media'
const clone = value => JSON.parse(JSON.stringify(value))

function Field({ label, hint, children }) {
  return <label className="epe-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

// Lista editável (ingressos, programação, patrocinadores, perguntas).
function RepeatList({ title, items, onChange, fields, max, addLabel, renderImage }) {
  const update = (index, key, value) => onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  const move = (index, delta) => {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  return (
    <div className="epe-repeat">
      <div className="epe-repeat-head"><strong>{title}</strong><small>{items.length}/{max}</small></div>
      {items.map((item, index) => (
        <div className="epe-repeat-item" key={index}>
          {fields.map(field => field.type === 'image'
            ? <div key={field.key} className="epe-repeat-image">{renderImage(item[field.key], url => update(index, field.key, url), field.label)}</div>
            : field.type === 'textarea'
              ? <Field key={field.key} label={field.label}><textarea rows={3} value={item[field.key] || ''} onChange={e => update(index, field.key, e.target.value)} /></Field>
              : <Field key={field.key} label={field.label}><input value={item[field.key] || ''} placeholder={field.placeholder} onChange={e => update(index, field.key, e.target.value)} /></Field>)}
          <div className="epe-repeat-actions">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover para cima">↑</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Mover para baixo">↓</button>
            <button type="button" className="danger" onClick={() => onChange(items.filter((_, i) => i !== index))}>Remover</button>
          </div>
        </div>
      ))}
      {items.length < max && <button type="button" className="epe-add" onClick={() => onChange([...items, Object.fromEntries(fields.map(f => [f.key, '']))])}>＋ {addLabel}</button>}
    </div>
  )
}

// Editor da página personalizada do evento. Só o admin chega aqui; o banco também protege o tema.
export default function AdminEventPageEditor({ supabase, event, citySlug = 'laguna', onClose, onSaved }) {
  const initial = useMemo(() => {
    const theme = normalizeEventTheme(event.page_theme)
    if (!event.page_theme) theme.enabled = true
    return theme
  }, [event])
  const [draft, setDraft] = useState(() => clone(initial))
  const [slug, setSlug] = useState(event.page_slug || '')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState({ text: '', error: false })

  const preview = normalizeEventTheme(draft)
  const set = (key, value) => setDraft(current => ({ ...current, [key]: value }))
  const setBg = (key, value) => setDraft(current => ({ ...current, background: { ...current.background, [key]: value } }))
  const setLink = (key, value) => setDraft(current => ({ ...current, links: { ...current.links, [key]: value } }))
  const notify = (text, error = false) => setMessage({ text, error })
  const warning = accentWarning(preview)
  const videoInvalid = draft.videoUrl && !youtubeEmbedUrl(draft.videoUrl)
  const slugInvalid = slug && !isValidPageSlug(slug)
  const publicUrl = `https://vitrinelocal.net/${citySlug}/evento/${slug || event.id}`

  async function upload(file) {
    if (!file) return ''
    if (!String(file.type).startsWith('image/')) throw new Error('Selecione uma imagem (JPG, PNG, WEBP ou GIF).')
    if (file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 10 MB.')
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${event.id}/theme/${crypto.randomUUID()}.${ext}`
    const result = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
    if (result.error) throw result.error
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  // Campo de imagem: miniatura, enviar e remover.
  function imagePicker(value, onChange, label) {
    const id = `${label}-${Math.random().toString(36).slice(2)}`
    return (
      <div className="epe-image">
        <span className="epe-image-label">{label}</span>
        {value ? <img src={value} alt="" /> : <div className="epe-image-empty">Sem imagem</div>}
        <div className="epe-image-actions">
          <label htmlFor={id} className="epe-btn">{value ? 'Trocar' : 'Enviar imagem'}</label>
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={async e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setBusy('upload')
            try { onChange(await upload(file)); notify('') } catch (error) { notify(error.message || 'Não foi possível enviar a imagem.', true) } finally { setBusy('') }
          }} />
          {value && <button type="button" className="epe-btn ghost" onClick={() => onChange('')}>Remover</button>}
        </div>
      </div>
    )
  }

  async function save(reset = false) {
    if (!reset && (slugInvalid || videoInvalid)) return notify('Corrija os campos marcados antes de salvar.', true)
    setBusy('save')
    notify('')
    const payload = reset
      ? { page_theme: null, page_slug: null, updated_at: new Date().toISOString() }
      : { page_theme: normalizeEventTheme(draft), page_slug: slug || null, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('events').update(payload).eq('id', event.id)
    setBusy('')
    if (error) return notify(error.code === '23505' ? 'Esse endereço já está em uso por outro evento desta cidade.' : error.message, true)
    notify(reset ? 'Página voltou ao padrão.' : 'Página personalizada salva.')
    onSaved?.()
    if (reset) onClose?.()
  }

  return (
    <div className="epe-backdrop" role="dialog" aria-modal="true" aria-label={`Personalizar página: ${event.title}`}>
      <div className="epe-shell">
        <header className="epe-head">
          <div><span>PÁGINA PERSONALIZADA</span><h2>{event.title}</h2></div>
          <div className="epe-head-actions">
            <a className="epe-btn ghost" href={publicUrl.replace('https://vitrinelocal.net', '')} target="_blank" rel="noreferrer">Abrir página</a>
            <button type="button" className="epe-btn ghost" onClick={onClose}>Fechar</button>
          </div>
        </header>
        {message.text && <div className={`epe-message ${message.error ? 'error' : ''}`}>{message.text}</div>}

        <div className="epe-layout">
          <form className="epe-form" onSubmit={e => { e.preventDefault(); save() }}>
            <section className="epe-card">
              <label className="epe-check"><input type="checkbox" checked={draft.enabled} onChange={e => set('enabled', e.target.checked)} /> Página personalizada ativa</label>
              <label className="epe-check"><input type="checkbox" checked={draft.partnerBadge} onChange={e => set('partnerBadge', e.target.checked)} /> Mostrar selo "Evento parceiro VitrineLocal"</label>
              <label className="epe-check"><input type="checkbox" checked={draft.countdown} onChange={e => set('countdown', e.target.checked)} /> Mostrar contagem regressiva</label>
            </section>

            <section className="epe-card">
              <h3>Fundo e cores</h3>
              <Field label="Tipo de fundo">
                <select value={draft.background.type} onChange={e => setBg('type', e.target.value)}>
                  <option value="color">Cor sólida</option>
                  <option value="gradient">Degradê</option>
                  <option value="image">Foto</option>
                </select>
              </Field>
              {draft.background.type !== 'image' && <Field label="Cor principal do fundo"><input type="color" value={preview.background.color} onChange={e => setBg('color', e.target.value)} /></Field>}
              {draft.background.type === 'gradient' && <Field label="Segunda cor do degradê"><input type="color" value={preview.background.color2} onChange={e => setBg('color2', e.target.value)} /></Field>}
              {draft.background.type === 'image' && (
                <>
                  {imagePicker(draft.background.imageUrl, url => setBg('imageUrl', url), 'Foto de fundo (ex.: foto do artista)')}
                  <Field label={`Escurecer a foto: ${Math.round(preview.background.overlay * 100)}%`} hint="Escurecer ajuda o texto a ficar legível sobre a foto.">
                    <input type="range" min="0" max="0.85" step="0.05" value={preview.background.overlay} onChange={e => setBg('overlay', Number(e.target.value))} />
                  </Field>
                </>
              )}
              <Field label="Cor de destaque (botões e títulos)"><input type="color" value={preview.accent} onChange={e => set('accent', e.target.value)} /></Field>
              {warning && <p className="epe-warning">{warning}</p>}
            </section>

            <section className="epe-card">
              <h3>Capa e vídeo</h3>
              {imagePicker(draft.bannerUrl, url => set('bannerUrl', url), 'Capa larga (proporção 21:9, ex.: 2100×900)')}
              <Field label="Vídeo do YouTube" hint={videoInvalid ? 'Link inválido: use um link de vídeo do YouTube.' : 'Cole o link do vídeo (youtube.com ou youtu.be).'}>
                <input className={videoInvalid ? 'is-invalid' : ''} value={draft.videoUrl} placeholder="https://www.youtube.com/watch?v=..." onChange={e => set('videoUrl', e.target.value)} />
              </Field>
            </section>

            <section className="epe-card">
              <h3>Conteúdo do evento</h3>
              <RepeatList title="Ingressos (lotes e setores)" items={draft.tickets} onChange={v => set('tickets', v)} max={THEME_LIMITS.tickets} addLabel="Adicionar lote"
                fields={[{ key: 'name', label: 'Nome', placeholder: '1º lote, Pista, Camarote…' }, { key: 'price', label: 'Preço', placeholder: 'R$ 60,00' }, { key: 'note', label: 'Observação', placeholder: 'Meia-entrada disponível' }]} />
              <RepeatList title="Programação (line-up)" items={draft.lineup} onChange={v => set('lineup', v)} max={THEME_LIMITS.lineup} addLabel="Adicionar atração" renderImage={imagePicker}
                fields={[{ key: 'time', label: 'Horário', placeholder: '22:00' }, { key: 'name', label: 'Atração' }, { key: 'photoUrl', label: 'Foto', type: 'image' }, { key: 'description', label: 'Descrição', type: 'textarea' }]} />
              <RepeatList title="Perguntas frequentes" items={draft.faq} onChange={v => set('faq', v)} max={THEME_LIMITS.faq} addLabel="Adicionar pergunta"
                fields={[{ key: 'q', label: 'Pergunta', placeholder: 'Tem estacionamento?' }, { key: 'a', label: 'Resposta', type: 'textarea' }]} />
              <div className="epe-repeat">
                <div className="epe-repeat-head"><strong>Galeria de fotos</strong><small>{draft.gallery.length}/{THEME_LIMITS.gallery}</small></div>
                <div className="epe-gallery">
                  {draft.gallery.map((url, i) => (
                    <div key={i} className="epe-gallery-item"><img src={url} alt="" /><button type="button" onClick={() => set('gallery', draft.gallery.filter((_, j) => j !== i))}>Remover</button></div>
                  ))}
                </div>
                {draft.gallery.length < THEME_LIMITS.gallery && (
                  <label className="epe-add">＋ Adicionar fotos<input type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={async e => {
                    const files = [...(e.target.files || [])].slice(0, THEME_LIMITS.gallery - draft.gallery.length)
                    e.target.value = ''
                    setBusy('upload')
                    try {
                      const urls = []
                      for (const file of files) urls.push(await upload(file))
                      setDraft(current => ({ ...current, gallery: [...current.gallery, ...urls] }))
                      notify('')
                    } catch (error) { notify(error.message || 'Não foi possível enviar as fotos.', true) } finally { setBusy('') }
                  }} /></label>
                )}
              </div>
            </section>

            <section className="epe-card">
              <h3>Patrocinadores e redes</h3>
              <RepeatList title="Patrocinadores e apoio" items={draft.sponsors} onChange={v => set('sponsors', v)} max={THEME_LIMITS.sponsors} addLabel="Adicionar patrocinador" renderImage={imagePicker}
                fields={[{ key: 'name', label: 'Nome' }, { key: 'logoUrl', label: 'Logo', type: 'image' }, { key: 'url', label: 'Site (opcional)', placeholder: 'https://' }]} />
              <Field label="Instagram do evento"><input value={draft.links.instagram} placeholder="https://instagram.com/..." onChange={e => setLink('instagram', e.target.value)} /></Field>
              <Field label="Playlist no Spotify"><input value={draft.links.spotify} placeholder="https://open.spotify.com/..." onChange={e => setLink('spotify', e.target.value)} /></Field>
              <Field label="Site oficial"><input value={draft.links.website} placeholder="https://" onChange={e => setLink('website', e.target.value)} /></Field>
            </section>

            <section className="epe-card">
              <h3>Endereço próprio</h3>
              <Field label="Final do endereço" hint={slugInvalid ? 'Use letras minúsculas, números e hífens (3 a 60 caracteres).' : publicUrl}>
                <input className={slugInvalid ? 'is-invalid' : ''} value={slug} placeholder="carnaval-2027" onChange={e => setSlug(pageSlug(e.target.value))} />
              </Field>
              <button type="button" className="epe-btn ghost" onClick={() => navigator.clipboard?.writeText(publicUrl).then(() => notify('Endereço copiado.'))}>Copiar endereço</button>
            </section>

            <div className="epe-footer">
              <button type="button" className="epe-btn ghost danger" onClick={() => { if (window.confirm('Voltar esta página para o visual padrão? A personalização será apagada.')) save(true) }} disabled={Boolean(busy)}>Voltar ao padrão</button>
              <button type="submit" className="epe-btn primary" disabled={Boolean(busy)}>{busy === 'save' ? 'Salvando…' : busy === 'upload' ? 'Enviando imagem…' : 'Salvar página'}</button>
            </div>
          </form>

          <aside className="epe-preview-wrap" aria-label="Pré-visualização">
            <span className="epe-preview-label">PRÉ-VISUALIZAÇÃO{!draft.enabled && ' · personalização desativada'}</span>
            <div className={`vl-event-profile-page epe-preview${draft.enabled ? ' is-themed' : ''}`} style={draft.enabled ? themeStyle(preview) : undefined}>
              <div className="vl-event-profile-container">
                {draft.enabled && preview.bannerUrl
                  ? <div className="ev-banner"><img src={preview.bannerUrl} alt="" /></div>
                  : event.image_url && <div className="vl-event-profile-hero"><img src={event.image_url} alt="" /></div>}
                <div className="vl-event-profile-title">
                  {draft.enabled && preview.partnerBadge && <span className="ev-partner-badge">★ Evento parceiro VitrineLocal</span>}
                  <span className="vl-event-profile-kicker">Evento</span>
                  <h1>{event.title}</h1>
                  {draft.enabled && preview.countdown && <EventCountdown event={event} />}
                </div>
                <div className="vl-event-profile-actions"><a className="vl-event-profile-primary" href="#preview" onClick={e => e.preventDefault()}>Mais informações / ingressos →</a></div>
                {draft.enabled && <EventThemeSections theme={preview} eventTitle={event.title} />}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
