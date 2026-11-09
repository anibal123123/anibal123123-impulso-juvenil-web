import 'server-only'

/** Optional email delivery. Real email verification and password recovery require
 * RESEND_API_KEY and EMAIL_FROM (a verified sender domain). */
export const emailIsConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)

export async function sendAccountEmail(to: string, subject: string, text: string) {
  if (!emailIsConfigured) throw new Error('El servicio de correo no está configurado.')
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
    cache: 'no-store',
  })
  if (!result.ok) {
    // Do not include the provider response in logs: it may contain personal data.
    console.error('[auth] No fue posible enviar un correo de cuenta', result.status)
    throw new Error('No se pudo enviar el correo. Intenta nuevamente más tarde.')
  }
}
