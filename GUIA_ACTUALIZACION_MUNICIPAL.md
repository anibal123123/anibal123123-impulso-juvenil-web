# Impulso Juvenil — actualización del portal municipal (noviembre de 2026)

## 1. Qué cambió

- **No se modificaron las tablas de autenticación** `user`, `account`, `session`, `verification` ni la política de contraseñas.
- El prototipo web ahora muestra **información municipal agregada** sobre profesionales con rol social, beneficiarios vulnerables, empleabilidad y bolsa de trabajo.
- La demostración incluye **exactamente 1.000 beneficiarios ficticios**, **56 profesionales ficticios** y **220 ofertas laborales ficticias**, distribuidos en enero–octubre de 2026 y seis comunas ilustrativas de la Región del Biobío.
- Los datos de los beneficiarios se generan en `scripts/fixtures/beneficiarios-1000.json` y se convierten en `data/demo-aggregates.json`. El navegador y los reportes consumen **solo los agregados**, nunca fichas individuales.
- Se agregaron las secciones *Beneficiarios*, *Profesionales* y *Bolsa de trabajo* al portal, y se redefinieron los indicadores de Empleabilidad, Territorios y Reportes.
- Los informes PDF y Excel **solo exportan indicadores agrupados**. El Excel incluye desgloses por comuna, profesión, educación, edad, barrera laboral, ofertas y una pestaña de métricas agregadas.
- `/demo` utiliza las estadísticas locales simuladas. `/panel`, cuando hay una cuenta autenticada asociada mediante `membresia` a un `organismo`, consulta los agregados de Neon para ese organismo. Si la cuenta no tiene municipio asignado, solo muestra la demostración.
- El importador `/api/municipal/import` acepta exclusivamente CSV de estadísticas agregadas y exige `membresia.rol = 'admin'` o `'administrador'`; una municipalidad no puede consultar la de otra a través de `/api/municipal/indicadores`.

## 2. Cómo subir los cambios al repositorio

Este ZIP es un **proyecto completo**, no un parche. Haz una copia del repositorio antes de reemplazar la versión en GitHub; usa una rama de pruebas o el procedimiento de GitHub Desktop para conservar la estructura `app/`, `components/`, `lib/`, `data/`, `scripts/`.

No subas un `.env.local`, contraseñas ni claves reales a GitHub. La configuración actual de Neon y de `BETTER_AUTH_SECRET` en Vercel debe **conservarse**.

## 3. Mostrar los 1.000 beneficiarios sin conectarse a Neon

No hace falta ejecutar SQL para `/demo`. El archivo `data/demo-aggregates.json` ya fue generado desde los 1.000 perfiles sintéticos. Cuando publiques el código actualizado, entra a `/demo`: la cifra de "Personas incorporadas" para todas las comunas y enero–octubre será **1.000**.

Si necesitas regenerarlos con la misma semilla determinista:

```bash
npm run demo:generate
npm run demo:verify
```

Los archivos de simulación no contienen nombres, RUT, correos, diagnósticos ni contraseñas.

## 4. Cargar los indicadores de prueba en Neon (`neondb`)

**Nota**: desde este ZIP no se puede escribir directamente en tu Neon. Este paso requiere ejecutar SQL dentro de tu proyecto Neon. No pegues credenciales de conexión en el chat.

1. Abre Neon y el proyecto PostgreSQL que ya vinculaste a Vercel.
2. En SQL Editor, confirma que estás en la **base correcta** (`SELECT current_database();`) y que existe la tabla `organismo`.
3. Ejecuta **`scripts/02-municipal-analytics.sql`**. Crea únicamente `estadistica_municipal`, sin borrar ni alterar las tablas antiguas.
4. Ejecuta **`scripts/03-seed-demo-1000.sql`**. Crea seis organismos de **demostración** e inserta **2.083 filas de indicadores agregados** correspondientes a los 1.000 beneficiarios, 56 profesionales y 220 ofertas. Las múltiples filas de indicadores NO representan 2.083 personas.
5. El SQL usa `ON CONFLICT DO UPDATE`: si lo vuelves a ejecutar no duplica esas cifras. **No borra** cuentas de usuario, sesiones ni datos anteriores.
6. Comprueba las cargas con estas consultas de solo lectura:

```sql
SELECT "metrica", SUM("valor") AS total
FROM "estadistica_municipal"
WHERE "organismoId" LIKE 'demo-muni-%'
  AND "dimension" = 'resumen' AND "categoria" = 'total'
GROUP BY "metrica" ORDER BY "metrica";
```

Totales esperados: `beneficiarios = 1000`, `sin_empleo_inicial = 871`, `contrataciones = 245`, `profesionales = 56`, `ofertas = 220`.

```sql
SELECT o."nombre", SUM(e."valor") AS beneficiarios
FROM "estadistica_municipal" e
JOIN "organismo" o ON o."id"=e."organismoId"
WHERE e."metrica"='beneficiarios'
  AND e."dimension"='resumen' AND e."categoria"='total'
  AND e."origen"='sintetico'
GROUP BY o."nombre" ORDER BY o."nombre";
```

## 5. Ver los datos de Neon en el panel privado

**Las cuentas web no son los profesionales registrados en la aplicación móvil.** Son cuentas de acceso institucional. El registro público de Better Auth por sí solo no otorga acceso a datos municipales.

1. Registra e inicia sesión con tu cuenta de acceso al portal web.
2. Desde SQL Editor ejecuta `SELECT "id", "email" FROM "user";` e identifica tu `id` real.
3. Selecciona el municipio de prueba al que debe tener acceso esa cuenta. Los IDs creados son:

| ID | Comuna de prueba |
|---|---|
| demo-muni-1 | Concepción |
| demo-muni-2 | Chiguayante |
| demo-muni-3 | Talcahuano |
| demo-muni-4 | Hualpén |
| demo-muni-5 | San Pedro de la Paz |
| demo-muni-6 | Hualqui |

4. **Solo como administrador de la base de datos**, asigna tu usuario a un único organismo, sustituyendo el ID de ejemplo:

```sql
INSERT INTO "membresia" ("userId", "organismoId", "rol")
VALUES ('ID_REAL_DE_TU_CUENTA', 'demo-muni-1', 'administrador')
ON CONFLICT ("userId") DO UPDATE
  SET "organismoId" = EXCLUDED."organismoId", "rol" = EXCLUDED."rol";
```

5. Si existe `DATABASE_URL` correcta en las variables de Vercel, vuelve a desplegar la aplicación. Al entrar a `/panel`, el código debe consultar Neon para ese municipio. La vista de `/demo` seguirá mostrando los **seis municipios** como demostración pública.

**Diferente de `ADMIN_USER_IDS`**: la variable `ADMIN_USER_IDS` controla quién puede consultar las **cuentas web registradas** en `/admin/usuarios`; `membresia` controla el **ámbito municipal** de `/panel` y sus API. No confundas los permisos.

## 6. Importación posterior desde la aplicación móvil

La web no recibe fichas completas de personas vulnerables. Un backend de integración debe convertir los registros móviles en filas con estas columnas CSV:

`periodo,territorio,metrica,dimension,categoria,valor`

Por ejemplo:

```csv
periodo,territorio,metrica,dimension,categoria,valor
2026-11,Concepción,beneficiarios,resumen,total,40
2026-11,Concepción,sin_empleo_inicial,resumen,total,32
2026-11,Concepción,contrataciones,resumen,total,8
2026-11,Concepción,profesionales,profesion,Trabajo social,4
2026-11,Concepción,ofertas,sector_oferta,Comercio,9
```

Los agregados se importan desde **Reportes → Importar CSV**, disponible solo a usuarios municipales autorizados, o mediante `POST /api/municipal/import` con una sesión válida y autorización. La API valida formato, periodo, rol e identidad territorial, y actualiza valores por clave compuesta.

Este contrato permite incorporar categorías y nuevas comunas sin reprogramar el dashboard, pero se deben acordar definiciones con el equipo que mantiene la app móvil para evitar dobles conteos.

## 7. Definiciones importantes

- **Personas incorporadas**: beneficiarios únicos según mes de alta de su cohorte. En este test cada persona aparece una sola vez.
- **Sin empleo inicial**: beneficiarios que ingresaron sin empleo.
- **Contrataciones confirmadas**: personas que ingresaron sin empleo y cuyo empleo posterior fue confirmado. Es un conteo de personas, no de contratos repetidos.
- **Tasa de inserción**: contrataciones confirmadas de la cohorte / personas sin empleo al ingreso, por 100. En el test: **245 / 871 = 28,1 %**.
- **Empleo actual**: todas las personas de la cohorte con empleo al cierre de la simulación, incluidas las que ya trabajaban al inicio; no es lo mismo que una inserción.
- **Postulaciones y entrevistas**: cantidades de eventos, no beneficiarios únicos.
- **Profesionales incorporados**: nuevas altas profesionales en el periodo; no equivale al número de profesionales simultáneamente activos.
- **Ofertas publicadas**: vacantes publicadas en el periodo, no necesariamente vigentes.
- **Periodo**: para beneficiarios, mes de incorporación; para profesionales, mes de registro; para ofertas, mes de publicación. Los resultados de empleabilidad de cada cohorte se consideran al cierre de octubre de 2026.

## 8. Alcances y precauciones

- Los 1.000 perfiles y todas las cifras son **inventados**. No son resultados de una municipalidad real.
- No se ha desplegado el ZIP directamente a tu GitHub/Vercel ni escrito los datos en tu Neon desde esta sesión. Debes subir el proyecto y ejecutar los SQL descritos.
- El diseño incluye control de acceso por organización, pero el backend de la app móvil no está conectado automáticamente. Los datos reales se integrarán mediante el contrato de indicadores.
- Para datos reales, aplica evaluaciones de privacidad, seguridad, control de pertenencia municipal y **supresión de grupos muy pequeños**. Actualmente el demo sintético permite ver conteos pequeños; no debe usarse sin cambios para información social sensible.
- Mantén la gestión de permisos, protección de información sensible y finalidad del tratamiento conforme a la normativa chilena aplicable.
