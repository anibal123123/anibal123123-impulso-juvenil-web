import { z } from 'zod'

const period = z.string().regex(/^\d{4}-\d{2}-01$/, 'Periodo inválido')

export const filtersSchema = z
  .object({
    desde: period,
    hasta: period,
    territorio: z.string().min(1).max(80),
  })
  .refine(f => f.desde <= f.hasta, 'El inicio debe ser anterior al término')

export const createReportSchema = z.object({
  titulo: z.string().trim().min(3).max(120),
  formato: z.enum(['xlsx', 'pdf', 'csv', 'json']),
  filtros: filtersSchema,
})

// Formato resumido histórico; la importación municipal vigente acepta métricas agregadas.
export const importRowSchema = z.object({
  periodo: period,
  territorio: z.string().trim().min(2).max(80),
  acompanados: z.number().int().min(0).max(1_000_000),
  sinEmpleoInicial: z.number().int().min(0),
  contrataciones: z.number().int().min(0),
  empleoActual: z.number().int().min(0),
  formacion: z.number().int().min(0),
  busqueda: z.number().int().min(0),
}).refine(r=>r.sinEmpleoInicial<=r.acompanados&&r.contrataciones<=r.sinEmpleoInicial&&r.empleoActual+r.formacion+r.busqueda<=r.acompanados,
  'Los indicadores deben mantener coherencia con las cohortes de beneficiarios')

export const IMPORT_LIMITS = { maxBytes: 4 * 1024 * 1024, maxRows: 5000 }
export const CHAT_FILE_LIMITS = { maxBytes: 4 * 1024 * 1024, maxChars: 30_000, maxRows: 500, maxPages: 20 }

export function neutralizeCell(value: unknown) {
  if (typeof value !== 'string') return value
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}
