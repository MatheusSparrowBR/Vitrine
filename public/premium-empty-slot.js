(() => {
  const PLACEHOLDER_SRC = '/premium-ad-placeholder-clean.svg?rev=20260916-1428'
  const TARGET_HREF = '/conta/publicidade'

  const render = (root = document) => {
    root.querySelectorAll?.('.empty-v2:not([data-vl-premium-placeholder])').forEach((slot) => {
      slot.dataset.vlPremiumPlaceholder = 'true'
      slot.classList.add('vl-premium-empty-slot')
      slot.setAttribute('aria-label', 'Espaço Premium disponível para publicidade')
      slot.innerHTML = `<a class="vl-premium-placeholder-link" href="${TARGET_HREF}" aria-label="Anuncie sua empresa na VitrineLocal"><img src="${PLACEHOLDER_SRC}" alt="Espaço Premium disponível na VitrineLocal" loading="eager" decoding="async"></a>`
    })
  }

  const boot = () => {
    render(document)
    const root = document.getElementById('root') || document.body
    new MutationObserver(() => render(root)).observe(root, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
