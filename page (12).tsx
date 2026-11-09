import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isAdminUserId } from '@/lib/admin'
import { SignOutButton } from '@/components/sign-out-button'
import { ShieldCheck, Leaf, ArrowUpRight, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CuentaPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/')
  const { user } = session
  return <main className="account-page">
    <div className="account-card">
      <div className="account-brand"><Leaf size={25} /> impulso juvenil.</div>
      <p className="login-eyebrow">MI CUENTA</p>
      <h1>¡Hola, {user.name}!</h1>
      <p className="account-muted">Tu sesión se inició correctamente. Tu registro está guardado en la base de datos de Impulso Juvenil.</p>
      <div className="account-details"><p><strong>Nombre</strong><span>{user.name}</span></p><p><strong>Correo</strong><span>{user.email}</span></p><p><strong>Registro</strong><span>{new Date(user.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Santiago' })}</span></p></div>
      <div className="account-actions"><Link href="/panel" className="account-action"><ShieldCheck size={18} /> Abrir mi panel <ArrowUpRight size={16}/></Link>
        {isAdminUserId(user.id) && <Link href="/admin/usuarios" className="account-action"><Users size={18}/> Ver usuarios registrados <ArrowUpRight size={16}/></Link>}
      </div>
      <SignOutButton />
    </div>
  </main>
}
