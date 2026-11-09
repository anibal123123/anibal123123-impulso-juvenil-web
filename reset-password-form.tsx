'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [done, setDone] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!token || busy) return
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) { setNotice('Usa al menos 10 caracteres con mayúscula, minúscula y número.'); return }
    if (password !== confirm) { setNotice('Las contraseñas no coinciden.'); return }
    setBusy(true); setNotice('')
    try {
      const { error } = await authClient.resetPassword({ token, newPassword: password })
      if (error) setNotice('No fue posible restablecer la contraseña. Solicita un enlace nuevo.')
      else { setDone(true); setPassword(''); setConfirm('') }
    } catch { setNotice('No se pudo completar la solicitud.') }
    finally { setBusy(false) }
  }
  return <main className="login-page"><section className="login-card"><p className="login-eyebrow">IMPULSO JUVENIL</p><h1>Restablecer contraseña</h1>
    {done ? <><p className="login-description">Contraseña actualizada. Inicia sesión nuevamente.</p><Link href="/">Volver al inicio</Link></> : !token ? <><p className="login-status error">El enlace de recuperación no es válido o ha caducado.</p><Link href="/">Solicitar otro enlace</Link></> : <form className="login-form" onSubmit={submit}><p className="login-description">Crea una nueva contraseña segura.</p><label htmlFor="new-pass">Nueva contraseña</label><input type="password" id="new-pass" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={e => setPassword(e.target.value)}/><label htmlFor="confirm-pass">Confirmar contraseña</label><input type="password" id="confirm-pass" autoComplete="new-password" required minLength={10} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)}/>{notice && <p className="login-status error" role="alert">{notice}</p>}<button className="primary-button login-submit" disabled={busy}>{busy?'Actualizando…':'Guardar nueva contraseña'}</button></form>}
  </section></main>
}
