const BASE_URL='https://api.mercadopago.com'

export class MercadoPagoError extends Error{
  status:number
  details:unknown
  constructor(message:string,status:number,details?:unknown){super(message);this.name='MercadoPagoError';this.status=status;this.details=details}
}

export async function mpRequest<T=any>(path:string,init:RequestInit={},token?:string):Promise<T>{
  const accessToken=token||Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')||''
  if(!accessToken)throw new MercadoPagoError('MERCADOPAGO_ACCESS_TOKEN não configurado.',500)
  const headers=new Headers(init.headers||{})
  headers.set('Authorization',`Bearer ${accessToken}`)
  headers.set('Content-Type','application/json')
  const response=await fetch(`${BASE_URL}${path}`,{...init,headers})
  const text=await response.text()
  let payload:any=null
  try{payload=text?JSON.parse(text):null}catch{payload=text}
  if(!response.ok){
    const message=typeof payload==='object'&&payload?(payload.message||payload.error||`Mercado Pago retornou HTTP ${response.status}`):`Mercado Pago retornou HTTP ${response.status}`
    throw new MercadoPagoError(String(message),response.status,payload)
  }
  return payload as T
}

export function siteUrl(req?:Request){
  const configured=(Deno.env.get('SITE_URL')||'').trim().replace(/\/+$/,'')
  if(configured){
    try{const url=new URL(configured);if(!/^https?:$/.test(url.protocol))throw new Error();return url.toString().replace(/\/$/,'')}catch{throw new MercadoPagoError('SITE_URL não configurada corretamente.',500)}
  }
  const origin=(req?.headers.get('origin')||'').trim().replace(/\/+$/,'')
  if(origin){
    try{const url=new URL(origin);if(!/^https?:$/.test(url.protocol))throw new Error();return url.toString().replace(/\/$/,'')}catch{throw new MercadoPagoError('A origem da aplicação não é válida.',400)}
  }
  const referer=(req?.headers.get('referer')||'').trim()
  if(referer){
    try{const url=new URL(referer);if(!/^https?:$/.test(url.protocol))throw new Error();return url.origin}catch{throw new MercadoPagoError('A origem da aplicação não é válida.',400)}
  }
  throw new MercadoPagoError('SITE_URL não configurada e a origem da aplicação não foi enviada.',500)
}

export function centsToReais(value:unknown){
  const amount=Math.round(Number(value)*100)
  if(!Number.isSafeInteger(amount)||amount<100)throw new MercadoPagoError('Valor de cobrança inválido.',409)
  return amount/100
}
