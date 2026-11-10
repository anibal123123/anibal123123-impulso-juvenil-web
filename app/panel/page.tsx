import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'
import { getMember, AuthError } from '@/lib/session'
import { getMunicipalMetrics } from '@/lib/municipal-server'

export const dynamic='force-dynamic'
export default async function PanelPrivado() {
  const session=await auth.api.getSession({headers:await headers()})
  if(!session?.user)redirect('/')
  try {
    const member=await getMember()
    const metrics=await getMunicipalMetrics(member.organismoId)
    if(metrics.length)return <Dashboard authenticatedUser={session.user.name} data={metrics} organismoNombre={member.organismoNombre} canImport={['admin','administrador'].includes(member.rol)}/>
  } catch(error) {
    // Durante el prototipo puede existir una cuenta web sin municipio asignado.
    // En ese caso solo se ofrece el conjunto público de demostración.
    if(!(error instanceof AuthError))throw error
  }
  return <Dashboard authenticatedUser={session.user.name}/>
}
