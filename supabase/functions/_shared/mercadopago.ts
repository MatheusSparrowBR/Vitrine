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

export function siteUrl(){
  const value=(Deno.env.get('SITE_URL')||'').trim().replace(/\/+$/,'')
  if(!value)throw new MercadoPagoError('SITE_URL não configurada.',500)
  try{const url=new URL(value);if(!/^https?:$/.test(url.protocol))throw new Error();return url.toString().replace(/\/$/,'')}catch{throw new MercadoPagoError('SITE_URL não configurada corretamente.',500)}
}

export function centsToReais(value:unknown){
  const amount=Math.round(Number(value)*100)
  if(!Number.isSafeInteger(amount)||amount<100)throw new MercadoPagoError('Valor de cobrança inválido.',409)
  return amount/100
}
