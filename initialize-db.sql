-- Impulso Juvenil · PostgreSQL
-- Ejecutar UNA vez sobre la base DATABASE_URL mediante el editor SQL del proveedor.
-- Compatible con el esquema incluido en lib/db/schema.ts.
-- Mejor práctica: en instalaciones existentes revisar migraciones antes de aplicar.

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- Limitador de intentos de Better Auth: almacena contadores en PostgreSQL,
-- no en RAM efímera de funciones serverless.
CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "lastRequest" bigint NOT NULL
);

-- Las tablas siguientes ya estaban declaradas en el proyecto.
-- Se incluyen para que las API existentes puedan utilizarse más adelante.
CREATE TABLE IF NOT EXISTS "organismo" (
  "id" text PRIMARY KEY,
  "nombre" text NOT NULL,
  "region" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "membresia" (
  "userId" text PRIMARY KEY,
  "organismoId" text NOT NULL,
  "rol" text NOT NULL DEFAULT 'analista',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "indicador" (
  "id" serial PRIMARY KEY,
  "organismoId" text NOT NULL,
  "periodo" date NOT NULL,
  "territorio" text NOT NULL,
  "acompanados" integer NOT NULL,
  "empleados" integer NOT NULL,
  "formacion" integer NOT NULL,
  "busqueda" integer NOT NULL,
  "origen" text NOT NULL DEFAULT 'sintetico',
  "importKey" text,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE("organismoId", "periodo", "territorio")
);
CREATE TABLE IF NOT EXISTS "reporte" (
  "id" text PRIMARY KEY,
  "organismoId" text NOT NULL,
  "userId" text NOT NULL,
  "titulo" text NOT NULL,
  "formato" text NOT NULL,
  "filtros" jsonb NOT NULL,
  "snapshot" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
