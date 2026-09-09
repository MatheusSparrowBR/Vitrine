(() => {
  const DIRECTORY_PATH = '/rest/v1/public_business_directory'
  const BUSINESS_PATH = '/rest/v1/businesses'
  const MAX_DIAGNOSTICS = 4
  const diagnostics = []

  function showDiagnostics() {
    let panel = document.getElementById('vl-runtime-diagnostics')
    if (!panel) {
      panel = document.createElement('div')
      panel.id = 'vl-runtime-diagnostics'
      panel.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:20000;display:none;font-family:DM Sans,system-ui,sans-serif;'
      document.body.appendChild(panel)
    }
    if (!diagnostics.length) {
      panel.style.display = 'none'
      return
    }
    panel.style.display = 'block'
    panel.innerHTML = `
      <div style="max-width:980px;margin:0 auto;background:#fff7f7;border:1px solid #efb5b5;border-radius:14px;box-shadow:0 14px 40px rgba(12,25,42,.18);padding:13px 15px;color:#552020">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:7px">
          <strong style="font-size:13px">Diagnóstico de conexão</strong>
          <button id="vl-runtime-close" type="button" style="border:0;background:transparent;color:#7c4a4a;font-size:18px;cursor:pointer">×</button>
        </div>
        ${diagnostics.map(item => `
          <div style="padding:8px 0;border-top:1px solid #f2d1d1;font-size:11px;line-height:1.45">
            <strong>${escapeHtml(item.status ? `${item.status} ` : '')}${escapeHtml(item.operation)}</strong>
            <div style="color:#6d4b4b">${escapeHtml(item.message)}</div>
          </div>`).join('')}
      </div>`
    panel.querySelector('#vl-runtime-close')?.addEventListener('click', () => {
      diagnostics.length = 0
      showDiagnostics()
    })
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' })[char])
  }

  function addDiagnostic(operation, status, message) {
    diagnostics.unshift({ operation, status, message: String(message || 'Falha sem mensagem.') })
    if (diagnostics.length > MAX_DIAGNOSTICS) diagnostics.length = MAX_DIAGNOSTICS
    console.error('[VitrineLocal]', operation, status, message)
    showDiagnostics()
  }

  function isPublicBusinessRead(url, method) {
    if ((method || 'GET').toUpperCase() !== 'GET') return false
    if (!url.pathname.endsWith(BUSINESS_PATH)) return false
    const hasCityFilter = url.searchParams.has('city_id')
    const hasSlugFilter = url.searchParams.has('slug')
    const hasOwnerFilter = url.searchParams.has('owner_id')
    const hasAdminProfileJoin = (url.searchParams.get('select') || '').includes('profiles:owner_id')
    return (hasCityFilter || hasSlugFilter) && !hasOwnerFilter && !hasAdminProfileJoin
  }

  function rewriteDirectoryRequest(input, init) {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (!isPublicBusinessRead(url, request.method)) return null

    url.pathname = DIRECTORY_PATH
    url.searchParams.delete('status')
    url.searchParams.set('select', [
      'id','city_id','category_id','name','slug','short_description','description',
      'logo_url','cover_url','phone','whatsapp','website_url','instagram_url','facebook_url',
      'address','neighborhood','latitude','longitude','opening_hours','verified','featured',
      'created_at','updated_at','city_name','city_state','category_name','category_slug'
    ].join(','))

    return new Request(url.toString(), request)
  }

  async function normalizeDirectoryResponse(response) {
    const data = await response.clone().json()
    if (!Array.isArray(data)) return response
    const normalized = data.map((row) => ({
      ...row,
      status: 'active',
      categories: row.category_name ? { name: row.category_name, slug: row.category_slug } : null,
      cities: row.city_name ? { name: row.city_name, state: row.city_state } : null,
    }))
    return new Response(JSON.stringify(normalized), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const originalRequest = new Request(input, init)
    let request = originalRequest
    let rewritten = false
    try {
      const nextRequest = rewriteDirectoryRequest(input, init)
      if (nextRequest) {
        request = nextRequest
        rewritten = true
      }
    } catch (error) {
      addDiagnostic('Preparação do diretório público', 'CLIENT', error?.message || error)
    }

    try {
      const response = await originalFetch(request)
      if (!response.ok) {
        let message = `HTTP ${response.status}`
        try {
          const payload = await response.clone().json()
          message = payload?.message || payload?.hint || payload?.details || message
        } catch {
          try {
            const text = await response.clone().text()
            if (text) message = text.slice(0, 320)
          } catch {}
        }
        addDiagnostic(rewritten ? 'Diretório público' : request.url.split('/rest/v1/')[1] || 'Supabase', response.status, message)
      }
      if (rewritten && response.ok) return normalizeDirectoryResponse(response)
      return response
    } catch (error) {
      addDiagnostic(rewritten ? 'Diretório público' : 'Supabase', 'NETWORK', error?.message || error)
      throw error
    }
  }

  window.__VITRINE_RUNTIME__ = {
    getDiagnostics: () => [...diagnostics],
    clearDiagnostics: () => { diagnostics.length = 0; showDiagnostics() },
  }
})()
