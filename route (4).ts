import { createHash } from 'node:crypto'
import { upsertIndicators } from '@/lib/data'
import { fileKind, parseCsv, parseXlsx } from '@/lib/files'
import { authErrorResponse, getMember } from '@/lib/session'
import { IMPORT_LIMITS, importRowSchema } from '@/lib/validation'

export const maxDuration = 60

const REQUIRED = ['periodo', 'territorio', 'acompanados', 'empleados', 'formacion', 'busqueda'] as const

function normalizePeriod(value: string) {
  const v = value.trim()
  const match = v.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-01` : v
}

export async function POST(request: Request) {
  try {
    const member = await getMember()
    const form = await request.formData()
    const file = form.get('file')
    const commit = form.get('commit') === 'true'
    if (!(file instanceof File)) return Response.json({ error: 'Adjunta un archivo CSV o XLSX.' }, { status: 400 })
    const kind = fileKind(file.name)
    if (kind !== 'csv' && kind !== 'xlsx') return Response.json({ error: 'Formato no admitido. Usa CSV o XLSX.' }, { status: 400 })
    if (file.size > IMPORT_LIMITS.maxBytes) return Response.json({ error: 'El archivo supera 4 MB.' }, { status: 413 })

    const buffer = await file.arrayBuffer()
    const table = kind === 'csv' ? parseCsv(new TextDecoder().decode(buffer)) : await parseXlsx(buffer)
    const headers = table.headers.map(h => h.toLowerCase())
    const missing = REQUIRED.filter(col => !headers.includes(col))
    if (missing.length) return Response.json({ error: `Faltan columnas: ${missing.join(', ')}.` }, { status: 400 })
    if (table.rows.length > IMPORT_LIMITS.maxRows) return Response.json({ error: `Máximo ${IMPORT_LIMITS.maxRows} filas por archivo.` }, { status: 413 })

    const errors: { fila: number; mensaje: string }[] = []
    const valid = new Map<string, ReturnType<typeof importRowSchema.parse>>()
    table.rows.forEach((cells, index) => {
      const get = (col: string) => cells[headers.indexOf(col)] ?? ''
      const parsed = importRowSchema.safeParse({
        periodo: normalizePeriod(get('periodo')),
        territorio: get('territorio'),
        acompanados: Number(get('acompanados')),
        empleados: Number(get('empleados')),
        formacion: Number(get('formacion')),
        busqueda: Number(get('busqueda')),
      })
      if (!parsed.success) errors.push({ fila: index + 2, mensaje: parsed.error.issues[0]?.message ?? 'Fila inválida' })
      else {
        const key = `${parsed.data.periodo}|${parsed.data.territorio}`
        if (valid.has(key)) errors.push({ fila: index + 2, mensaje: 'Fila duplicada (periodo y territorio repetidos)' })
        else valid.set(key, parsed.data)
      }
    })

    const rows = [...valid.values()]
    const importKey = createHash('sha256').update(new Uint8Array(buffer)).digest('hex').slice(0, 24)
    if (!commit) {
      return Response.json({ preview: rows.slice(0, 8), validas: rows.length, errores: errors.slice(0, 50), totalErrores: errors.length, importKey })
    }
    if (errors.length) return Response.json({ error: 'Corrige los errores antes de confirmar la importación.' }, { status: 422 })
    const saved = await upsertIndicators(member.organismoId, importKey, rows)
    return Response.json({ guardadas: saved, importKey })
  } catch (error) {
    return authErrorResponse(error)
  }
}
