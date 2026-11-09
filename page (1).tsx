import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'

export const dynamic = 'force-dynamic'

export default async function PanelPrivado() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/')
  // The dashboard deliberately uses fictitious demo records; authentication
  // protects the page but does NOT turn those records into real user data.
  return <Dashboard authenticatedUser={session.user.name} />
}
