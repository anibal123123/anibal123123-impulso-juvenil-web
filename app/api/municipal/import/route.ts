import { authErrorResponse, AuthError, getMember } from '@/lib/session'
import { importMunicipalMetrics } from '@/lib/municipal-server'
import { parseCsv } from '@/lib/files'
import type { MunicipalMetric } from '@/lib/municipal-analytics'
import { ALL_COMMUNES } from '@/lib/geography'

export const maxDuration=60
const METRICS: Record<string, Set<string>> = {
  beneficiarios:new Set(['resumen','edad','educacion','barrera','interes_laboral']),
  sin_empleo_inicial:new Set(['resumen']),con_empleo_actual:new Set(['resumen']),
  contrataciones:new Set(['resumen']),en_formacion:new Set(['resumen']),
  en_busqueda:new Set(['resumen']),participacion_capacitacion:new Set(['resumen']),
  postulaciones:new Set(['resumen']),entrevistas:new Set(['resumen']),
  profesionales:new Set(['resumen','profesion']),
  ofertas:new Set(['resumen','sector_oferta','estado_oferta','jornada','experiencia_requerida']),
}
const required=['periodo','territorio','metrica','dimension','categoria','valor']

export async function POST(request:Request){
  try {
    const member=await getMember()
    if(member.plan !== 'admin') throw new AuthError(403)
    const form=await request.formData()
    const file=form.get('file')
    if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.csv')) return Response.json({error:'Adjunta un CSV de indicadores agregados.'},{status:400})
    if(file.size>1024*1024)return Response.json({error:'Límite: 1 MB por importación.'},{status:413})
    const table=parseCsv(await file.text())
    if(table.rows.length>3000)return Response.json({error:'Máximo 3.000 filas por importación.'},{status:413})
    const headers=table.headers.map(h=>h.trim().toLowerCase())
    const missing=required.filter(k=>!headers.includes(k))
    if(missing.length)return Response.json({error:`Columnas faltantes: ${missing.join(', ')}`},{status:400})
    const seen=new Set<string>()
    const valid:MunicipalMetric[]=[]
    const errors:string[]=[]
    for(const [index,cells] of table.rows.entries()) {
      const get=(field:string)=>String(cells[headers.indexOf(field)]??'').trim()
      const period=get('periodo').slice(0,7)
      const territory=get('territorio')
      const metric=get('metrica'),dimension=get('dimension'),category=get('categoria')
      const valueStr=get('valor')
      const value=Number(valueStr)
      const key=[period,territory,metric,dimension,category].join('|')
      if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)|| !/^\d{1,7}$/.test(valueStr)||!Number.isSafeInteger(value)||value>1000000||
        !ALL_COMMUNES.includes(territory) ||
        !METRICS[metric]?.has(dimension)||!category||category.length>90 || (dimension==='resumen'&&category!=='total') || seen.has(key)) {
        errors.push(`Fila ${index+2}: dato inválido, duplicado o fuera del municipio.`)
      } else {
        seen.add(key)
        valid.push({period,territory,metric,dimension,category,value,source:'importado'})
      }
      if(errors.length>=15)break
    }
    if(errors.length)return Response.json({error:errors.join(' ')},{status:422})
    if(!valid.length)return Response.json({error:'El archivo está vacío.'},{status:400})
    const saved=await importMunicipalMetrics(valid)
    return Response.json({guardadas:saved},{status:201})
  } catch(error) {return authErrorResponse(error)}
}
