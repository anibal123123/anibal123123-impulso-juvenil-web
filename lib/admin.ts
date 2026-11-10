import 'server-only'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { isGlobalAdmin } from '@/lib/access'

/** Acceso único según ADMIN_USER_ID del servidor; no hay roles admin asignables en formularios. */
export const isAdminUserId = isGlobalAdmin

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { status: 401 as const, user: null }
  if (!isAdminUserId(session.user.id)) return { status: 403 as const, user: null }
  return { status: 200 as const, user: session.user }
}
