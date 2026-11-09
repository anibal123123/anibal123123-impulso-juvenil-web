export type IndicatorRow = {
  periodo: string
  territorio: string
  acompanados: number
  empleados: number
  formacion: number
  busqueda: number
  origen: string
}

export type Filters = { desde: string; hasta: string; territorio: string }

export type Summary = {
  acompanados: number
  empleados: number
  formacion: number
  busqueda: number
  tasa: number | null
}

export type ReportSnapshot = {
  generadoEn: string
  organismo: string
  filtros: Filters
  resumen: Summary
  porTerritorio: (Summary & { territorio: string })[]
  serie: (Summary & { periodo: string })[]
  sintetico: boolean
}

export const ALL_TERRITORIES = 'todos'

export function monthLabel(periodo: string) {
  const [year, month] = periodo.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-CL', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function periodsOf(rows: IndicatorRow[]) {
  return [...new Set(rows.map(r => r.periodo))].sort()
}

export function territoriesOf(rows: IndicatorRow[]) {
  return [...new Set(rows.map(r => r.territorio))].sort()
}

export function applyFilters(rows: IndicatorRow[], filters: Filters) {
  return rows.filter(
    r =>
      r.periodo >= filters.desde &&
      r.periodo <= filters.hasta &&
      (filters.territorio === ALL_TERRITORIES || r.territorio === filters.territorio),
  )
}

export function summarize(rows: IndicatorRow[]): Summary {
  const total = rows.reduce(
    (acc, r) => ({
      acompanados: acc.acompanados + r.acompanados,
      empleados: acc.empleados + r.empleados,
      formacion: acc.formacion + r.formacion,
      busqueda: acc.busqueda + r.busqueda,
    }),
    { acompanados: 0, empleados: 0, formacion: 0, busqueda: 0 },
  )
  return { ...total, tasa: total.acompanados ? round((total.empleados / total.acompanados) * 100) : null }
}

export function monthlySeries(rows: IndicatorRow[]) {
  return periodsOf(rows).map(periodo => ({ periodo, ...summarize(rows.filter(r => r.periodo === periodo)) }))
}

export function byTerritory(rows: IndicatorRow[]) {
  return territoriesOf(rows).map(territorio => ({ territorio, ...summarize(rows.filter(r => r.territorio === territorio)) }))
}

export function buildSnapshot(rows: IndicatorRow[], filters: Filters, organismo: string): ReportSnapshot {
  const filtered = applyFilters(rows, filters)
  return {
    generadoEn: new Date().toISOString(),
    organismo,
    filtros: filters,
    resumen: summarize(filtered),
    porTerritorio: byTerritory(filtered),
    serie: monthlySeries(filtered),
    sintetico: filtered.some(r => r.origen === 'sintetico'),
  }
}

export type Comparison = {
  metric: keyof Omit<Summary, 'tasa'> | 'tasa'
  label: string
  a: number | null
  b: number | null
  diff: number | null
  pct: number | null
}

const METRIC_LABELS: Record<Comparison['metric'], string> = {
  acompanados: 'Personas acompañadas',
  empleados: 'Con empleo',
  formacion: 'En formación',
  busqueda: 'En búsqueda',
  tasa: 'Tasa de inserción (%)',
}

export function compareSummaries(a: Summary, b: Summary, coverageA: number, coverageB: number): Comparison[] {
  return (Object.keys(METRIC_LABELS) as Comparison['metric'][]).map(metric => {
    const va = coverageA ? a[metric] : null
    const vb = coverageB ? b[metric] : null
    const diff = va === null || vb === null ? null : round(vb - va)
    const pct = diff === null || !va || metric === 'tasa' ? null : round((diff / va) * 100)
    return { metric, label: METRIC_LABELS[metric], a: va, b: vb, diff, pct }
  })
}

export type Forecast = {
  periodo: string
  tasa: number
  min: number
  max: number
}

export const MIN_FORECAST_POINTS = 6

// Ordinary least squares over the monthly insertion rate with a ±2·RMSE band.
export function forecastRate(series: { periodo: string; tasa: number | null }[], horizon = 3) {
  const points = series.filter((p): p is { periodo: string; tasa: number } => p.tasa !== null)
  if (points.length < MIN_FORECAST_POINTS) return null
  const n = points.length
  const xs = points.map((_, i) => i)
  const ys = points.map(p => p.tasa)
  const meanX = xs.reduce((s, x) => s + x, 0) / n
  const meanY = ys.reduce((s, y) => s + y, 0) / n
  const sxx = xs.reduce((s, x) => s + (x - meanX) ** 2, 0)
  const slope = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0) / sxx
  const intercept = meanY - slope * meanX
  const rmse = Math.sqrt(ys.reduce((s, y, i) => s + (y - (intercept + slope * xs[i])) ** 2, 0) / n)
  const last = points[n - 1].periodo
  const forecast: Forecast[] = Array.from({ length: horizon }, (_, k) => {
    const value = intercept + slope * (n + k)
    return {
      periodo: addMonths(last, k + 1),
      tasa: clampRate(value),
      min: clampRate(value - 2 * rmse),
      max: clampRate(value + 2 * rmse),
    }
  })
  return { forecast, slope: round(slope), rmse: round(rmse), points: n }
}

export function addMonths(periodo: string, months: number) {
  const [y, m] = periodo.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + months, 1))
  return d.toISOString().slice(0, 10)
}

function clampRate(v: number) {
  return round(Math.min(100, Math.max(0, v)))
}

export function round(v: number) {
  return Math.round(v * 10) / 10
}

export function formatNumber(v: number | null) {
  return v === null ? 'Sin datos' : v.toLocaleString('es-CL')
}
