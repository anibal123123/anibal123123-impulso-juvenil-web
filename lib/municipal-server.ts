import 'server-only'
import { asc, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { estadisticaMunicipal } from '@/lib/db/schema'
import type { MunicipalMetric } from '@/lib/municipal-analytics'
import { demoOrganismId, ALL_COMMUNES } from '@/lib/geography'

export async function getMunicipalMetrics(allowedTerritories: string[]): Promise<MunicipalMetric[]> {
  if (!allowedTerritories.length) return []
  const result = await db.select({
    period: estadisticaMunicipal.periodo, territory:estadisticaMunicipal.territorio,
    metric:estadisticaMunicipal.metrica, dimension:estadisticaMunicipal.dimension,
    category:estadisticaMunicipal.categoria, value:estadisticaMunicipal.valor,
    source:estadisticaMunicipal.origen,
  }).from(estadisticaMunicipal)
    .where(inArray(estadisticaMunicipal.territorio,allowedTerritories))
    .orderBy(asc(estadisticaMunicipal.periodo),asc(estadisticaMunicipal.territorio))
  return result.map(row=>({...row,period:row.period.slice(0,7),source:(row.source==='importado'?'importado':'sintetico') as MunicipalMetric['source']}))
}

export async function importMunicipalMetrics(rows:MunicipalMetric[]) {
  if (rows.some(r => !ALL_COMMUNES.includes(r.territory))) throw new Error("Territorio fuera de Biobío")
  if(!rows.length)return 0
  // Transacción por bloques: no cambia la base existente al encontrar error en CSV.
  await db.transaction(async tx => {
    for(let start=0;start<rows.length;start+=100) {
      const batch=rows.slice(start,start+100)
      await tx.insert(estadisticaMunicipal).values(batch.map(r=>({
        organismoId: demoOrganismId(r.territory), periodo:`${r.period}-01`, territorio:r.territory,
        metrica:r.metric,dimension:r.dimension,categoria:r.category,valor:r.value,origen:'importado',
      }))).onConflictDoUpdate({
        target:[estadisticaMunicipal.organismoId,estadisticaMunicipal.periodo,estadisticaMunicipal.territorio,estadisticaMunicipal.metrica,estadisticaMunicipal.dimension,estadisticaMunicipal.categoria],
        set:{valor:sql`excluded.valor`,origen:'importado',updatedAt:sql`now()`},
      })
    }
  })
  return rows.length
}
