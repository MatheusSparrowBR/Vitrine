import { useState } from 'react'
import './promotion-share.css'

const toSlug = value => String(value || 'cartao').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cartao'

// Gera um cartão em PNG e compartilha pelo sistema, ou baixa o arquivo quando o aparelho não aceita compartilhar imagens.
export default function ShareCardButton({ buildBlob, fileName, shareTitle, shareText, shareUrl, ariaLabel, label = '↗ Compartilhar cartão', className = '', buttonClassName = 'promo-share-btn' }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function share(event) {
    event.preventDefault()
    event.stopPropagation()
    if (busy) return
    setBusy(true)
    setNote('')
    try {
      const blob = await buildBlob()
      const file = new File([blob], `${toSlug(fileName)}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText, url: shareUrl })
        setNote('Cartão compartilhado.')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setNote('Cartão baixado. Envie a imagem pelo WhatsApp ou Instagram.')
      }
    } catch (error) {
      // Cancelar o compartilhamento do sistema não é erro.
      if (error?.name !== 'AbortError') setNote('Não foi possível gerar o cartão agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`promo-share ${className}`.trim()}>
      <button type="button" className={buttonClassName} onClick={share} disabled={busy} aria-label={ariaLabel}>
        {busy ? 'Gerando cartão…' : label}
      </button>
      {note && <small className="promo-share-note" role="status">{note}</small>}
    </div>
  )
}
