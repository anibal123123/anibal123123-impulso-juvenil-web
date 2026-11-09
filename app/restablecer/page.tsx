import { Suspense } from 'react'
import { ResetPasswordForm } from "@/components/reset-password-form"
export default function Restablecer() { return <Suspense fallback={<main className="login-page">Cargando…</main>}><ResetPasswordForm /></Suspense> }
