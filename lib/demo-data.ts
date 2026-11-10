import demo from '@/data/demo-aggregates.json'
import type { MunicipalMetric } from './municipal-analytics'

// Únicamente filas agregadas por mes, municipio y categoría; no fichas individuales.
export const demoMetrics = demo.rows as unknown as MunicipalMetric[]
export const demoMetadata = demo.metadata
export const territories = [...new Set(demoMetrics.map(row => row.territory))].sort((a,b) => a.localeCompare(b,'es'))
