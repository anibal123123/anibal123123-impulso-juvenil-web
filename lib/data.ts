import 'server-only'
import { and, count, desc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { reporte } from '@/lib/db/schema'
import { getMunicipalMetrics, importMunicipalMetrics } from '@/lib/municipal-server'
import { summarizeMunicipal, type MunicipalMetric } from '@/lib/municipal-analytics'
import type { IndicatorRow } from '@/lib/metrics'
import type { Member } from '@/lib/session'

export async function getIndicators(member: Member) {
  const values = await getMunicipalMetrics(member.allowedTerritories)
  const keys = [...new Set(values.map(r=>`${r.period}|${r.territory}`))].sort()
  const rows: IndicatorRow[] = keys.map(key=>{
    const [period,territory]=key.split('|')
    const group=values.filter(r=>r.period===period&&r.territory===territory)
    const s=summarizeMunicipal(group)
    return {periodo:`${period}-01`,territorio:territory,acompanados:s.beneficiaries,
      sinEmpleoInicial:s.unemployedAtEntry,contrataciones:s.hires,empleoActual:s.employedNow,
      formacion:s.inTraining,busqueda:s.searching,capacitaciones:s.trainingParticipants,
      postulaciones:s.applications,entrevistas:s.interviews,profesionales:s.professionals,ofertas:s.offers,
      origen:group.some(r=>r.source==='sintetico')?'sintetico':'importado'}
  })
  return {rows,updatedAt:null}
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

// Compatibilidad con importadores del formato de indicadores mensuales.
// Los nuevos datos se guardan en estadistica_municipal, no en la tabla antigua indicador.
export async function upsertIndicators(organismoId: string, _importKey: string, rows: Omit<IndicatorRow,'origen'>[]) {
  const mapped:MunicipalMetric[]=[]
  for(const r of rows){
    const base={period:r.periodo.slice(0,7),territory:r.territorio,dimension:'resumen',category:'total',source:'importado' as const}
    const pairs:[string,number][]=[
      ['beneficiarios',r.acompanados],['sin_empleo_inicial',r.sinEmpleoInicial],
      ['contrataciones',r.contrataciones],['con_empleo_actual',r.empleoActual],
      ['en_formacion',r.formacion],['en_busqueda',r.busqueda],['participacion_capacitacion',r.capacitaciones],
      ['postulaciones',r.postulaciones],['entrevistas',r.entrevistas],
      ['profesionales',r.profesionales],['ofertas',r.ofertas],
    ]
    pairs.forEach(([metric,value])=>mapped.push({...base,metric,value}))
  }
  await importMunicipalMetrics(mapped)
  return rows.length
}
