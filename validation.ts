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

export const importRowSchema = z
  .object({
    periodo: period,
    territorio: z.string().trim().min(2).max(80),
    acompanados: z.number().int().min(0).max(1_000_000),
    empleados: z.number().int().min(0),
    formacion: z.number().int().min(0),
    busqueda: z.number().int().min(0),
  })
  .refine(r => r.empleados + r.formacion + r.busqueda <= r.acompanados, 'La suma de situaciones supera a las personas acompañadas')

export const IMPORT_LIMITS = { maxBytes: 4 * 1024 * 1024, maxRows: 5000 }
export const CHAT_FILE_LIMITS = { maxBytes: 4 * 1024 * 1024, maxChars: 30_000, maxRows: 500, maxPages: 20 }

export function neutralizeCell(value: unknown) {
  if (typeof value !== 'string') return value
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}
