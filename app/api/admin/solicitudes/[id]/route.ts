import { z } from 'zod'
import { getAdminSession } from '@/lib/admin'
import { decideRequest } from '@/lib/approvals'
import { REGION_NAME } from '@/lib/geography'

export const dynamic = 'force-dynamic'
const submission = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('aprobar'), plan: z.enum(['municipal','provincial','regional']), territory: z.string().min(1).max(100) }),
  z.object({ decision: z.literal('rechazar') }),
])
export async function POST(request: Request, {params}:{params:Promise<{id:string}>}) {
  try {
    const admin=await getAdminSession()
    if (admin.status !== 200 || !admin.user) return Response.json({error:'No autorizado'},{status:admin.status})
    // Solo solicitudes del mismo sitio: evita que otro sitio envíe formularios autenticados.
    const origin=request.headers.get('origin')
    const host=request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    if (!origin || !host || new URL(origin).host !== host)
      return Response.json({error:'Origen no válido'},{status:403})
    const parsed=submission.safeParse(await request.json().catch(()=>null))
    if (!parsed.success) return Response.json({error:'Decisión o asignación inválida.'},{status:400})
    const {id}=await params
    if (!id || id.length>128) return Response.json({error:'ID inválido'},{status:400})
    const result=await decideRequest({adminId:admin.user.id,userId:id,decision:parsed.data.decision,
      plan:parsed.data.decision==='aprobar'?parsed.data.plan:undefined,
      territory:parsed.data.decision==='aprobar'?parsed.data.territory:undefined})
    return Response.json(result, {status:result.ok?200:409,headers:{'Cache-Control':'no-store'}})
  } catch(e) {
    console.error('[solicitudes] Error procesando solicitud',e)
    return Response.json({error:'No se pudo procesar la solicitud.'},{status:500})
  }
}
