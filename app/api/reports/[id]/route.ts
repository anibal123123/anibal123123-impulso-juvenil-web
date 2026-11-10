import { getReport } from '@/lib/data'
import { authErrorResponse, getMember } from '@/lib/session'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await getMember()
    const { id } = await params
    const report = await getReport(member.reportScope, id)
    if (!report) return Response.json({ error: 'Reporte no encontrado.' }, { status: 404 })
    return Response.json(report)
  } catch (error) {
    return authErrorResponse(error)
  }
}
