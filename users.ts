import 'server-only'
import { count, desc, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'

export const USERS_PER_PAGE = 25

export async function listUsers(query: string, page: number, limit = USERS_PER_PAGE) {
  const q = query.trim().slice(0, 100).replace(/[\\%_]/g, s => `\\${s}`)
  const where = q ? or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)) : undefined
  const [items, [totals]] = await Promise.all([
    db.select({
      id: user.id, name: user.name, email: user.email,
      emailVerified: user.emailVerified, createdAt: user.createdAt,
    }).from(user).where(where).orderBy(desc(user.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(user).where(where),
  ])
  return { items, total: totals?.total ?? 0 }
}
