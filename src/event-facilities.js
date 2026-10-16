// Facilidades do evento: catálogo fixo que o admin marca no editor da página personalizada.
// O tema guarda só os códigos marcados; a página mostra apenas os grupos com algo marcado.

export const FACILITY_GROUPS = [
  { id: 'infra', title: 'Infraestrutura', icon: 'building', items: [
    ['acessibilidade', 'Acessibilidade'],
    ['banheiros', 'Banheiros'],
    ['banheiros-adaptados', 'Banheiros adaptados'],
    ['gerador', 'Gerador de energia'],
    ['palco', 'Palco'],
    ['area-coberta', 'Área coberta'],
  ] },
  { id: 'tecnologia', title: 'Tecnologia', icon: 'wifi', items: [
    ['wifi', 'Free WiFi'],
    ['telas-led', 'Telas de LED'],
    ['som', 'Som profissional'],
    ['iluminacao', 'Iluminação cênica'],
    ['recarga-celular', 'Pontos de recarga de celular'],
  ] },
  { id: 'seguranca', title: 'Segurança', icon: 'shield', items: [
    ['seguranca-privada', 'Segurança privada'],
    ['cameras', 'Câmeras de monitoramento'],
    ['brigada', 'Brigada de incêndio'],
    ['saidas-emergencia', 'Saídas de emergência'],
    ['posto-medico', 'Posto médico / Ambulância'],
  ] },
  { id: 'apoio', title: 'Serviços de apoio', icon: 'people', items: [
    ['bar', 'Bar / Coquetelaria'],
    ['alimentacao', 'Praça de alimentação'],
    ['staff', 'Staff de apoio'],
    ['limpeza', 'Equipes de limpeza'],
    ['credenciamento', 'Recepção / Credenciamento'],
    ['guarda-volumes', 'Guarda-volumes'],
    ['cartao-pix', 'Aceita cartão e Pix'],
  ] },
  { id: 'acesso', title: 'Estacionamento e acesso', icon: 'car', items: [
    ['estacionamento', 'Estacionamento próprio'],
    ['transfer', 'Transporte / Transfer'],
    ['taxi-app', 'Ponto de táxi / app'],
    ['bicicletario', 'Bicicletário'],
  ] },
  { id: 'conforto', title: 'Conforto', icon: 'sofa', items: [
    ['fumantes', 'Espaço de fumantes'],
    ['descanso', 'Área de descanso'],
    ['lounge', 'Lounge / Sofás'],
    ['decoracao', 'Decoração personalizada'],
    ['area-vip', 'Área VIP / Camarote'],
    ['area-kids', 'Área kids'],
    ['fraldario', 'Fraldário'],
    ['pet-friendly', 'Pet friendly'],
  ] },
].map(group => ({ ...group, items: group.items.map(([id, label]) => ({ id, label })) }))

const ORDER = FACILITY_GROUPS.flatMap(group => group.items.map(item => item.id))

// Só códigos do catálogo, sem repetir, na ordem do catálogo.
export function normalizeFacilities(value) {
  const chosen = new Set((Array.isArray(value) ? value : []).map(v => String(v || '')))
  return ORDER.filter(id => chosen.has(id))
}

// Grupos para exibir: só os que têm algum item marcado, com os itens marcados.
export function facilityGroupsFor(selected) {
  const chosen = new Set(normalizeFacilities(selected))
  return FACILITY_GROUPS
    .map(group => ({ ...group, items: group.items.filter(item => chosen.has(item.id)) }))
    .filter(group => group.items.length > 0)
}
