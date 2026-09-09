(() => {
  const URL = import.meta.env?.VITE_SUPABASE_URL
  const KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
  const supabase = URL && KEY && window.supabase?.createClient ? window.supabase.createClient(URL, KEY) : null

  const fallbackPlans = [
    { code: 'free', name: 'Grátis', price_monthly: 0, features: { photos: 5, ai_posts: 3, business_profile: true, featured: false } },
    { code: 'pro', name: 'Pro', price_monthly: 29.90, features: { photos: 30, ai_posts: 30, business_profile: true, featured: true, analytics: true } },
    { code: 'premium', name: 'Premium', price_monthly: 59.90, features: { photos: 100, ai_posts: 100, business_profile: true, featured: true, city_instagram: true, advanced_analytics: true } },
  ]

  const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char]))

  const featureLabels = (plan) => {
    const f = plan.features || {}
    const labels = []
    if (f.business_profile) labels.push('Página completa da empresa')
    if (Number(f.photos) > 0) labels.push(`${f.photos} fotos e mídias na galeria`)
    if (Number(f.ai_posts) > 0) labels.push(`${f.ai_posts} conteúdos com IA por mês`)
    if (f.featured) labels.push('Destaque no catálogo')
    if (f.analytics) labels.push('Analytics da empresa')
    if (f.city_instagram) labels.push('Divulgação no Instagram da cidade')
    if (f.advanced_analytics) labels.push('Analytics avançado')
    return labels
  }

  function injectStyles() {
    if (document.getElementById('vl-plans-navigation-styles')) return
    const style = document.createElement('style')
    style.id = 'vl-plans-navigation-styles'
    style.textContent = `
      #vl-plans-overlay{position:fixed;inset:0;z-index:10030;background:#f7f9fc;overflow:auto;display:none}
      #vl-plans-overlay.open{display:block}
      .vl-plans-page{min-height:100vh;padding:100px 20px 70px}
      .vl-plans-top{width:min(1040px,100%);margin:0 auto 35px;display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
      .vl-plans-kicker{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px;color:#2474ff}
      .vl-plans-top h1{font:800 clamp(34px,5vw,54px)/1.03 Manrope;color:#122033;letter-spacing:-2px;margin:8px 0 12px}
      .vl-plans-top p{margin:0;max-width:680px;color:#6e7b8d;font-size:15px;line-height:1.65}
      .vl-plans-close{border:1px solid #d3dce8;background:#fff;color:#32445c;border-radius:10px;padding:10px 14px;font:700 13px 'DM Sans';cursor:pointer;white-space:nowrap}
      .vl-plans-grid{width:min(1040px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}
      .vl-plan-screen-card{position:relative;background:#fff;border:1px solid #e0e7ef;border-radius:22px;padding:27px;display:flex;flex-direction:column;box-shadow:0 12px 32px rgba(18,32,51,.06)}
      .vl-plan-screen-card.premium{border-color:#2474ff;box-shadow:0 22px 55px rgba(36,116,255,.14);transform:translateY(-6px)}
      .vl-plan-screen-badge{position:absolute;right:18px;top:18px;background:#2474ff;color:#fff;padding:6px 10px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.8px;text-transform:uppercase}
      .vl-plan-screen-card small{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.1px;color:#2474ff}
      .vl-plan-screen-card h2{font:800 27px Manrope;color:#122033;margin:9px 0 7px;letter-spacing:-1px}
      .vl-plan-screen-price{display:flex;align-items:flex-end;gap:5px;margin-bottom:8px}
      .vl-plan-screen-price strong{font:800 39px Manrope;color:#122033;letter-spacing:-1.5px}
      .vl-plan-screen-price span{font-size:12px;color:#7b8797;padding-bottom:7px}
      .vl-plan-screen-desc{font-size:12px;color:#6e7b8d;line-height:1.55;min-height:38px}
      .vl-plan-screen-list{list-style:none;margin:20px 0 24px;padding:0;display:grid;gap:10px}
      .vl-plan-screen-list li{font-size:12px;line-height:1.45;color:#42536a;padding-left:19px;position:relative}
      .vl-plan-screen-list li:before{content:'✓';position:absolute;left:0;top:0;color:#24895a;font-weight:800}
      .vl-plan-screen-cta{margin-top:auto;width:100%;border:1px solid #d1dbe7;background:#fff;color:#2c3e55;border-radius:11px;padding:12px 14px;font:700 13px 'DM Sans';cursor:pointer}
      .vl-plan-screen-card.premium .vl-plan-screen-cta,.vl-plan-screen-card.pro .vl-plan-screen-cta{background:#2474ff;color:#fff;border-color:#2474ff}
      .vl-plans-note{width:min(1040px,100%);margin:22px auto 0;padding:14px 16px;border-radius:12px;background:#eef5ff;color:#66758a;text-align:center;font-size:11px;line-height:1.5}
      .vl-plans-loading{width:min(1040px,100%);margin:0 auto;padding:35px;background:#fff;border:1px solid #e0e7ef;border-radius:18px;text-align:center;color:#738196}
      @media(max-width:860px){.vl-plans-grid{grid-template-columns:1fr}.vl-plan-screen-card.premium{transform:none}.vl-plans-top{flex-direction:column}.vl-plans-close{align-self:flex-start}}
      @media(max-width:620px){.vl-plans-page{padding:86px 12px 45px}.vl-plans-top h1{font-size:38px}.vl-plan-screen-card{padding:22px}}
    `
    document.head.appendChild(style)
  }

  function findCompanyButton() {
    return [...document.querySelectorAll('button')].find((button) => (button.textContent || '').trim() === 'Cadastrar empresa')
  }

  async function getPlans() {
    if (!supabase) return fallbackPlans
    const { data, error } = await supabase.from('plans').select('code,name,price_monthly,features').eq('active', true).order('price_monthly')
    return error || !data?.length ? fallbackPlans : data
  }

  function closePlans() {
    document.getElementById('vl-plans-overlay')?.classList.remove('open')
    document.body.style.overflow = ''
  }

  async function openPlans() {
    injectStyles()
    let overlay = document.getElementById('vl-plans-overlay')
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = 'vl-plans-overlay'
      overlay.innerHTML = `
        <div class="vl-plans-page">
          <div class="vl-plans-top">
            <div><span class="vl-plans-kicker">Planos VitrineLocal</span><h1>Escolha como sua empresa quer aparecer na cidade.</h1><p>Comece gratuitamente e evolua quando quiser mais destaque, conteúdo e alcance para seu negócio.</p></div>
            <button class="vl-plans-close" type="button">← Voltar</button>
          </div>
          <div id="vl-plans-content" class="vl-plans-loading">Carregando planos…</div>
        </div>`
      document.body.appendChild(overlay)
      overlay.querySelector('.vl-plans-close').addEventListener('click', closePlans)
    }
    overlay.classList.add('open')
    document.body.style.overflow = 'hidden'
    const content = overlay.querySelector('#vl-plans-content')
    const plans = await getPlans()
    content.className = 'vl-plans-grid'
    content.innerHTML = plans.map((plan) => {
      const code = String(plan.code || '').toLowerCase()
      const premium = code === 'premium'
      const pro = code === 'pro'
      const price = Number(plan.price_monthly) || 0
      const features = featureLabels(plan)
      return `<article class="vl-plan-screen-card ${premium ? 'premium' : pro ? 'pro' : ''}">
        ${premium ? '<span class="vl-plan-screen-badge">Mais completo</span>' : ''}
        <small>${premium ? 'Máxima exposição' : pro ? 'Mais escolhido' : 'Comece agora'}</small>
        <h2>${escapeHtml(plan.name)}</h2>
        <div class="vl-plan-screen-price"><strong>R$ ${price.toFixed(2).replace('.', ',')}</strong><span>/mês</span></div>
        <div class="vl-plan-screen-desc">${premium ? 'Para empresas que querem máxima presença e divulgação.' : pro ? 'Para negócios que querem crescer dentro da plataforma.' : 'Para colocar sua empresa no mapa sem custo mensal.'}</div>
        <ul class="vl-plan-screen-list">${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>
        <button class="vl-plan-screen-cta" type="button" data-plan-code="${escapeHtml(code)}">${code === 'free' ? 'Começar gratuitamente' : 'Tenho interesse'}</button>
      </article>`
    }).join('')

    content.querySelectorAll('[data-plan-code]').forEach((button) => button.addEventListener('click', () => {
      closePlans()
      const companyButton = findCompanyButton()
      if (companyButton) companyButton.click()
    }))
  }

  function addNavButton() {
    const nav = document.querySelector('.nav-actions')
    if (!nav || nav.querySelector('[data-vl-plans-link]')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'ghost-btn'
    button.dataset.vlPlansLink = 'true'
    button.textContent = 'Planos'
    button.addEventListener('click', openPlans)
    const companyButton = findCompanyButton()
    if (companyButton) nav.insertBefore(button, companyButton)
    else nav.appendChild(button)
  }

  function removePricingFromHome() {
    document.getElementById('vl-pricing-section')?.remove()
  }

  function boot() {
    if (window.__VITRINE_PLANS_NAV__) return
    window.__VITRINE_PLANS_NAV__ = true
    injectStyles()
    const observer = new MutationObserver(() => {
      addNavButton()
      removePricingFromHome()
    })
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
    addNavButton()
    removePricingFromHome()
  }

  boot()
})()
