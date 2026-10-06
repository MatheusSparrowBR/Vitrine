import React from 'react'
import{DAYS,normalizeHours}from'./business-hours-utils.js'

export{DAYS,normalizeHours,formatHours}from'./business-hours-utils.js'

export default function BusinessHoursEditor({value,onChange}){
 const hours=normalizeHours(value)
 const update=(day,periodIndex,field,next)=>onChange({...hours,[day]:{...hours[day],periods:hours[day].periods.map((period,index)=>index===periodIndex?{...period,[field]:next}:period)}})
 const updateClosed=(day,next)=>onChange({...hours,[day]:{...hours[day],closed:next}})
 return <div className="hours-editor">
  <p className="hours-help">Informe os horários em que sua empresa funciona. Para comércio com pausa no almoço, preencha os dois períodos. Ex.: 08:00 - 12:00 - 13:30 - 18:00.</p>
  <div className="hours-list">
   {DAYS.map(([key,label])=>{
    const day=hours[key]
    const first=day.periods[0]||{open:'',close:''}
    const second=day.periods[1]||{open:'',close:''}
    return <div className={'hours-row '+(day.closed?'is-closed':'')} key={key}>
     <strong>{label}</strong>
     <label><span>1º período · abertura</span><input aria-label={label+': abertura'} type="time" value={first.open} disabled={day.closed} onChange={e=>update(key,0,'open',e.target.value)}/></label>
     <label><span>1º período · saída</span><input aria-label={label+': saída'} type="time" value={first.close} disabled={day.closed} onChange={e=>update(key,0,'close',e.target.value)}/></label>
     <label><span>2º período · retorno</span><input aria-label={label+': retorno'} type="time" value={second.open} disabled={day.closed} onChange={e=>update(key,1,'open',e.target.value)}/></label>
     <label><span>2º período · saída</span><input aria-label={label+': saída final'} type="time" value={second.close} disabled={day.closed} onChange={e=>update(key,1,'close',e.target.value)}/></label>
     <label className="hours-closed"><input type="checkbox" checked={Boolean(day.closed)} onChange={e=>updateClosed(key,e.target.checked)}/> Fechado</label>
    </div>
   })}
  </div>
 </div>
}
