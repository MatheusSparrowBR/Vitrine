(() => {
  const SLOT_ID = 'vl-premium-banner-slot'
  const HERO_SELECTOR = '.hero'

  function enforceHomeOnly() {
    const hero = document.querySelector(HERO_SELECTOR)
    const slot = document.getElementById(SLOT_ID)

    if (!hero && slot) slot.remove()
  }

  const observer = new MutationObserver(enforceHomeOnly)
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  enforceHomeOnly()
})()
