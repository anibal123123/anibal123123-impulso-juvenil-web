import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { pool } from '@/lib/db'
import { approvedScope } from '@/lib/access'
import { sendAccountEmail, emailIsConfigured } from '@/lib/email'

// Better Auth persists accounts and sessions in PostgreSQL and hashes passwords
// with scrypt. Never store or log a plaintext password.
export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ?? 'http://localhost:3000'),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    autoSignIn: false, // Registro = solicitud pendiente. Nunca iniciar sesión automáticamente.
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: emailIsConfigured,
    revokeSessionsOnPasswordReset: true,
    ...(emailIsConfigured ? {
      sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
        await sendAccountEmail(user.email, 'Recupera tu contraseña - Impulso Juvenil',
          `Solicitaste restablecer tu contraseña. Abre este enlace: ${url}\n\nSi no lo solicitaste, ignora este mensaje.`)
      },
    } : {}),
  },
  ...(emailIsConfigured ? {
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
        await sendAccountEmail(user.email, 'Verifica tu correo - Impulso Juvenil',
          `Para verificar tu correo en Impulso Juvenil, abre: ${url}\n\nSi no creaste una cuenta, ignora este mensaje.`)
      },
    },
  } : {}),
  databaseHooks: {
    session: {
      create: {
        before: async (newSession) => {
          // Bloquea la creación de nuevas sesiones si la cuenta no está aprobada.
          // Además se valida el permiso en CADA petición protegida para revocación inmediata.
          const scope = await approvedScope(newSession.userId)
          if (!scope) {
            throw new APIError('FORBIDDEN', {
              message: 'La cuenta todavía no está aprobada o fue rechazada por el administrador.',
            })
          }
          return { data: newSession }
        },
      },
    },
  },
  hooks: {
    // Validate on the SERVER: bypassing the client cannot weaken the password policy.
    before: createAuthMiddleware(async ctx => {
      if (ctx.path === '/sign-up/email') {
        const name = ctx.body?.name
        const email = ctx.body?.email
        if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80)
          throw new APIError('BAD_REQUEST', { message: 'El nombre debe tener entre 2 y 80 caracteres.' })
        if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new APIError('BAD_REQUEST', { message: 'Ingresa un correo electrónico válido.' })
      }
      if (['/sign-up/email', '/reset-password', '/change-password'].includes(ctx.path)) {
        const password = ctx.path === '/sign-up/email' ? ctx.body?.password : ctx.body?.newPassword
        if (typeof password !== 'string' || password.length < 10 || password.length > 128 ||
          !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
          throw new APIError('BAD_REQUEST', {
            message: 'La contraseña debe tener 10 a 128 caracteres, con mayúscula, minúscula y número.',
          })
        }
      }
    }),
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
          ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
          ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
          ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
        ]
      : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  // Persistent throttling works across Vercel's serverless instances.
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 6 },
      '/sign-up/email': { window: 3600, max: 5 },
      '/request-password-reset': { window: 3600, max: 5 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          // Cross-site preview iframe in v0; never use these relaxed attributes on production.
          defaultCookieAttributes: { sameSite: 'none' as const, secure: true },
        },
      }
    : {}),
})
