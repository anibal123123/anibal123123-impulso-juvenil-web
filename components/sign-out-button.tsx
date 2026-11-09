'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  return <button type="button" className="primary-button" disabled={busy} onClick={async () => {
    setBusy(true)
    try { await authClient.signOut(); router.replace('/'); router.refresh() }
    finally { setBusy(false) }
  }}><LogOut size={16} />{busy ? 'Cerrando…' : 'Cerrar sesión'}</button>
}
