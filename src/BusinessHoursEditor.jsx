import React from 'react'
import{DAYS,normalizeHours}from'./business-hours-utils.js'

export{DAYS,normalizeHours,formatHours}from'./business-hours-utils.js'

const EMPTY_PERIOD={open:'',close:''}

export default function BusinessHoursEditor({value,onChange}){
 const hours=normalizeHours(value)

 const updatePeriod=(day,periodIndex,field,next)=>{
  onChange({
   ...hours,
   [day]:{
    ...hours[day],
    periods:hours[day].periods.map((period,index)=>index===periodIndex?{...period,[field]:next}:period)
   }
  })
 }

 const toggleClosed=(day,next)=>{
  onChange({...hours,[day]:{...hours[day],closed:next}})
 }

 const hasSecondPeriod=day=>{
  const second=day.periods?.[1]||EMPTY_PERIOD
  return Boolean(second.open||second.close)
 }

 const addSecondPeriod=day=>{
  if(hasSecondPeriod(day))return
  onChange({
   ...hours,
   [day.key]:{
    ...hours[day.key],
    periods:[day.periods?.[0]||EMPTY_PERIOD,{...EMPTY_PERIOD}]
   }
  })
 }

 const removeSecondPeriod=day=>{
  onChange({
   ...hours,
   [day.key]:{
    ...hours[day.key],
    periods:[day.periods?.[0]||EMPTY_PERIOD,{...EMPTY_PERIOD}]
   }
  })
 }

 return <div className="hours-editor">
  <div className="hours-help">
   <div>
    <strong>Defina os horários de atendimento</strong>
    <span>Para empresas que fecham no almoço, adicione o 2º período. Ex.: <b>08:00 - 12:00 · 13:30 - 18:00</b>.</span>
   </div>
  </div>

  <div className="hours-list">
   {DAYS.map(([key,label])=>{
    const day=hours[key]
    const first=day.periods?.[0]||EMPTY_PERIOD
    const second=day.periods?.[1]||EMPTY_PERIOD
    const split=hasSecondPeriod(day)

    return <section className={'hours-day-card '+(day.closed?'is-closed':'')} key={key}>
     <header className="hours-day-header">
      <div className="hours-day-title">
       <strong>{label}</strong>
       <span>{day.closed?'Sem atendimento':'Atendimento'}</span>
      </div>

      <label className="hours-status-toggle">
       <span>Fechado</span>
       <input
        type="checkbox"
        checked={Boolean(day.closed)}
        onChange={e=>toggleClosed(key,e.target.checked)}
        aria-label={label+': marcar como fechado'}
       />
       <i aria-hidden="true"/>
      </label>
     </header>

     {!day.closed&&<div className="hours-day-body">
      <div className="hours-period">
       <div className="hours-period-head">
        <span className="hours-period-badge">1º PERÍODO</span>
        <small>Primeiro horário de atendimento</small>
       </div>
       <div className="hours-period-fields">
        <label>
         <span>Abertura</span>
         <input
          aria-label={label+': 1º período, abertura'}
          type="time"
          value={first.open}
          onChange={e=>updatePeriod(key,0,'open',e.target.value)}
         />
        </label>
        <span className="hours-period-separator" aria-hidden="true">até</span>
        <label>
         <span>Fechamento</span>
         <input
          aria-label={label+': 1º período, fechamento'}
          type="time"
          value={first.close}
          onChange={e=>updatePeriod(key,0,'close',e.target.value)}
         />
        </label>
       </div>
      </div>

      {split&&<div className="hours-break-divider">
       <span>Intervalo</span>
       <i aria-hidden="true"/>
       <small>ex.: almoço</small>
      </div>}

      {split&&<div className="hours-period hours-period-second">
       <div className="hours-period-head">
        <span className="hours-period-badge is-second">2º PERÍODO</span>
        <small>Horário após o intervalo</small>
       </div>
       <div className="hours-period-fields">
        <label>
         <span>Retorno</span>
         <input
          aria-label={label+': 2º período, retorno'}
          type="time"
          value={second.open}
          onChange={e=>updatePeriod(key,1,'open',e.target.value)}
         />
        </label>
        <span className="hours-period-separator" aria-hidden="true">até</span>
        <label>
         <span>Fechamento</span>
         <input
          aria-label={label+': 2º período, fechamento'}
          type="time"
          value={second.close}
          onChange={e=>updatePeriod(key,1,'close',e.target.value)}
         />
        </label>
       </div>
       <button type="button" className="hours-remove-period" onClick={()=>removeSecondPeriod(day)} aria-label={'Remover 2º período de '+label}>Remover 2º período</button>
      </div>}

      {!split&&<button type="button" className="hours-add-period" onClick={()=>addSecondPeriod({key,periods:day.periods})}>
       <span aria-hidden="true">+</span> Adicionar 2º período
      </button>}
     </div>}

     {day.closed&&<div className="hours-closed-state">
      <span aria-hidden="true">✓</span>
      <div>
       <strong>Empresa fechada neste dia</strong>
       <small>Ative o atendimento acima para informar os horários.</small>
      </div>
     </div>}
    </section>
   })}
  </div>
 </div>
}
