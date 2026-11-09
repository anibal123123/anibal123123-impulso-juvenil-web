import { fileKind, parseCsv, parsePdfText, parseXlsx, tableToText } from '@/lib/files'
import { authErrorResponse, getMember } from '@/lib/session'
import { CHAT_FILE_LIMITS } from '@/lib/validation'

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    await getMember()
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return Response.json({ error: 'Adjunta un archivo.' }, { status: 400 })
    const kind = fileKind(file.name)
    if (!kind) return Response.json({ error: 'Formatos admitidos: CSV, XLSX y PDF con texto.' }, { status: 400 })
    if (file.size > CHAT_FILE_LIMITS.maxBytes) return Response.json({ error: 'El archivo supera 4 MB.' }, { status: 413 })
    const buffer = await file.arrayBuffer()

    let text: string
    let detalle: string
    if (kind === 'pdf') {
      const pdf = await parsePdfText(buffer, CHAT_FILE_LIMITS.maxPages)
      if (!pdf.text.trim()) return Response.json({ error: 'El PDF no contiene texto legible (los PDF escaneados no se admiten).' }, { status: 422 })
      text = pdf.text
      detalle = `${pdf.readPages} de ${pdf.totalPages} páginas`
    } else {
      const table = kind === 'csv' ? parseCsv(new TextDecoder().decode(buffer)) : await parseXlsx(buffer)
      const result = tableToText(table, CHAT_FILE_LIMITS.maxRows)
      text = result.text
      detalle = `${result.readRows} de ${result.totalRows} filas`
    }
    const truncated = text.length > CHAT_FILE_LIMITS.maxChars
    return Response.json({
      nombre: file.name.slice(0, 120),
      texto: text.slice(0, CHAT_FILE_LIMITS.maxChars),
      detalle: truncated ? `${detalle}, recortado a ${CHAT_FILE_LIMITS.maxChars.toLocaleString('es-CL')} caracteres` : detalle,
    })
  } catch (error) {
    return authErrorResponse(error)
  }
}
