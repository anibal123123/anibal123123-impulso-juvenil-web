import 'server-only'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { membresia, organismo } from '@/lib/db/schema'

export type Member = {
  userId: string
  name: string
  email: string
  rol: string
  organismoId: string
  organismoNombre: string
  region: string
}

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? 'No autenticado' : 'Sin acceso a un organismo')
  }
}

export async function getMember(): Promise<Member> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new AuthError(401)
  const [row] = await db
    .select({ rol: membresia.rol, organismoId: organismo.id, organismoNombre: organismo.nombre, region: organismo.region })
    .from(membresia)
    .innerJoin(organismo, eq(organismo.id, membresia.organismoId))
    .where(eq(membresia.userId, session.user.id))
    .limit(1)
  if (!row) throw new AuthError(403)
  return { userId: session.user.id, name: session.user.name, email: session.user.email, ...row }
}

export async function requireMemberPage(): Promise<Member> {
  try {
    return await getMember()
  } catch (error) {
    if (error instanceof AuthError) redirect(error.status === 401 ? '/' : '/?error=sin-acceso')
    throw error
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status })
  console.error('[portal] request failed', error)
  return Response.json({ error: 'No fue posible completar la solicitud.' }, { status: 500 })
}
