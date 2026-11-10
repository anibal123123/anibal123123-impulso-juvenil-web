-- Impulso Juvenil: acceso institucional por plan y aprobación administrativa.
-- ADITIVO: conserva las tablas user, account, session, organismo, membresia, reporte.
-- EJECUTAR ANTES de desplegar el código de portal v3.
BEGIN;
CREATE TABLE IF NOT EXISTS public.portal_acceso (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  plan text CHECK (plan IN ('municipal','provincial','regional')),
  territorio text,
  autorizado_por text REFERENCES public."user"(id) ON DELETE SET NULL,
  autorizado_en timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portal_acceso_completo CHECK (
    (estado = 'aprobado' AND plan IS NOT NULL AND territorio IS NOT NULL)
    OR (estado <> 'aprobado' AND plan IS NULL AND territorio IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS portal_acceso_estado_fecha_idx ON public.portal_acceso(estado, creado_en DESC);
-- El trigger se ejecuta siempre que Better Auth cree un usuario.
CREATE OR REPLACE FUNCTION public.impulso_solicitud_pendiente()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.portal_acceso (user_id, estado)
  VALUES (NEW.id, 'pendiente')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS impulso_registro_pendiente ON public."user";
CREATE TRIGGER impulso_registro_pendiente
  AFTER INSERT ON public."user" FOR EACH ROW
  EXECUTE FUNCTION public.impulso_solicitud_pendiente();
-- Los usuarios EXISTENTES no heredan acceso automáticamente.
INSERT INTO public.portal_acceso(user_id, estado)
SELECT u.id,'pendiente' FROM public."user" u
ON CONFLICT (user_id) DO NOTHING;
COMMIT;
-- El administrador se designa mediante ADMIN_USER_ID en Vercel, NUNCA por inscripción web.
-- Después de ejecutar, verifica:
-- SELECT estado, count(*) FROM portal_acceso GROUP BY estado;
