import { getIndicators, listReports, saveReport } from '@/lib/data'
import { buildSnapshot } from '@/lib/metrics'
import { authErrorResponse, getMember } from '@/lib/session'
import { createReportSchema } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    const member = await getMember()
    const params = new URL(request.url).searchParams
    const query = (params.get('q') ?? '').slice(0, 100)
    const page = Math.max(1, Math.min(100_000, Number(params.get('page')) || 1))
    return Response.json(await listReports(member.reportScope, query, page))
  } catch (error) {
    return authErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const member = await getMember()
    const parsed = createReportSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return Response.json({ error: 'Datos del reporte inválidos.' }, { status: 400 })
    const { rows } = await getIndicators(member)
    const snapshot = buildSnapshot(rows, parsed.data.filtros, member.organismoNombre)
    const saved = await saveReport({ organismoId: member.reportScope, userId: member.userId, ...parsed.data, snapshot })
    return Response.json({ ...saved, snapshot }, { status: 201 })
  } catch (error) {
    return authErrorResponse(error)
  }
}
