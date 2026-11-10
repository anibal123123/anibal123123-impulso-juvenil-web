import { boolean, date, integer, jsonb, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const organismo = pgTable('organismo', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const membresia = pgTable('membresia', {
  userId: text('userId').primaryKey(),
  organismoId: text('organismoId').notNull(),
  rol: text('rol').notNull().default('analista'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const indicador = pgTable(
  'indicador',
  {
    id: serial('id').primaryKey(),
    organismoId: text('organismoId').notNull(),
    periodo: date('periodo').notNull(),
    territorio: text('territorio').notNull(),
    acompanados: integer('acompanados').notNull(),
    empleados: integer('empleados').notNull(),
    formacion: integer('formacion').notNull(),
    busqueda: integer('busqueda').notNull(),
    origen: text('origen').notNull().default('sintetico'),
    importKey: text('importKey'),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [unique().on(table.organismoId, table.periodo, table.territorio)],
)

export const reporte = pgTable('reporte', {
  id: text('id').primaryKey(),
  organismoId: text('organismoId').notNull(),
  userId: text('userId').notNull(),
  titulo: text('titulo').notNull(),
  formato: text('formato').notNull(),
  filtros: jsonb('filtros').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

// Estadísticas municipales minimizadas por mes, comuna y categoría. NO perfiles de personas.
// Las cuentas de acceso web permanecen en user/account/session; son conjuntos separados.
export const estadisticaMunicipal = pgTable(
  'estadistica_municipal',
  {
    id: serial('id').primaryKey(),
    organismoId: text('organismoId').notNull().references(() => organismo.id),
    periodo: date('periodo').notNull(),
    territorio: text('territorio').notNull(),
    metrica: text('metrica').notNull(),
    dimension: text('dimension').notNull(),
    categoria: text('categoria').notNull(),
    valor: integer('valor').notNull(),
    origen: text('origen').notNull().default('sintetico'),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [unique().on(table.organismoId,table.periodo,table.territorio,table.metrica,table.dimension,table.categoria)],
)
