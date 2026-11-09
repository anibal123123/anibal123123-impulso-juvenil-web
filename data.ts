import 'server-only'
import { and, asc, count, desc, eq, ilike, max, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { indicador, reporte } from '@/lib/db/schema'
import type { IndicatorRow } from '@/lib/metrics'

export async function getIndicators(organismoId: string) {
  const [rows, [meta]] = await Promise.all([
    db
      .select({
        periodo: indicador.periodo,
        territorio: indicador.territorio,
        acompanados: indicador.acompanados,
        empleados: indicador.empleados,
        formacion: indicador.formacion,
        busqueda: indicador.busqueda,
        origen: indicador.origen,
      })
      .from(indicador)
      .where(eq(indicador.organismoId, organismoId))
      .orderBy(asc(indicador.periodo), asc(indicador.territorio)),
    db.select({ updatedAt: max(indicador.updatedAt) }).from(indicador).where(eq(indicador.organismoId, organismoId)),
  ])
  return { rows: rows as IndicatorRow[], updatedAt: meta?.updatedAt?.toISOString() ?? null }
}

export const REPORTS_PAGE_SIZE = 10

export async function listReports(organismoId: string, query: string, page: number) {
  const where = and(
    eq(reporte.organismoId, organismoId),
    query ? ilike(reporte.titulo, `%${query.replace(/[\\%_]/g, c => `\\${c}`)}%`) : undefined,
  )
  const [items, [{ total }]] = await Promise.all([
    db
      .select({ id: reporte.id, titulo: reporte.titulo, formato: reporte.formato, filtros: reporte.filtros, createdAt: reporte.createdAt, autor: sql<string>`(select name from "user" where id = ${reporte.userId})` })
      .from(reporte)
      .where(where)
      .orderBy(desc(reporte.createdAt))
      .limit(REPORTS_PAGE_SIZE)
      .offset((page - 1) * REPORTS_PAGE_SIZE),
    db.select({ total: count() }).from(reporte).where(where),
  ])
  return { items, total }
}

export async function getReport(organismoId: string, id: string) {
  const [row] = await db
    .select()
    .from(reporte)
    .where(and(eq(reporte.id, id), eq(reporte.organismoId, organismoId)))
    .limit(1)
  return row ?? null
}

export async function saveReport(values: { organismoId: string; userId: string; titulo: string; formato: string; filtros: unknown; snapshot: unknown }) {
  const [row] = await db
    .insert(reporte)
    .values({ id: crypto.randomUUID(), ...values })
    .returning({ id: reporte.id, createdAt: reporte.createdAt })
  return row
}

export async function upsertIndicators(organismoId: string, importKey: string, rows: Omit<IndicatorRow, 'origen'>[]) {
  if (!rows.length) return 0
  await db
    .insert(indicador)
    .values(rows.map(r => ({ ...r, organismoId, origen: 'importado', importKey })))
    .onConflictDoUpdate({
      target: [indicador.organismoId, indicador.periodo, indicador.territorio],
      set: {
        acompanados: sql`excluded.acompanados`,
        empleados: sql`excluded.empleados`,
        formacion: sql`excluded.formacion`,
        busqueda: sql`excluded.busqueda`,
        origen: sql`excluded.origen`,
        importKey: sql`excluded."importKey"`,
        updatedAt: sql`now()`,
      },
    })
  return rows.length
}
