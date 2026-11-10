import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { approvedScope, type UserScope } from '@/lib/access'

export type Member = UserScope & { name: string; email: string; organismoNombre: string; organismoId: string; rol: string; region: string }

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? 'Inicia sesión para continuar.' : 'Cuenta pendiente, rechazada o sin acceso autorizado.')
  }
}

export async function getMember(): Promise<Member> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new AuthError(401)
  const scope = await approvedScope(session.user.id)
  if (!scope) throw new AuthError(403)
  return {
    ...scope, name: session.user.name, email: session.user.email,
    organismoNombre: scope.scopeLabel, organismoId: scope.reportScope,
    rol: scope.plan === 'admin' ? 'admin' : 'lector', region: 'Biobío',
  }
}

export async function requireMemberPage(): Promise<Member> {
  try { return await getMember() }
  catch (error) {
    if (error instanceof AuthError) redirect(error.status === 401 ? '/' : '/?error=sin-acceso')
    throw error
  }
}
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status, headers:{'Cache-Control':'no-store'} })
  console.error('[portal] request failed', error)
  return Response.json({ error: 'No fue posible completar la solicitud.' }, { status: 500 })
}
