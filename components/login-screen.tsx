'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, Leaf, LockKeyhole, Mail, UserPlus } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

type Mode = 'login' | 'register' | 'recovery'

function friendlyError(error: { code?: string; message?: string } | null | undefined) {
  switch (error?.code) {
    case 'USER_ALREADY_EXISTS': return 'Este correo ya está registrado. Inicia sesión.'
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_CREDENTIALS': return 'Correo o contraseña incorrectos.'
    case 'EMAIL_NOT_VERIFIED': return 'Debes verificar tu correo antes de iniciar sesión.'
    case 'TOO_MANY_REQUESTS': return 'Demasiados intentos. Vuelve a intentarlo más tarde.'
    default: return error?.message || 'No fue posible completar la operación.'
  }
}

export function LoginScreen({ emailEnabled = false }: { emailEnabled?: boolean }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const changeMode = (next: Mode) => { setMode(next); setError(''); setSuccess(''); setPassword(''); setConfirm('') }
  const heading = mode === 'register' ? 'Crea tu cuenta' : mode === 'recovery' ? 'Recupera tu contraseña' : 'Bienvenido de nuevo'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (mode === 'recovery') {
        if (!emailEnabled) { setError('La recuperación por correo aún no está configurada.'); return }
        const { error } = await authClient.requestPasswordReset({ email: normalizedEmail, redirectTo: `${window.location.origin}/restablecer` })
        if (error) throw error
        setSuccess('Si existe una cuenta con ese correo, recibirás un enlace de recuperación.')
        return
      }
      if (mode === 'register') {
        if (name.trim().length < 2 || name.trim().length > 80) { setError('El nombre debe tener entre 2 y 80 caracteres.'); return }
        if (password.length < 10 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
          setError('Usa de 10 a 128 caracteres, con mayúscula, minúscula y número.'); return
        }
        if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
        const { error } = await authClient.signUp.email({ name: name.trim(), email: normalizedEmail, password, callbackURL: '/cuenta' })
        if (error) throw error
        setPassword(''); setConfirm('')
        setSuccess(emailEnabled
          ? 'Solicitud recibida. Verifica tu correo y espera la autorización del administrador. No podrás iniciar sesión antes de su aprobación.'
          : 'Solicitud de registro recibida. Un administrador debe autorizar tu cuenta, asignar el plan y territorio antes de que puedas ingresar.')
      } else {
        const { error } = await authClient.signIn.email({ email: normalizedEmail, password })
        if (error) throw error
        router.replace('/panel'); router.refresh()
      }
    } catch (err) {
      setError(friendlyError(err as { code?: string; message?: string }))
    } finally { setBusy(false) }
  }

  return <main className="login-page">
    <header className="login-brand"><span><Leaf size={25} /></span><div>impulso<br />juvenil<span>.</span></div></header>
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-symbol">{mode === 'register' ? <UserPlus size={23} /> : mode === 'recovery' ? <Mail size={23} /> : <LockKeyhole size={23} />}</div>
      <p className="login-eyebrow">PORTAL INSTITUCIONAL</p>
      <h1 id="login-title">{heading}</h1>
      <p className="login-description">{mode === 'register' ? 'Solicita acceso institucional. La cuenta estará pendiente hasta que el administrador asigne tu plan y territorio.' : mode === 'recovery' ? 'Te enviaremos un enlace para crear una contraseña nueva.' : 'Ingresa con una cuenta autorizada por el administrador para acceder únicamente a los datos de tu territorio.'}</p>
      <form className="login-form" onSubmit={submit}>
        {mode === 'register' && <><label htmlFor="register-name">Nombre completo</label><input id="register-name" name="name" type="text" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} autoComplete="name" placeholder="Tu nombre y apellido" required /></>}
        <label htmlFor="login-email">Correo electrónico</label>
        <input id="login-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={254} placeholder="correo@ejemplo.cl" required />
        {mode !== 'recovery' && <>
          <label htmlFor="login-password">Contraseña</label>
          <div className="login-password"><input id="login-password" name="password" type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 10 : undefined} maxLength={128} placeholder="Ingresa tu contraseña" required /><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          {mode === 'register' && <>
            <p className="password-hint">Mínimo 10 caracteres, una mayúscula, una minúscula y un número.</p>
            <label htmlFor="login-confirm">Confirma tu contraseña</label>
            <input id="login-confirm" name="confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={10} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite la contraseña" required />
          </>}
          {mode === 'login' && <button className="login-recovery" type="button" onClick={() => changeMode('recovery')}>¿Olvidaste tu contraseña?</button>}
        </>}
        <button className="primary-button login-submit" type="submit" disabled={busy || (mode === 'recovery' && !emailEnabled)}>{busy ? 'Procesando…' : mode === 'register' ? 'Crear cuenta' : mode === 'recovery' ? 'Enviar enlace' : 'Iniciar sesión'}</button>
        {mode === 'recovery' && !emailEnabled && <p className="login-status">El envío de correos aún no está configurado. Solicita ayuda al administrador.</p>}
        {error && <p className="login-status error" role="alert">{error}</p>}
        {success && <p className="login-status success" role="status">{success}</p>}
      </form>
      {mode === 'recovery' ? <button type="button" className="login-back" onClick={() => changeMode('login')}><ArrowLeft size={15} /> Volver a iniciar sesión</button> : <div className="login-demo">
        <span>{mode === 'register' ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}</span>
        <button className="login-link-button" type="button" onClick={() => changeMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Iniciar sesión' : 'Crear una cuenta'}</button>
        <span>El acceso a las estadísticas requiere autorización administrativa.</span>
        <small>El administrador asigna los niveles municipal, provincial o regional.</small>
      </div>}
    </section>
    <footer className="login-footer">Más oportunidades. Un mejor futuro.<span>Impulso Juvenil · Portal institucional</span></footer>
  </main>
}
