import React from 'react'

const PATHS={
  search:<><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  pin:<><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>,
  chevronDown:<path d="m7 9 5 5 5-5"/>,
  chevronLeft:<path d="m14.5 6-6 6 6 6"/>,
  chevronRight:<path d="m9.5 6 6 6-6 6"/>,
  arrowRight:<><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></>,
  check:<path d="m5 12 4 4L19 6"/>,
  close:<><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
  menu:<><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
  user:<><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-3.2 2.9-5 6.5-5s5.8 1.8 6.5 5"/></>,
  store:<><path d="M4 10.5h16"/><path d="M5 10.5V20h14v-9.5"/><path d="M3.5 10.5 5 5h14l1.5 5.5"/><path d="M8 20v-5h8v5"/></>,
  tag:<><path d="M4 12V5h7l8 8-6 6-9-7Z"/><circle cx="8" cy="8" r="1"/></>,
  calendar:<><rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/></>,
  clock:<><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></>,
  phone:<path d="M7.5 4.5 10 4l1.5 4-2 1.5c1 2.2 2.8 4 5 5l1.5-2 4 1.5-.5 2.5c-.3 1.5-1.7 2.5-3.2 2.2C10.9 17.8 6.2 13.1 4.3 7.7 3.8 6.2 4.9 4.8 7.5 4.5Z"/>,
  instagram:<><rect x="4.5" y="4.5" width="15" height="15" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none"/></>,
  share:<><circle cx="18" cy="5.5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="18.5" r="2"/><path d="m8 11 8-4.5M8 13l8 4.5"/></>,
  bookmark:<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3-6 3Z"/>,
  star:<path d="m12 3.8 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8Z"/>,
  briefcase:<><rect x="4" y="6.5" width="16" height="12.5" rx="2"/><path d="M9 6.5V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M4 11h16M10 11v2h4v-2"/></>,
  grid:<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  bag:<><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  image:<><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m6 17 4.5-4.5 3 3 2-2 2.5 3"/></>,
  wrench:<><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.2 2.2-2.6-.7-.7-2.6Z"/></>,
  heart:<path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z"/>
}

export const ICON_CATALOG=[
 {name:'store',label:'Loja / Restaurante',group:'Comércio e alimentação'},
 {name:'bag',label:'Sacola / Mercado',group:'Comércio e alimentação'},
 {name:'tag',label:'Oferta',group:'Comércio e alimentação'},
 {name:'wrench',label:'Serviços',group:'Serviços'},
 {name:'heart',label:'Saúde / Bem-estar',group:'Saúde e beleza'},
 {name:'star',label:'Beleza / Destaque',group:'Saúde e beleza'},
 {name:'briefcase',label:'Academia / Negócios',group:'Serviços e negócios'},
 {name:'pin',label:'Turismo / Localização',group:'Turismo'},
 {name:'calendar',label:'Eventos',group:'Eventos e agenda'},
 {name:'clock',label:'Horários',group:'Eventos e agenda'},
 {name:'phone',label:'Telefone',group:'Contato'},
 {name:'instagram',label:'Instagram',group:'Contato'},
 {name:'grid',label:'Categoria genérica',group:'Outros'},
 {name:'image',label:'Imagem',group:'Mídia'},
 {name:'camera',label:'Câmera',group:'Mídia'},
 {name:'share',label:'Compartilhar',group:'Ações'},
 {name:'bookmark',label:'Salvar',group:'Ações'},
 {name:'user',label:'Pessoa',group:'Ações'},
 {name:'search',label:'Busca',group:'Ações'},
 {name:'check',label:'Verificado',group:'Ações'}
]

export default function Icon({name,size=18,strokeWidth=1.8,filled=false,className=''}) {
  const path=PATHS[name]||PATHS.grid
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{path}</svg>
}
