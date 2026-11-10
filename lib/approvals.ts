import 'server-only'
import { and, asc, count, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { portalAcceso, user, session } from '@/lib/db/schema'
import { configuredAdminId, isGlobalAdmin } from '@/lib/access'
import { validAssignment, type AccessPlan } from '@/lib/geography'

export const APPROVALS_PER_PAGE = 25
export async function listApprovalRequests(page = 1) {
  const administrator = configuredAdminId()
  return db.select({
    id: user.id, name: user.name, email: user.email, createdAt: user.createdAt,
    status: portalAcceso.estado, plan: portalAcceso.plan, territory: portalAcceso.territorio,
    decidedAt: portalAcceso.autorizadoEn,
  }).from(portalAcceso).innerJoin(user,eq(portalAcceso.userId,user.id))
    .where(and(eq(portalAcceso.estado,'pendiente'),administrator ? ne(portalAcceso.userId,administrator) : undefined))
    .orderBy(asc(portalAcceso.creadoEn)).limit(APPROVALS_PER_PAGE).offset((page - 1) * APPROVALS_PER_PAGE)
}
export async function approvalCounts() {
  const administrator = configuredAdminId()
  const rows = await db.select({status:portalAcceso.estado,quantity:count()})
    .from(portalAcceso)
    .where(administrator ? ne(portalAcceso.userId,administrator) : undefined)
    .groupBy(portalAcceso.estado)
  return Object.fromEntries(rows.map(r=>[r.status,r.quantity])) as Record<string,number>
}
export async function decideRequest(params: {adminId:string,userId:string,decision:'aprobar'|'rechazar',plan?:AccessPlan,territory?:string}) {
  if (!configuredAdminId() || !isGlobalAdmin(params.adminId) || isGlobalAdmin(params.userId)) return {ok:false,reason:'No autorizado'}
  if (params.decision === 'aprobar' && (!params.plan || !params.territory || !validAssignment(params.plan,params.territory)))
    return {ok:false,reason:'Plan o territorio inválido'}
  return db.transaction(async tx => {
    const [changed] = await tx.update(portalAcceso)
      .set({estado:params.decision==='aprobar'?'aprobado':'rechazado',
        plan:params.decision==='aprobar'?params.plan!:null,
        territorio:params.decision==='aprobar'?params.territory!:null,
        autorizadoPor:params.adminId, autorizadoEn:new Date(), actualizadoEn:new Date()})
      .where(and(eq(portalAcceso.userId,params.userId),eq(portalAcceso.estado,'pendiente')))
      .returning({id:portalAcceso.userId})
    if (!changed) return {ok:false,reason:'Solicitud ya procesada o inexistente'}
    await tx.delete(session).where(eq(session.userId,params.userId))
    return {ok:true} as const
  })
}
