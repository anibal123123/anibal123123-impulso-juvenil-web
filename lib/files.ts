import 'server-only'

export type SheetTable = { headers: string[]; rows: string[][] }

export function fileKind(name: string) {
  const ext = name.toLowerCase().split('.').pop()
  return ext === 'csv' || ext === 'xlsx' || ext === 'pdf' ? ext : null
}

export function parseCsv(text: string): SheetTable {
  const records: string[][] = []
  let field = ''
  let row: string[] = []
  let quoted = false
  const delimiter = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); records.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); records.push(row) }
  const nonEmpty = records.filter(r => r.some(cell => cell.trim()))
  const [headers = [], ...rows] = nonEmpty
  return { headers: headers.map(h => h.trim().replace(/^\uFEFF/, '')), rows }
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<SheetTable> {
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { headers: [], rows: [] }
  const values: string[][] = []
  sheet.eachRow({ includeEmpty: false }, row => {
    const cells: string[] = []
    for (let i = 1; i <= sheet.columnCount; i++) {
      const v = row.getCell(i).value
      cells.push(cellToString(v))
    }
    values.push(cells)
  })
  const [headers = [], ...rows] = values
  return { headers: headers.map(h => h.trim()), rows }
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    const o = v as { result?: unknown; text?: string; richText?: { text: string }[] }
    if (o.richText) return o.richText.map(t => t.text).join('')
    if (o.text) return o.text
    if ('result' in o) return cellToString(o.result)
    return ''
  }
  return String(v)
}

export async function parsePdfText(buffer: ArrayBuffer, maxPages: number) {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text, totalPages } = await extractText(pdf, { mergePages: false })
  const pages = (text as string[]).slice(0, maxPages)
  return { text: pages.join('\n\n'), totalPages, readPages: pages.length }
}

export function tableToText(table: SheetTable, maxRows: number) {
  const lines = [table.headers.join(' | '), ...table.rows.slice(0, maxRows).map(r => r.join(' | '))]
  return { text: lines.join('\n'), totalRows: table.rows.length, readRows: Math.min(maxRows, table.rows.length) }
}
