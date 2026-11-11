# Impulso Juvenil · v4 · Detector inteligente de brechas laborales

## 1. Qué se implementó

Se agregó la sección **Detector de brechas** al menú del portal territorial. Usa los mismos filtros existentes de periodo y comuna/provincia y muestra:

- Participación porcentual por área de interés de los beneficiarios y sector de las publicaciones de empleo.
- Señales de **interés relativamente alto**, **oferta relativamente alta**, **interés sin publicaciones**, **publicaciones sin interés registrado** o **distribuciones similares**.
- Barras comparativas, selección de sector y recomendaciones redactadas por reglas, no por una IA generativa.
- Un dato transversal sobre necesidad de capacitación, si la distribución de barreras está completa.
- Exportación de diagnóstico CSV; hoja **Detector de brechas** en el Excel habitual y página de diagnóstico en el PDF habitual.
- Tratamiento preventivo de recuentos de entre 1 y 4, que no se desglosan por sector en el detector.

**Alcance:** la comparación es descriptiva. Una publicación no equivale necesariamente a una vacante disponible, y una persona interesada no implica que cumpla los requisitos. No calcula empleos creados, decisiones individuales ni predice contrataciones.

## 2. Cómo se obtiene cada señal

Para cada sector y selección territorial/temporal:

- **% interés** = personas registradas con interés por el sector / total de personas con interés registrado × 100.
- **% publicaciones** = publicaciones del sector / total de publicaciones registradas × 100.
- **Índice relativo** = (% publicaciones) / (% interés).

Si ambos recuentos son suficientes (al menos cinco o cero), el algoritmo usa estas reglas:

- Índice menor que **0,80**: el sector ocupa relativamente **más espacio en las preferencias que en las publicaciones**.
- Índice mayor que **1,20**: el sector ocupa relativamente **más espacio en las publicaciones que en las preferencias**.
- Entre 0,80 y 1,20: distribuciones relativamente similares.
- Sin publicaciones o sin intereses: lo indica explícitamente.
- Si alguno de los recuentos es de 1 a 4: no presenta ese desglose.

Estos umbrales son parámetros **heurísticos** elegidos para un prototipo académico, no un estándar laboral ni un criterio de inversión pública. Las orientaciones son propuestas que el municipio debe contrastar con antecedentes adicionales.

## 3. Seguridad y permisos

El detector recibe datos por medio de `app/panel/page.tsx`, que llama a `requireMemberPage()` y después a `getMunicipalMetrics(member.allowedTerritories)`. Por ello:

- Usuario **municipal**: una comuna.
- Usuario **provincial**: solo las comunas de su provincia.
- Usuario **regional**: las 33 comunas de la Región del Biobío.
- **ADMIN_USER_ID**: acceso al total regional.
- Cuenta no aprobada: sin acceso a `/panel` ni al detector.

La interfaz no toma territorio de una dirección web sin pasar por el filtrado autorizado del servidor. No hay una API pública nueva. Los datos individuales de `scripts/fixtures/` siguen siendo únicamente archivos de prueba, no se envían al navegador.

## 4. Archivos modificados

| Ruta | Cambio |
|---|---|
| `lib/labor-gaps.ts` | Algoritmo reproducible de evaluación de diferencias sectoriales |
| `components/labor-gap-detector.tsx` | Interfaz interactiva y CSV |
| `components/dashboard.tsx` | Nueva opción en el menú y conexión a los filtros existentes |
| `app/globals.css` | Estilos adaptables a móvil/escritorio |
| `lib/export-report.ts` | Inclusión de diagnóstico en Excel y PDF |
| `scripts/verify-detector.mjs` | Pruebas automáticas |
| `package.json` | Nuevo comando de verificación |

## 5. Actualizar con GitHub Desktop

**Recomendado:** usa el ZIP `impulso-juvenil-v4-solo-cambios-detector.zip`. Así no sobrescribes otros ajustes hechos después de la versión v3.

1. Abre **GitHub Desktop** y selecciona el repositorio de Impulso Juvenil.
2. Crea una rama nueva, por ejemplo `detector-brechas-v4`, desde la rama que tiene los cambios más recientes.
3. Elige **Repository → Show in Explorer**.
4. Extrae el ZIP de *solo cambios*. Copia su contenido a la raíz de la carpeta del repositorio, **conservando** las carpetas `app/`, `components/`, `lib/` y `scripts/`.
5. Cuando Windows lo solicite, elige **Reemplazar los archivos en el destino**. No borres `.git`, `.env` ni `node_modules`.
6. En GitHub Desktop comprueba los cambios, escribe `Agregar detector de brechas laborales` y pulsa **Commit**, después **Publish branch**.
7. En Vercel revisa el despliegue Preview y asegúrate de que termine en **Ready**. Prueba con cuentas municipal, provincial, regional y administrador.
8. Si todo funciona, fusiona la rama en `main` para publicar la actualización.

El ZIP completo `impulso-juvenil-v4-detector-brechas.zip` está disponible si necesitas una copia integral. Está basado en el último proyecto v3 preparado en esta conversación; podría no contener cambios posteriores que tú hayas hecho en otro lugar.

## 6. ¿Debo ejecutar SQL en Neon?

**No para esta funcionalidad**, siempre que ya tengas la versión v3 con la tabla `estadistica_municipal` y los indicadores de muestra. El detector reutiliza:

- `beneficiarios` / `interes_laboral`.
- `ofertas` / `sector_oferta`.
- `beneficiarios` / `barrera` para la nota transversal de capacitación.

Si falta alguna dimensión necesaria para un periodo/comuna, el detector mostrará un mensaje explicando que faltan desgloses y **no fabricará conclusiones**. La web necesita los mismos valores de entorno de v3 y **no requiere una API de IA**, tokens de v0 ni otra suscripción.

## 7. Pruebas

En la carpeta del repositorio con Node.js 22 o superior:

```bash
npm run demo:verify
npm run demo:verify:detector
npm run build
```

Las dos primeras verificaciones pueden ejecutarse sin base de datos. La tercera requiere instalar las dependencias (`npm install` o el gestor configurado en tu proyecto).

La comprobación local de esta entrega ejecutó los dos scripts de verificación y revisó la sintaxis TS/TSX. **No se ejecutó una compilación Next.js completa con dependencias ni se modificó Neon o Vercel remotamente.**

## 8. Pruebas manuales en Vercel

1. Inicia sesión como administrador. Abre **Detector de brechas** desde el menú.
2. Selecciona una comuna, una provincia y la región completa (si tu plan permite esas vistas). Las cifras y orientaciones deben actualizarse.
3. Prueba el filtro `Atención prioritaria` y pulsa un sector para ver la explicación.
4. Descarga **Diagnóstico CSV** y el PDF/Excel de la sección Reportes.
5. Inicia sesión como cuenta municipal aprobada: no debería poder consultar datos de otras comunas, ni desde el selector, ni desde las descargas.
6. Cuenta pendiente: no debe poder acceder al panel.

## 9. Ejemplo con la muestra regional sintética de v3

De la muestra regional de **10.000 perfiles** y **1.200 publicaciones**:

- **Administración básica:** 6,9 % de intereses y 5,5 % de publicaciones → interés relativamente alto.
- **Alimentación:** 15,0 % de intereses y 18,0 % de publicaciones → oferta relativamente alta.
- Los demás sectores de la muestra quedan próximos en participación porcentual con el umbral elegido.

Estas cifras son **ficticias y no representan el mercado laboral efectivo del Biobío**. La herramienta propone focos de análisis, no adjudicaciones, perfiles individuales ni recomendaciones automatizadas de contratación.
