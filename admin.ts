import 'server-only'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

/** Admin rights are set by stable Better Auth USER IDS, never by an email
 * typed during a public signup. The list is server-only, not NEXT_PUBLIC_*. */
export function isAdminUserId(userId: string) {
  const allowed = (process.env.ADMIN_USER_IDS ?? '').split(',').map(v => v.trim()).filter(Boolean)
  return allowed.includes(userId)
}

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { status: 401 as const, user: null }
  if (!isAdminUserId(session.user.id)) return { status: 403 as const, user: null }
  return { status: 200 as const, user: session.user }
}
