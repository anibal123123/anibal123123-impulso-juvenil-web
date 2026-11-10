-- MIGRACIÓN ADITIVA - No borra tablas existentes de autenticación ni sus datos.
-- Ejecutar una vez en Neon / SQL Editor, base neondb.
-- La web recibe únicamente CONTADORES, no perfiles, RUT ni fichas clínicas.
CREATE TABLE IF NOT EXISTS "estadistica_municipal" (
  "id" serial PRIMARY KEY,
  "organismoId" text NOT NULL REFERENCES "organismo" ("id"),
  "periodo" date NOT NULL,
  "territorio" text NOT NULL,
  "metrica" text NOT NULL,
  "dimension" text NOT NULL,
  "categoria" text NOT NULL,
  "valor" integer NOT NULL CHECK ("valor" >= 0),
  "origen" text NOT NULL DEFAULT 'sintetico' CHECK ("origen" IN ('sintetico','importado')),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estadistica_municipal_unica
    UNIQUE ("organismoId", "periodo", "territorio", "metrica", "dimension", "categoria")
);
CREATE INDEX IF NOT EXISTS estadistica_municipal_org_periodo_idx
  ON "estadistica_municipal" ("organismoId", "periodo", "territorio");
