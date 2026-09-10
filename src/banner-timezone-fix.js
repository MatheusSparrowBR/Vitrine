(() => {
  if (typeof window === 'undefined' || !window.HTMLInputElement) return

  const proto = window.HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  if (!descriptor?.get || !descriptor?.set || window.__vlBannerTimeFixInstalled) return
  window.__vlBannerTimeFixInstalled = true

  const originalGet = descriptor.get
  const originalSet = descriptor.set
  const normalized = new WeakMap()

  const isBannerDateTimeInput = input => input?.type === 'datetime-local' && Boolean(
    input.closest('.vl-admin-tools-modal') || input.closest('.apb-screen')
  )

  const pad = n => String(n).padStart(2, '0')
  const utcInputToLocal = value => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
    const date = new Date(`${value}:00Z`)
    if (Number.isNaN(date.getTime())) return null
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  Object.defineProperty(proto, 'value', {
    ...descriptor,
    get: originalGet,
    set(nextValue) {
      const next = String(nextValue ?? '')
      if (!isBannerDateTimeInput(this) || !next || document.activeElement === this) {
        originalSet.call(this, next)
        return
      }

      const skip = normalized.get(this)
      if (skip === next) {
        normalized.delete(this)
        originalSet.call(this, next)
        return
      }

      const local = utcInputToLocal(next)
      if (local && local !== next) {
        normalized.set(this, local)
        originalSet.call(this, local)
        queueMicrotask(() => {
          if (!this.isConnected || originalGet.call(this) !== local) return
          this.dispatchEvent(new Event('input', { bubbles: true }))
        })
        return
      }

      originalSet.call(this, next)
    }
  })
})()
