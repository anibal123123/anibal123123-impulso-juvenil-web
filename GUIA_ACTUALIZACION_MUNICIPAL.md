# Impulso Juvenil · V3 — planes territoriales, aprobación y 10.000 beneficiarios ficticios

## Qué incorpora

- **Municipal:** solo indicadores de **una comuna** del Biobío.
- **Provincial:** solo las comunas de **una provincia** (Arauco: 7, Biobío: 14, Concepción: 12).
- **Regional:** las 33 comunas de la Región del Biobío, con comparación y filtros por provincia.
- **Administrador único:** acceso a las 33 comunas, aprobación/rechazo de solicitudes y asignación de nivel y territorio.
- **Registro:** las nuevas cuentas se crean en estado `pendiente`, **sin sesión**. El administrador decide `aprobado` o `rechazado` y solo las aprobadas pueden iniciar sesión. La verificación de correo, si está configurada, continúa siendo necesaria.
- **Datos de ejemplo:** preserva los 1.000 beneficiarios antiguos y agrega **9.000**, para **10.000 en total**; 220 profesionales y 1.200 ofertas. La web y Neon solo utilizan estadísticas agregadas; los 9.000 perfiles ficticios adicionales están bajo `scripts/fixtures/` para pruebas/reproducción. No se crean 10.000 usuarios web.
- **Autenticación existente:** Better Auth y tablas `user`, `account`, `session` conservadas.

**No implementa cobros, pasarelas de pago ni verificación automática de suscripciones.** El plan es un permiso que otorga manualmente el administrador, acorde al prototipo académico.

## Orden obligatorio para actualizar sin perder acceso

**1. Respalda Neon.** Realiza un respaldo/snapshot de la base antes de las migraciones y verifica que el entorno de Vercel apunte al proyecto correcto `neondb`. Haz la actualización de código en una rama de prueba de GitHub, no sobrescribas producción sin probar.

**2. Prepara tu administrador único ANTES de publicar el código.** Debe ser una cuenta de acceso web REAL y existente en `user`, no una cuenta ficticia. Desde Neon → SQL Editor, ejecuta:

```sql
SELECT "id", "name", "email" FROM "user" ORDER BY "createdAt";
```

Identifica **tu cuenta** y copia su `id` (no es la contraseña). En Vercel → proyecto web → Settings → Environment Variables, crea:

```
ADMIN_USER_ID=EL_ID_EXACTO_DE_TU_CUENTA
```

Configúralo para `Production` y para el entorno `Preview` que usarás en la prueba. Es una variable **solo de servidor**: no uses `NEXT_PUBLIC_`. Si existe `ADMIN_USER_IDS` antigua, elimina esa variable después de configurar la nueva para evitar confusiones. **Debe haber exactamente un ID de administrador.** El portal no dispone de un registro público de administradores.

**3. Ejecuta migración en Neon → SQL Editor → `neondb`:**

- `scripts/02-municipal-analytics.sql` **solo si todavía no existe** `estadistica_municipal` (el script es aditivo e idempotente para una instalación normal).
- `scripts/04-accesos-territoriales.sql`: añade `portal_acceso`, las restricciones, un trigger que registra las cuentas nuevas como pendientes y las cuentas existentes que aún no tienen solicitud. No borra usuarios ni sesiones.

La migración de permisos debe ejecutarse ANTES de desplegar el nuevo código porque todas las consultas protegidas comprobarán `portal_acceso`. Las cuentas existentes, salvo la única de administrador designada, comenzarán pendientes y requerirán revisión.

**4. Actualiza el repositorio desde GitHub Desktop**: crea una rama `accesos-territoriales-v3`, abre `Repository → Show in Explorer`, copia el contenido del ZIP completo **manteniendo carpetas** (`app`, `components`, `lib`, `scripts`, etc.), confirma el commit y pulsa `Publish branch`. En Vercel prueba el despliegue de esa rama. La nueva versión de `/demo` redirige al panel y requiere autorización: no hay acceso público a todos los datos.

**5. Carga las estadísticas ficticias** en Neon (mismo proyecto `neondb`):

1. `scripts/05-demo-concepcion.sql`
2. `scripts/06-demo-biobio.sql`
3. `scripts/07-demo-arauco.sql`

Cada archivo cubre una provincia. Son `UPSERT`: se pueden volver a ejecutar sin duplicar filas para la misma combinación de comuna, periodo y categoría. **Solo actualizan filas cuyo origen previo sea `sintetico`**; si ya importaste datos reales (`importado`), se conservan y los totales pueden diferir de la muestra. El SQL crea los 33 organismos ficticios de muestra, conservando los IDs antiguos de las seis comunas originales. No modifica contraseñas ni cuentas.

La base recibe **12.237 filas de indicadores agregados**, NO 10.000 cuentas ni 10.000 fichas personales. Cada fila tiene mes, comuna, indicador, dimensión, categoría y cantidad. Las filas representan de forma agregada exactamente 10.000 beneficiarios, 220 profesionales y 1.200 ofertas ficticias.

**6. Verifica en Neon:**

```sql
SELECT count(DISTINCT "territorio") AS comunas,
       sum("valor") FILTER (WHERE "metrica"='beneficiarios'
                                AND "dimension"='resumen' AND "categoria"='total') AS beneficiarios,
       sum("valor") FILTER (WHERE "metrica"='profesionales'
                                AND "dimension"='resumen' AND "categoria"='total') AS profesionales,
       sum("valor") FILTER (WHERE "metrica"='ofertas'
                                AND "dimension"='resumen' AND "categoria"='total') AS ofertas
FROM "estadistica_municipal"
WHERE "origen"='sintetico' AND "organismoId" LIKE 'demo-muni-%';
```

Esperado, si no había otros datos sintéticos: `33` comunas, `10000` beneficiarios, `220` profesionales, `1200` ofertas.

Para ver cuentas pendientes:

```sql
SELECT pa.estado, count(*)
FROM portal_acceso pa
GROUP BY pa.estado ORDER BY pa.estado;
```

**7. Publica la rama validada** mediante Pull Request hacia `main`; espera el despliegue **Ready**. Abre `https://TU-DOMINIO/admin/solicitudes` con el administrador. Allí asignas cada cuenta:

- Municipal → una de las 33 comunas.
- Provincial → Arauco, Biobío o Concepción.
- Regional → Región del Biobío.

Al confirmar se almacena `plan`, `territorio`, `autorizado_por` y `autorizado_en`; la acción se valida en el **servidor**, no en el navegador. Otra opción es rechazar la solicitud; las cuentas rechazadas no pueden iniciar sesión. En `/admin/usuarios` están todas las cuentas con su estado y la descarga CSV, sin contraseñas.

**8. Pruebas funcionales**

1. Registra una segunda cuenta de prueba desde el formulario público. Debe ver “Solicitud recibida” y **no entrar al panel**.
2. Intenta iniciar sesión con esa cuenta. No debe crearse sesión ni permitir `/panel` o `/api/municipal/indicadores`.
3. Desde la cuenta administrador entra en `/admin/solicitudes`, autoriza esa cuenta con plan **Municipal → Chiguayante**.
4. Inicia sesión con ella: `/panel` debe mostrar **solo Chiguayante**; `/api/municipal/indicadores` y los reportes descargados también deben limitarse a Chiguayante.
5. Haz pruebas con otra cuenta **Provincial → Arauco**, que debe ver 7 comunas, y una **Regional**, que debe ver las 33.
6. Comprueba que el administrador ve las 33 y puede procesar solicitudes; un usuario normal no puede abrir `/admin/solicitudes` ni invocar sus API.
7. Prueba cambiar o eliminar sesiones antiguas: ningún endpoint de estadísticas debe funcionar sin un permiso aprobado.

**9. Evita confundir roles y datos:** `user` son cuentas institucionales de la web; los profesionales y beneficiarios de la app móvil son conjuntos separados. Los 10.000 perfiles son exclusivamente prueba, no se están recibiendo desde la app móvil. No existe sincronización automática móvil→web ni validación de pagos en esta versión.

## Archivos principales

| Archivo | Función |
|---|---|
| `lib/geography.ts` | 33 comunas, 3 provincias y validación territorial |
| `lib/access.ts`, `lib/session.ts` | Admin único y permisos de consulta |
| `lib/auth.ts` | Registro sin auto-login; bloquea sesiones no aprobadas |
| `app/admin/solicitudes/page.tsx` | Pantalla privada para solicitudes pendientes |
| `app/api/admin/solicitudes/[id]/route.ts` | Aprobación/rechazo mediante POST autenticado |
| `lib/municipal-server.ts` | Filtrado de datos ANTES de devolver resultados |
| `scripts/04-accesos-territoriales.sql` | Migración de solicitudes y trigger |
| `scripts/05-demo-concepcion.sql`, `06-demo-biobio.sql`, `07-demo-arauco.sql` | Carga provincial de agregados |
| `scripts/generate-synthetic-data.mjs` | Reproducción determinista de los 9.000 registros nuevos |

## Pruebas ejecutadas en preparación

- `node scripts/generate-synthetic-data.mjs` → genera la muestra.
- `node scripts/verify-demo.mjs` → valida 10.000 beneficiarios, 33 comunas, 220 profesionales, 1.200 ofertas, contrataciones coherentes y ausencia de datos personales en agregados.
- Verificación de sintaxis TypeScript/TSX de los archivos del proyecto.
- Comprobación de límites de 1, 7, 12, 14 y 33 comunas según plan.

**Pendiente de prueba en tu entorno:** compilación completa `npm run build`, ejecución de SQL en Neon y pruebas reales de registro, autorización e inicio de sesión. El entorno donde se generó el paquete no pudo instalar dependencias; no se afirma que la versión ya esté publicada ni que la BD remota haya cambiado.
