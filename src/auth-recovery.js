import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import AdminDashboard from './AdminDashboard.jsx'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

const state = {
  initialized: false,
  admin: false,
  adminHost: null,
  adminRoot: null,
}

function notify(message, error = false) {
  let toast = document.getElementById('vl-auth-recovery-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'vl-auth-recovery-toast'
    Object.assign(toast.style, {
      position: 'fixed', right: '18px', bottom: '18px', zIndex: '50000',
      padding: '12px 15px', borderRadius: '11px', color: '#fff',
      font: '700 12px DM Sans, sans-serif', boxShadow: '0 15px 35px rgba(0,0,0,.24)',
      maxWidth: 'min(440px, calc(100vw - 36px))',
    })
    document.body.appendChild(toast)
  }
  toast.textContent = error ? `Erro: ${message}` : message
  toast.style.background = error ? '#8e2525' : '#10253f'
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => toast.remove(), 3600)
}

function injectStyles() {
  if (document.getElementById('vl-auth-recovery-styles')) return
  const style = document.createElement('style')
  style.id = 'vl-auth-recovery-styles'
  style.textContent = `
    .vl-auth-logout{border:1px solid #e0caca!important;background:#fff7f7!important;color:#9e3030!important;border-radius:10px!important;padding:9px 12px!important;font:700 12px 'DM Sans',sans-serif!important;cursor:pointer!important}
    .vl-auth-logout:hover{background:#fff0f0!important}
    .vl-auth-admin{border:1px solid #cfe0ff!important;background:#eef5ff!important;color:#1f64d7!important;border-radius:10px!important;padding:9px 12px!important;font:800 12px 'DM Sans',sans-serif!important;cursor:pointer!important}
    #vl-auth-admin-host{position:fixed;inset:0;z-index:45000;background:#fff;overflow:auto}
  `
  document.head.appendChild(style)
}

async function getCurrentProfile() {
  if (!supabase) return { user: null, role: 'user' }
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) return { user: null, role: 'user' }
  const user = auth?.user || null
  if (!user) return { user: null, role: 'user' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { user, role: profile?.role || 'user' }
}

async function logout() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) {
    notify(error.message || 'Não foi possível sair da conta.', true)
    return
  }
  try { localStorage.removeItem('vitrinelocal:selected-city') } catch {}
  window.location.replace('/')
}

function closeAdmin() {
  if (state.adminRoot) {
    state.adminRoot.unmount()
    state.adminRoot = null
  }
  state.adminHost?.remove()
  state.adminHost = null
  document.body.style.overflow = ''
}

async function openAdmin() {
  if (!supabase || !state.admin) return
  if (state.adminHost) return
  const { user } = await getCurrentProfile()
  if (!user) {
    notify('Sua sessão expirou. Entre novamente.', true)
    return
  }
  state.adminHost = document.createElement('div')
  state.adminHost.id = 'vl-auth-admin-host'
  document.body.appendChild(state.adminHost)
  document.body.style.overflow = 'hidden'
  state.adminRoot = createRoot(state.adminHost)
  state.adminRoot.render(
    <AdminDashboard
      supabase={supabase}
      session={{ user }}
      onBack={closeAdmin}
      onToast={(message, error = false) => notify(message, error)}
    />
  )
}

function findButtons() {
  const nav = document.querySelector('.nav-actions')
  if (!nav) return null
  const buttons = [...nav.querySelectorAll('button')]
  return {
    nav,
    buttons,
    account: buttons.find((button) => (button.textContent || '').trim() === 'Minha conta'),
    admin: buttons.find((button) => (button.textContent || '').trim() === 'Admin'),
    logout: buttons.find((button) => /sair da conta/i.test(button.textContent || '')),
  }
}

function ensureLogoutButton() {
  const found = findButtons()
  if (!found) return
  let button = found.logout
  if (!button) {
    button = document.createElement('button')
    button.type = 'button'
    button.className = 'vl-auth-logout'
    button.textContent = 'Sair da conta'
    found.nav.insertBefore(button, found.account || null)
  }
  if (!button.dataset.vlAuthBound) {
    button.dataset.vlAuthBound = 'true'
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      void logout()
    }, true)
  }
}

function ensureAdminButton() {
  const found = findButtons()
  if (!found || !state.admin) return
  let button = found.admin
  if (!button) {
    button = document.createElement('button')
    button.type = 'button'
    button.className = 'vl-auth-admin'
    button.textContent = 'Admin'
    const account = found.account
    if (account) found.nav.insertBefore(button, account)
    else found.nav.appendChild(button)
  }
  if (!button.dataset.vlAdminBound) {
    button.dataset.vlAdminBound = 'true'
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
      void openAdmin()
    }, true)
  }
}

function cleanupWhenSignedOut() {
  if (state.adminHost) closeAdmin()
  document.querySelectorAll('.vl-auth-logout,.vl-auth-admin').forEach((button) => {
    if (!button.closest('.nav-actions')) button.remove()
  })
}

async function refreshAuthState() {
  const { user, role } = await getCurrentProfile()
  state.admin = role === 'admin'
  if (!user) {
    cleanupWhenSignedOut()
    return
  }
  ensureLogoutButton()
  ensureAdminButton()
}

function boot() {
  if (state.initialized) return
  state.initialized = true
  injectStyles()
  if (!supabase) return

  const observer = new MutationObserver(() => {
    void refreshAuthState()
  })
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })

  void refreshAuthState()
  supabase.auth.onAuthStateChange(() => {
    window.setTimeout(() => void refreshAuthState(), 0)
  })
}

boot()
