import { facilityGroupsFor } from './event-facilities.js'

const ICONS = {
  building: <><rect x="5" y="3.5" width="14" height="17" rx="1.5" /><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2M10.5 20.5v-3h3v3" /></>,
  wifi: <><path d="M3.5 9.5a12 12 0 0 1 17 0" /><path d="M6.5 12.8a7.6 7.6 0 0 1 11 0" /><path d="M9.5 16a3.3 3.3 0 0 1 5 0" /><circle cx="12" cy="19" r="0.9" /></>,
  shield: <><path d="M12 3 5 6v5.2c0 4.4 2.9 8.2 7 9.8 4.1-1.6 7-5.4 7-9.8V6l-7-3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  people: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.6-3 2.6-4.6 5.5-4.6s4.9 1.6 5.5 4.6" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M15.6 14.6c2.6-.3 4.4 1.1 4.9 3.9" /></>,
  car: <><path d="M5 16.5V12l1.8-4.6A1.5 1.5 0 0 1 8.2 6.5h7.6a1.5 1.5 0 0 1 1.4.9L19 12v4.5" /><path d="M4 12h16v4.5H4z" /><path d="M6.5 16.5V19M17.5 16.5V19" /><circle cx="7.8" cy="14.2" r=".9" /><circle cx="16.2" cy="14.2" r=".9" /></>,
  sofa: <><path d="M6 11V8.5A2.5 2.5 0 0 1 8.5 6h7A2.5 2.5 0 0 1 18 8.5V11" /><path d="M4.5 11A1.5 1.5 0 0 1 6 12.5V14h12v-1.5a1.5 1.5 0 1 1 3 0V17H3v-4.5A1.5 1.5 0 0 1 4.5 11Z" /><path d="M5 17v2M19 17v2" /></>,
}

function GroupIcon({ name }) {
  return <svg className="ev-facility-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
}

// Facilidades do evento: só os grupos com algum item marcado. Sem nada marcado, não aparece.
export default function EventFacilities({ selected }) {
  const groups = facilityGroupsFor(selected)
  if (!groups.length) return null
  return (
    <section className="vl-event-profile-section ev-section ev-facilities-section">
      <span className="vl-event-profile-section-kicker">Estrutura</span>
      <h2>Facilidades do evento</h2>
      <div className="ev-facilities">
        {groups.map(group => (
          <div className="ev-facility-group" key={group.id}>
            <h3><GroupIcon name={group.icon} />{group.title}</h3>
            <ul>
              {group.items.map(item => <li key={item.id}>{item.label}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
