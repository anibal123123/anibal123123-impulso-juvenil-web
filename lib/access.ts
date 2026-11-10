import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { portalAcceso } from '@/lib/db/schema'
import { communesFor, accessLabel, validAssignment, type AccessPlan, type AccessStatus } from '@/lib/geography'

/** Un solo administrador: el identificador proviene exclusivamente del servidor. */
export function configuredAdminId(): string | null {
  const value = process.env.ADMIN_USER_ID?.trim()
  if (value) return value
  // Compatibilidad de despliegues anteriores solo si la lista tiene UN único ID.
  const old = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return old.length === 1 ? old[0] : null
}
export function isGlobalAdmin(id: string) { return !!configuredAdminId() && configuredAdminId() === id }

export async function getAccessRecord(userId: string) {
  const [record] = await db.select().from(portalAcceso).where(eq(portalAcceso.userId, userId)).limit(1)
  return record ?? null
}
export type UserScope = {
  userId: string
  plan: AccessPlan | 'admin'
  territory: string
  status: AccessStatus | 'admin'
  allowedTerritories: string[]
  scopeLabel: string
  reportScope: string
}
export async function approvedScope(userId: string): Promise<UserScope | null> {
  if (isGlobalAdmin(userId)) {
    const territory = 'Región del Biobío'
    return { userId, plan: 'admin', territory, status: 'admin', allowedTerritories: communesFor('admin', territory), scopeLabel: accessLabel('admin', territory), reportScope: 'global:biobio' }
  }
  const record = await getAccessRecord(userId)
  if (!record || record.estado !== 'aprobado' || !record.plan || !record.territorio || !validAssignment(record.plan as AccessPlan, record.territorio)) return null
  const plan = record.plan as AccessPlan
  return { userId, plan, territory: record.territorio, status: 'aprobado', allowedTerritories: communesFor(plan, record.territorio), scopeLabel: accessLabel(plan, record.territorio), reportScope: `${plan}:${record.territorio}` }
}
