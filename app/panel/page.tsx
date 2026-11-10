import { Dashboard } from '@/components/dashboard'
import { requireMemberPage } from '@/lib/session'
import { getMunicipalMetrics } from '@/lib/municipal-server'
export const dynamic = 'force-dynamic'
export default async function PanelPrivado() {
  const member = await requireMemberPage()
  // Filtrado territorial del lado servidor antes de entregar filas al navegador.
  const metrics = await getMunicipalMetrics(member.allowedTerritories)
  return <Dashboard authenticatedUser={member.name} data={metrics} organismoNombre={member.scopeLabel} canImport={member.plan === 'admin'} />
}
