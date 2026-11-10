import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin'
import { listUsers, USERS_PER_PAGE } from '@/lib/users'
import { Download, Search, ShieldCheck, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminUsuarios({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const admin = await getAdminSession()
  if (admin.status === 401) redirect('/')
  if (admin.status === 403) return <main className="admin-screen"><div className="admin-card"><h1>Acceso restringido</h1><p>Tu cuenta no tiene permisos de administrador.</p><Link href="/cuenta">Volver a mi cuenta</Link></div></main>

  const params = await searchParams
  const query = (params.q ?? '').slice(0, 100)
  const page = Math.max(1, Math.min(100000, parseInt(params.page ?? '1', 10) || 1))
  const { items, total } = await listUsers(query, page)
  const maxPage = Math.max(1, Math.ceil(total / USERS_PER_PAGE))
  const buildLink = (n: number) => `/admin/usuarios?q=${encodeURIComponent(query)}&page=${n}`

  return <main className="admin-screen"><div className="admin-card">
    <div className="admin-heading"><div><p className="login-eyebrow">ADMINISTRACIÓN · IMPULSO JUVENIL</p><h1><Users size={26} /> Usuarios registrados</h1><p>Consulta privada de cuentas. Las contraseñas nunca son visibles.</p></div><Link href="/admin/solicitudes">Solicitudes pendientes</Link></div>
    <div className="admin-toolbar"><form method="get" action="/admin/usuarios"><label htmlFor="buscar-usuario" className="sr-only">Buscar por nombre o correo</label><Search size={17}/><input id="buscar-usuario" name="q" placeholder="Buscar por nombre o correo…" defaultValue={query} maxLength={100} /><button className="primary-button" type="submit">Buscar</button></form><a className="primary-button" href={`/api/admin/usuarios?format=csv&q=${encodeURIComponent(query)}`}><Download size={16}/>Descargar CSV</a></div>
    <p className="admin-count"><ShieldCheck size={16}/> {total} {total === 1 ? 'registro encontrado' : 'registros encontrados'} · Página {Math.min(page, maxPage)} de {maxPage}</p>
    <div className="admin-table"><table><thead><tr><th>Nombre</th><th>Correo electrónico</th><th>Fecha de registro</th><th>Correo verificado</th><th>Estado</th><th>Plan</th><th>Territorio</th><th>ID</th></tr></thead><tbody>{items.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{new Date(u.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Santiago' })}</td><td>{u.emailVerified ? 'Sí' : 'No'}</td><td>{u.estado}</td><td>{u.plan??'Sin asignar'}</td><td>{u.territorio??'—'}</td><td><code>{u.id}</code></td></tr>)}{!items.length && <tr><td colSpan={8}>No se encontraron usuarios.</td></tr>}</tbody></table></div>
    <div className="admin-pagination">{page > 1 ? <Link href={buildLink(page - 1)}>← Anterior</Link> : <span/>}<span>{page} / {maxPage}</span>{page < maxPage ? <Link href={buildLink(page + 1)}>Siguiente →</Link> : <span/>}</div>
  </div></main>
}
