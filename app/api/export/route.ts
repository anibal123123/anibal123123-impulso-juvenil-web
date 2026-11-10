import { getIndicators } from '@/lib/data'
import { applyFilters } from '@/lib/metrics'
import { authErrorResponse, getMember } from '@/lib/session'
import { filtersSchema, neutralizeCell } from '@/lib/validation'

const COLUMNS = ['periodo', 'territorio', 'acompanados', 'sinEmpleoInicial', 'contrataciones', 'empleoActual', 'formacion', 'busqueda', 'capacitaciones', 'postulaciones', 'entrevistas', 'profesionales', 'ofertas', 'origen'] as const

export async function GET(request: Request) {
  try {
    const member = await getMember()
    const params = new URL(request.url).searchParams
    const format = params.get('format') === 'json' ? 'json' : 'csv'
    const filters = filtersSchema.safeParse({ desde: params.get('desde'), hasta: params.get('hasta'), territorio: params.get('territorio') })
    if (!filters.success) return Response.json({ error: 'Filtros inválidos.' }, { status: 400 })
    const { rows } = await getIndicators(member.organismoId)
    const data = applyFilters(rows, filters.data)
    const stamp = new Date().toISOString().slice(0, 10)
    if (format === 'json') {
      return new Response(JSON.stringify({ organismo: member.organismoNombre, filtros: filters.data, generadoEn: new Date().toISOString(), registros: data }, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="impulso-indicadores-${stamp}.json"`, 'Cache-Control': 'no-store' },
      })
    }
    const escape = (v: unknown) => {
      const s = String(neutralizeCell(v ?? ''))
      return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = '\uFEFF' + [COLUMNS.join(','), ...data.map(r => COLUMNS.map(c => escape(r[c])).join(','))].join('\r\n')
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="impulso-indicadores-${stamp}.csv"`, 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return authErrorResponse(error)
  }
}
