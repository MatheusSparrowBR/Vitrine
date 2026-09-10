import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = URL && KEY ? createClient(URL, KEY) : null

function showError(message) {
  const host = document.querySelector('.admin-v2-management')
  if (!host) return
  const old = host.querySelector('[data-vl-city-error]')
  old?.remove()
  const alert = document.createElement('div')
  alert.className = 'admin-v2-alert'
  alert.dataset.vlCityError = 'true'
  alert.textContent = message
  host.prepend(alert)
}

async function handleCityToggle(event) {
  if (!db) return
  const button = event.target.closest?.('button')
  if (!button) return

  const action = button.textContent.trim()
  if (action !== 'Desativar' && action !== 'Ativar') return

  const row = button.closest('.admin-v2-list-row')
  if (!row) return

  const panel = row.closest('.admin-v2-list-panel')
  if (!panel) return
  const title = panel.querySelector('.admin-v2-section-head h2')?.textContent?.trim()
  if (title !== 'Cidades') return

  const meta = row.querySelector('small')?.textContent?.trim() || ''
  const slug = meta.split('·').pop()?.trim()
  if (!slug) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    showError('Não foi possível identificar a cidade para atualizar.')
    return
  }

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  const original = button.textContent
  button.disabled = true
  button.textContent = 'Salvando…'

  try {
    const { error } = await db.rpc('admin_set_city_active', {
      p_city_slug: slug,
      p_active: action === 'Ativar'
    })
    if (error) throw error
    window.location.reload()
  } catch (error) {
    button.disabled = false
    button.textContent = original
    showError(error?.message || 'Não foi possível atualizar o status da cidade.')
  }
}

if (location.pathname.startsWith('/admin')) {
  document.addEventListener('click', handleCityToggle, true)
}
