import { getAdminSession } from '@/lib/admin'
import { listUsers } from '@/lib/users'
import { neutralizeCell } from '@/lib/validation'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown) {
  const raw = String(value ?? '')
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : String(neutralizeCell(raw))
  return `"${safe.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession()
    if (admin.status !== 200) return Response.json({ error: 'Acceso no autorizado.' }, { status: admin.status, headers: { 'Cache-Control': 'no-store' } })
    const params = new URL(request.url).searchParams
    const q = (params.get('q') ?? '').slice(0, 100)
    if (params.get('format') === 'csv') {
      // Explicitly select only non-secret account metadata. Never join account.password.
      const { items, total } = await listUsers(q, 1, 10000)
      if (total > 10000) return Response.json({ error: 'Demasiados registros para exportar de una vez. Filtra tu búsqueda.' }, { status: 413 })
      const lines = [
        ['ID', 'Nombre', 'Correo', 'Verificado', 'Estado', 'Plan', 'Territorio', 'Fecha de registro'].map(csvCell).join(','),
        ...items.map(u => [u.id, u.name, u.email, u.emailVerified ? 'Sí' : 'No', u.estado, u.plan??'', u.territorio??'', u.createdAt.toISOString()].map(csvCell).join(',')),
      ]
      return new Response('\ufeff' + lines.join('\r\n'), { headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="impulso-juvenil-usuarios.csv"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      } })
    }
    const page = Math.max(1, Math.min(100000, parseInt(params.get('page') ?? '1', 10) || 1))
    const result = await listUsers(q, page)
    return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[admin] Error consultando usuarios', error)
    return Response.json({ error: 'No se pudo consultar la base de datos.' }, { status: 500 })
  }
}
