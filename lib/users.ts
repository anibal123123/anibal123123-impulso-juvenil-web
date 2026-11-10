import 'server-only'
import { count, desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user, portalAcceso } from '@/lib/db/schema'
import { isGlobalAdmin } from '@/lib/access'

export const USERS_PER_PAGE = 25

export async function listUsers(query: string, page: number, limit = USERS_PER_PAGE) {
  const q = query.trim().slice(0, 100).replace(/[\\%_]/g, s => `\\${s}`)
  const where = q ? or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)) : undefined
  const [items, [totals]] = await Promise.all([
    db.select({
      id: user.id, name: user.name, email: user.email,
      emailVerified: user.emailVerified, createdAt: user.createdAt,
      estado: portalAcceso.estado, plan: portalAcceso.plan, territorio: portalAcceso.territorio,
    }).from(user).leftJoin(portalAcceso,eq(portalAcceso.userId,user.id)).where(where).orderBy(desc(user.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(user).where(where),
  ])
  return { items:items.map(item=>({...item,estado:isGlobalAdmin(item.id)?'administrador':item.estado??'pendiente',plan:isGlobalAdmin(item.id)?'global':item.plan,territorio:isGlobalAdmin(item.id)?'Región del Biobío':item.territorio})), total: totals?.total ?? 0 }
}
