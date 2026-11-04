// Só http(s). Qualquer outro esquema (javascript:, data:, etc.) vira string vazia.
export function safeHttpUrl(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  try {
    const url = new URL(v)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}
