// Modelo analítico MINIMIZADO: métricas agregadas por mes y comuna.
// Ninguna entidad de este módulo contiene nombres, correos, RUT ni fichas individuales.
export type MunicipalMetric = {
  period: string
  territory: string
  metric: string
  dimension: string
  category: string
  value: number
  source: 'sintetico' | 'importado'
}

const showPeriod=(period:string)=>{
  const [y,m]=period.split('-').map(Number)
  return new Date(Date.UTC(y,m-1,1)).toLocaleDateString('es-CL',{month:'short',year:'numeric',timeZone:'UTC'})
}
export function periodOptionsFor(rows:MunicipalMetric[]){
  const periods=[...new Set(rows.map(r=>r.period))].sort()
  const first=periods[0]??'2026-01', last=periods.at(-1)??first
  const options=[{value:`${first}|${last}`,label:`${showPeriod(first)} – ${showPeriod(last)}`}]
  if(periods.length>6){
    const initial=periods[5]
    options.push({value:`${first}|${initial}`,label:`${showPeriod(first)} – ${showPeriod(initial)}`})
    const recent=periods[Math.max(0,periods.length-4)]
    options.push({value:`${recent}|${last}`,label:`${showPeriod(recent)} – ${showPeriod(last)}`})
  }
  return options
}

export type MunicipalSummary = {
  beneficiaries: number
  unemployedAtEntry: number
  employedNow: number
  hires: number
  inTraining: number
  searching: number
  trainingParticipants: number
  applications: number
  interviews: number
  professionals: number
  offers: number
  insertionRate: number
}

export function filterMunicipal(rows: MunicipalMetric[], period: string, territory: string) {
  const [from, to] = period.split('|')
  return rows.filter(r => r.period >= from && r.period <= to && (territory === 'Todos los territorios' || r.territory === territory))
}

export function sumMetric(rows: MunicipalMetric[], metric: string, dimension = 'resumen', category = 'total') {
  return rows.reduce((sum, row) => sum + (row.metric === metric && row.dimension === dimension && row.category === category ? row.value : 0), 0)
}

export function summarizeMunicipal(rows: MunicipalMetric[]): MunicipalSummary {
  const beneficiaries = sumMetric(rows, 'beneficiarios')
  const unemployedAtEntry = sumMetric(rows, 'sin_empleo_inicial')
  const hires = sumMetric(rows, 'contrataciones')
  return {
    beneficiaries,
    unemployedAtEntry,
    employedNow: sumMetric(rows, 'con_empleo_actual'),
    hires,
    inTraining: sumMetric(rows, 'en_formacion'),
    searching: sumMetric(rows, 'en_busqueda'),
    trainingParticipants: sumMetric(rows, 'participacion_capacitacion'),
    applications: sumMetric(rows, 'postulaciones'),
    interviews: sumMetric(rows, 'entrevistas'),
    professionals: sumMetric(rows, 'profesionales'),
    offers: sumMetric(rows, 'ofertas'),
    insertionRate: unemployedAtEntry ? Math.round((hires / unemployedAtEntry) * 1000) / 10 : 0,
  }
}

export function distribution(rows: MunicipalMetric[], dimension: string, metric: string) {
  const values = new Map<string, number>()
  for (const row of rows) if (row.dimension === dimension && row.metric === metric) {
    values.set(row.category, (values.get(row.category) ?? 0) + row.value)
  }
  return [...values].map(([label, value]) => ({label, value})).sort((a,b) => b.value - a.value || a.label.localeCompare(b.label,'es'))
}

export function byTerritoryMunicipal(rows: MunicipalMetric[]) {
  const names = [...new Set(rows.map(r => r.territory))].sort((a,b) => a.localeCompare(b,'es'))
  return names.map(territory => ({ territory, ...summarizeMunicipal(rows.filter(r => r.territory === territory)) }))
}

export function byMonthMunicipal(rows: MunicipalMetric[]) {
  const periods = [...new Set(rows.map(r => r.period))].sort()
  return periods.map(period => ({ period, ...summarizeMunicipal(rows.filter(r => r.period === period)) }))
}

export const formatCount = (count: number) => count.toLocaleString('es-CL')
export const displayMonth = (period: string) => {
  const [year, month] = period.split('-').map(Number)
  return new Date(Date.UTC(year, month-1, 1)).toLocaleDateString('es-CL', {month:'short',timeZone:'UTC'})
}
