import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin'
import { listApprovalRequests, approvalCounts, APPROVALS_PER_PAGE } from '@/lib/approvals'
import { ApprovalList } from '@/components/approval-list'

export const dynamic='force-dynamic'
export default async function SolicitudesPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const admin=await getAdminSession()
  if (admin.status===401) redirect('/')
  if (admin.status!==200) return <main className="admin-screen"><div className="admin-card"><h1>Acceso restringido</h1><Link href="/cuenta">Volver</Link></div></main>
  const params=await searchParams
  const page=Math.min(100000,Math.max(1,Number.parseInt(params.page??'1',10)||1))
  const [pending,counts]=await Promise.all([listApprovalRequests(page),approvalCounts()])
  const totalPages=Math.max(1,Math.ceil((counts.pendiente??0)/APPROVALS_PER_PAGE))
  return <main className="admin-screen"><div className="admin-card">
    <div className="admin-heading"><div><p className="login-eyebrow">ADMINISTRACIÓN GLOBAL · BIOBÍO</p><h1>Solicitudes de acceso</h1><p>Únicamente el administrador autoriza o rechaza nuevos usuarios y asigna el plan territorial correspondiente.</p></div><Link href="/panel">Ver región completa</Link></div>
    <div className="admin-toolbar"><p><strong>{counts.pendiente??0}</strong> pendientes · <strong>{counts.aprobado??0}</strong> autorizadas · <strong>{counts.rechazado??0}</strong> rechazadas</p><Link href="/admin/usuarios">Consultar todas las cuentas</Link></div>
    <ApprovalList items={pending}/>
    <div className="admin-pagination"><span>{page>1?<Link href={`/admin/solicitudes?page=${page-1}`}>← Anterior</Link>:null}</span><span>Página {page} de {totalPages}</span><span>{page<totalPages?<Link href={`/admin/solicitudes?page=${page+1}`}>Siguiente →</Link>:null}</span></div>
  </div></main>
}
