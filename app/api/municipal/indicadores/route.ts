import { authErrorResponse, getMember } from '@/lib/session'
import { getMunicipalMetrics } from '@/lib/municipal-server'

export const dynamic='force-dynamic'
export async function GET() {
  try {
    const member=await getMember()
    const rows=await getMunicipalMetrics(member.organismoId)
    return Response.json({organismo:member.organismoNombre, indicadores:rows, actualizadoEn:new Date().toISOString()}, {headers:{'Cache-Control':'no-store'}})
  } catch(error) {return authErrorResponse(error)}
}
