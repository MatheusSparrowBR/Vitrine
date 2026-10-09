import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './weekly-summary.css'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = URL && KEY ? createClient(URL, KEY) : null

// Liga ou desliga o resumo semanal por e-mail de uma empresa do comerciante.
export default function WeeklySummaryToggle({ businessId }) {
  const [enabled, setEnabled] = useState(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let live = true
    setEnabled(null)
    setNote('')
    if (!db || !businessId) return undefined
    db.from('businesses')
      .select('weekly_summary_enabled')
      .eq('id', businessId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return
        if (error) return setNote('Não foi possível carregar a preferência agora.')
        setEnabled(Boolean(data?.weekly_summary_enabled))
      })
    return () => {
      live = false
    }
  }, [businessId])

  async function toggle(next) {
    if (!db || saving) return
    setSaving(true)
    setNote('')
    const { error } = await db.from('businesses').update({ weekly_summary_enabled: next }).eq('id', businessId)
    setSaving(false)
    if (error) return setNote(error.message)
    setEnabled(next)
    setNote(next ? 'Resumo semanal ativado. Você recebe um e-mail toda semana.' : 'Resumo semanal desativado.')
  }

  return (
    <section className="account-card weekly-summary-card">
      <div className="weekly-summary-copy">
        <span className="account-eyebrow">RESUMO SEMANAL</span>
        <h2>Receber resumo por e-mail</h2>
        <p>Toda semana, um e-mail com visitas ao perfil, cliques em promoções e contatos da sua empresa nos últimos 7 dias.</p>
      </div>
      <label className="weekly-summary-switch">
        <input
          type="checkbox"
          checked={Boolean(enabled)}
          disabled={enabled === null || saving}
          onChange={event => toggle(event.target.checked)}
        />
        <span>{enabled ? 'Ativado' : 'Desativado'}</span>
      </label>
      {note && <small className="weekly-summary-note" role="status">{note}</small>}
    </section>
  )
}
