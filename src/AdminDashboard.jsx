import React, { useEffect, useMemo, useState } from 'react'

const COMMUNITY_PRIVATE_BUCKET = 'community-submissions'
const COMMUNITY_PUBLIC_BUCKET = 'community-published'

export default function AdminDashboard({ supabase, session, onBack, onToast }) {
  const [tab, setTab] = useState('overview')
  const [businesses, setBusinesses] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [posts, setPosts] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [search, setSearch] = useState('')

  async function hydrateCommunityMedia(items) {
    return Promise.all((items || []).map(async (item) => {
      const next = { ...item }
      if (item.image_path) {
        const { data } = await supabase.storage.from(COMMUNITY_PRIVATE_BUCKET).createSignedUrl(item.image_path, 3600)
        next.preview_image_url = data?.signedUrl || null
      } else next.preview_image_url = item.image_url || null
      if (item.video_path) {
        const { data } = await supabase.storage.from(COMMUNITY_PRIVATE_BUCKET).createSignedUrl(item.video_path, 3600)
        next.preview_video_url = data?.signedUrl || null
      } else next.preview_video_url = item.video_url || null
      return next
    }))
  }

  const load = async () => {
    setLoading(true)
    const [businessRes, submissionRes, postRes, cityRes] = await Promise.all([
      supabase.from('businesses').select('id,name,slug,status,verified,featured,created_at,neighborhood,categories(name),cities(name,state),profiles:owner_id(full_name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('community_submissions').select('id,city_id,title,description,image_url,video_url,image_path,video_path,status,created_at,cities(name,state),profiles:user_id(full_name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('posts').select('id,title,type,status,content,created_at,published_at,cities(name,state),businesses(name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('cities').select('id,name,state,slug,active,created_at').order('name'),
    ])
    if (businessRes.error) onToast?.(businessRes.error.message, true)
    if (submissionRes.error) onToast?.(submissionRes.error.message, true)
    setBusinesses(businessRes.data || [])
    setSubmissions(await hydrateCommunityMedia(submissionRes.data || []))
    setPosts(postRes.data || [])
    setCities(cityRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pendingBusinesses = businesses.filter((x) => x.status === 'pending')
  const activeBusinesses = businesses.filter((x) => x.status === 'active')
  const pendingSubmissions = submissions.filter((x) => x.status === 'pending')
  const publishedPosts = posts.filter((x) => x.status === 'published')

  const filteredBusinesses = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return businesses
    return businesses.filter((b) => [b.name, b.neighborhood, b.categories?.name, b.cities?.name, b.profiles?.full_name].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [businesses, search])

  async function updateBusiness(id, patch, success) {
    setBusyId(id)
    const { error } = await supabase.from('businesses').update(patch).eq('id', id)
    setBusyId('')
    if (error) onToast?.(error.message, true)
    else { onToast?.(success); load() }
  }

  async function promoteCommunityMedia(item) {
    const published = { imageUrl: item.image_url || null, videoUrl: item.video_url || null, imagePath: null, videoPath: null, createdPaths: [] }
    const transfers = []
    if (item.image_path) transfers.push({ kind: 'image', path: item.image_path })
    if (item.video_path) transfers.push({ kind: 'video', path: item.video_path })
    try {
      for (const transfer of transfers) {
        const { data: blob, error: downloadError } = await supabase.storage.from(COMMUNITY_PRIVATE_BUCKET).download(transfer.path)
        if (downloadError) throw downloadError
        const extension = transfer.path.split('.').pop() || 'bin'
        const publicPath = `${item.city_id}/${item.id}/${transfer.kind}.${extension}`
        const { error: uploadError } = await supabase.storage.from(COMMUNITY_PUBLIC_BUCKET).upload(publicPath, blob, { cacheControl: '31536000', contentType: blob.type || undefined, upsert: true })
        if (uploadError) throw uploadError
        published.createdPaths.push(publicPath)
        const { data } = supabase.storage.from(COMMUNITY_PUBLIC_BUCKET).getPublicUrl(publicPath)
        if (transfer.kind === 'image') { published.imagePath = publicPath; published.imageUrl = data.publicUrl }
        if (transfer.kind === 'video') { published.videoPath = publicPath; published.videoUrl = data.publicUrl }
      }
      return published
    } catch (error) {
      if (published.createdPaths.length) await supabase.storage.from(COMMUNITY_PUBLIC_BUCKET).remove(published.createdPaths).catch(() => {})
      throw error
    }
  }

  async function removePrivateCommunityMedia(item) {
    const paths = [item.image_path, item.video_path].filter(Boolean)
    if (paths.length) await supabase.storage.from(COMMUNITY_PRIVATE_BUCKET).remove(paths).catch(() => {})
  }

  async function moderateSubmission(item, approve) {
    setBusyId(item.id)
    try {
      if (approve) {
        const media = await promoteCommunityMedia(item)
        const { data: row, error: postError } = await supabase.from('posts').insert({
          author_id: session.user.id,
          city_id: item.city_id,
          type: 'community',
          title: item.title || 'Novo conteúdo da comunidade',
          content: item.description || '',
          image_url: media.imageUrl,
          video_url: media.videoUrl,
          image_path: media.imagePath,
          video_path: media.videoPath,
          status: 'published',
          published_at: new Date().toISOString(),
        }).select('id').single()
        if (postError) throw postError
        const { error } = await supabase.from('community_submissions').update({ status: 'approved', reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', item.id)
        if (error) throw error
        await removePrivateCommunityMedia(item)
        onToast?.(`Conteúdo aprovado e publicado (${row?.id?.slice(0, 6) || 'post'}).`)
      } else {
        const { error } = await supabase.from('community_submissions').update({ status: 'rejected', reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', item.id)
        if (error) throw error
        await removePrivateCommunityMedia(item)
        onToast?.('Conteúdo rejeitado e mídia removida do armazenamento privado.')
      }
    } catch (error) {
      onToast?.(error?.message || 'Não foi possível moderar este conteúdo.', true)
    } finally {
      setBusyId('')
      load()
    }
  }

  async function publishPost(id, publish) {
    setBusyId(id)
    const patch = publish ? { status: 'published', published_at: new Date().toISOString() } : { status: 'archived' }
    const { error } = await supabase.from('posts').update(patch).eq('id', id)
    setBusyId('')
    if (error) onToast?.(error.message, true); else { onToast?.(publish ? 'Post publicado.' : 'Post arquivado.'); load() }
  }

  async function toggleCity(city) {
    setBusyId(city.id)
    const { error } = await supabase.from('cities').update({ active: !city.active }).eq('id', city.id)
    setBusyId('')
    if (error) onToast?.(error.message, true); else { onToast?.(`${city.name} ${city.active ? 'desativada' : 'ativada'}.`); load() }
  }

  const nav = [['overview', 'Visão geral', '▦'],['businesses', 'Empresas', '▣'],['community', 'Comunidade', '◉'],['posts', 'Publicações', '✦'],['cities', 'Cidades', '⌖']]

  return <section className="admin-shell"><div className="container admin-layout">
    <aside className="admin-sidebar"><div className="admin-brand"><span className="brand-mark">V</span><div><strong>VitrineLocal</strong><small>Administração</small></div></div><div className="admin-nav">{nav.map(([key,label,icon])=><button className={tab===key?'admin-nav-item active':'admin-nav-item'} key={key} onClick={()=>setTab(key)}><span>{icon}</span>{label}{key==='businesses'&&pendingBusinesses.length>0&&<b>{pendingBusinesses.length}</b>}{key==='community'&&pendingSubmissions.length>0&&<b>{pendingSubmissions.length}</b>}</button>)}</div><button className="admin-back" onClick={onBack}>← Voltar ao site</button></aside>
    <main className="admin-main"><div className="admin-head"><div><span className="section-kicker">Painel administrativo</span><h1>{nav.find(x=>x[0]===tab)?.[1]}</h1><p>Controle o conteúdo e o crescimento da VitrineLocal.</p></div><div className="admin-user"><span>{session.user.email}</span><strong>ADMIN</strong></div></div>
      {loading?<div className="admin-loading">Carregando dados do painel…</div>:<>
        {tab==='overview'&&<><div className="admin-stat-grid"><Stat label="Empresas" value={businesses.length} hint={`${pendingBusinesses.length} aguardando aprovação`}/><Stat label="Empresas ativas" value={activeBusinesses.length} hint="Visíveis no catálogo"/><Stat label="Conteúdo pendente" value={pendingSubmissions.length} hint="Envios da comunidade"/><Stat label="Posts publicados" value={publishedPosts.length} hint="Feed local"/></div><div className="admin-two-col"><AdminPanel title="Fila de aprovação" action={()=>setTab('businesses')} actionLabel="Ver empresas">{pendingBusinesses.slice(0,5).map(b=><ApprovalRow key={b.id} title={b.name} meta={`${b.categories?.name||'Sem categoria'} · ${b.cities?.name||'Sem cidade'}`} onApprove={()=>updateBusiness(b.id,{status:'active',verified:true},'Empresa aprovada.')} onReject={()=>updateBusiness(b.id,{status:'rejected'},'Empresa rejeitada.')} busy={busyId===b.id}/>)}{!pendingBusinesses.length&&<AdminEmpty icon="✓" title="Tudo em dia" text="Nenhuma empresa aguardando aprovação."/>}</AdminPanel><AdminPanel title="Comunidade" action={()=>setTab('community')} actionLabel="Moderar">{pendingSubmissions.slice(0,5).map(s=><ApprovalRow key={s.id} title={s.title||'Sem título'} meta={`${s.cities?.name||'Sem cidade'} · ${s.profiles?.full_name||'Anônimo'}`}/>)}{!pendingSubmissions.length&&<AdminEmpty icon="◉" title="Nenhum envio pendente" text="Os próximos vídeos e imagens da comunidade aparecerão aqui."/>}</AdminPanel></div></>}
        {tab==='businesses'&&<><div className="admin-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, bairro ou cidade…"/><div className="admin-filters"><span>{pendingBusinesses.length} pendentes</span><span>{activeBusinesses.length} ativas</span></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Empresa</th><th>Cidade</th><th>Categoria</th><th>Status</th><th>Controles</th></tr></thead><tbody>{filteredBusinesses.map(b=><tr key={b.id}><td><strong>{b.name}</strong><small>{b.profiles?.full_name||'Sem responsável'}</small></td><td>{b.cities?.name||'—'} / {b.cities?.state||''}</td><td>{b.categories?.name||'—'}</td><td><Badge value={b.status}/></td><td><div className="table-actions">{b.status!=='active'&&<button disabled={busyId===b.id} onClick={()=>updateBusiness(b.id,{status:'active'},'Empresa ativada.')}>Aprovar</button>}{b.status==='active'&&<button disabled={busyId===b.id} onClick={()=>updateBusiness(b.id,{status:'suspended'},'Empresa suspensa.')}>Suspender</button>}<button disabled={busyId===b.id} onClick={()=>updateBusiness(b.id,{featured:!b.featured},b.featured?'Destaque removido.':'Empresa destacada.')}>{b.featured?'Tirar destaque':'Destacar'}</button>{!b.verified&&<button disabled={busyId===b.id} onClick={()=>updateBusiness(b.id,{verified:true},'Empresa verificada.')}>Verificar</button>}</div></td></tr>)}</tbody></table>{!filteredBusinesses.length&&<AdminEmpty icon="⌕" title="Nenhuma empresa encontrada" text="Tente outro termo de busca."/>}</div></>}
        {tab==='community'&&<div className="admin-card-list">{pendingSubmissions.map(s=><div className="moderation-card" key={s.id}><div className="moderation-media">{s.preview_image_url?<img src={s.preview_image_url} alt="Prévia do envio"/>:s.preview_video_url?<video src={s.preview_video_url} controls playsInline preload="metadata"/>:<div className="moderation-placeholder">◉</div>}</div><div className="moderation-copy"><Badge value="pending"/><h3>{s.title||'Envio da comunidade'}</h3><p>{s.description||'Sem descrição.'}</p><small>{s.profiles?.full_name||'Anônimo'} · {s.cities?.name||'Sem cidade'} · {new Date(s.created_at).toLocaleString('pt-BR')}</small><div className="table-actions"><button className="approve" disabled={busyId===s.id} onClick={()=>moderateSubmission(s,true)}>Aprovar e publicar</button><button disabled={busyId===s.id} onClick={()=>moderateSubmission(s,false)}>Rejeitar</button></div></div></div>)}{!pendingSubmissions.length&&<AdminEmpty icon="◉" title="Nenhum conteúdo pendente" text="A moderação da comunidade está em dia."/>}</div>}
        {tab==='posts'&&<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Publicação</th><th>Tipo</th><th>Status</th><th>Cidade</th><th>Ações</th></tr></thead><tbody>{posts.map(p=><tr key={p.id}><td><strong>{p.title}</strong><small>{p.businesses?.name||'VitrineLocal'}</small></td><td>{p.type}</td><td><Badge value={p.status}/></td><td>{p.cities?.name||'—'}</td><td><div className="table-actions">{p.status!=='published'&&<button disabled={busyId===p.id} onClick={()=>publishPost(p.id,true)}>Publicar</button>}{p.status==='published'&&<button disabled={busyId===p.id} onClick={()=>publishPost(p.id,false)}>Arquivar</button>}</div></td></tr>)}</tbody></table>{!posts.length&&<AdminEmpty icon="✦" title="Nenhuma publicação" text="Crie o primeiro conteúdo pelo painel editorial."/>}</div>}
        {tab==='cities'&&<div className="city-grid">{cities.map(city=><div className="city-card-admin" key={city.id}><div className="city-avatar">⌖</div><div><strong>{city.name}</strong><small>{city.state} · /{city.slug}</small></div><Badge value={city.active?'active':'suspended'}/><button onClick={()=>toggleCity(city)} disabled={busyId===city.id}>{city.active?'Desativar':'Ativar'}</button></div>)}<div className="city-add-card"><strong>Próxima cidade</strong><p>A arquitetura é multi-cidade. Quando estiver pronto, basta cadastrar outra cidade e seus conteúdos.</p></div></div>}
      </>}
    </main>
  </div></section>
}
function Stat({label,value,hint}){return <div className="admin-stat"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
function AdminPanel({title,action,actionLabel,children}){return <section className="admin-panel"><div className="admin-panel-head"><h2>{title}</h2><button onClick={action}>{actionLabel}</button></div>{children}</section>}
function ApprovalRow({title,meta,onApprove,onReject,busy}){return <div className="approval-row"><div><strong>{title}</strong><small>{meta}</small></div><div className="approval-actions">{onApprove&&<button disabled={busy} onClick={onApprove}>Aprovar</button>}{onReject&&<button className="danger" disabled={busy} onClick={onReject}>Rejeitar</button>}</div></div>}
function Badge({value}){const map={active:['Ativa','good'],pending:['Pendente','pending'],rejected:['Rejeitada','danger'],suspended:['Suspensa','muted'],published:['Publicada','good'],draft:['Rascunho','muted'],archived:['Arquivada','muted'],pending_review:['Em revisão','pending']};const [label,cls]=map[value]||[value,'muted'];return <span className={`admin-badge ${cls}`}>{label}</span>}
function AdminEmpty({icon,title,text}){return <div className="admin-empty"><div>{icon}</div><strong>{title}</strong><p>{text}</p></div>}
