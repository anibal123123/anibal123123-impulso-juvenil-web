# Impulso Juvenil · Registro, inicio de sesión y administración

El ZIP conserva las pantallas actuales y el dashboard demostrativo. Agrega
registro e inicio de sesión reales con **Better Auth + PostgreSQL**. No utiliza
v0 para generar código, por lo que no requiere créditos de IA de v0.

## Qué se ha implementado

- `/`: iniciar sesión, crear cuenta y (opcionalmente) solicitar recuperación.
- `/panel`: requiere sesión; muestra la demostración con **datos ficticios**.
- `/demo`: sigue siendo pública y funciona sin autenticación.
- `/cuenta`: nombre, correo, fecha de alta, enlace al panel y cierre de sesión.
- `/admin/usuarios`: lista privada de registros (paginación, búsqueda y CSV).
- `/api/admin/usuarios`: API de consulta/exportación, exige autorización de admin **en el servidor**.
- `lib/auth.ts`: contraseñas de 10 a 128 caracteres con mayúscula, minúscula y número; validación del servidor. Better Auth almacena hash scrypt, nunca contraseñas recuperables.

## Requisitos

- Node.js compatible con Next.js 16, y pnpm o npm.
- Una base de datos **PostgreSQL persistente** (ejemplo: Neon o proveedor PostgreSQL de Vercel).
- Variables `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

### 1. Crear y preparar PostgreSQL

Crea una base PostgreSQL y ejecuta el archivo `scripts/initialize-db.sql` desde el
editor SQL del proveedor. El SQL crea las tablas para las cuentas y las demás
que estaban declaradas en el proyecto original. Si ya tienes datos reales,
revisa las migraciones antes de aplicar cambios.

**No** uses `localStorage` para registrar contraseñas ni una lista de usuarios
fijos en el código: los datos deben persistir en PostgreSQL.

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores. Ejemplo:

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=pega_aqui_un_valor_aleatorio_largo
BETTER_AUTH_URL=http://localhost:3000
ADMIN_USER_IDS=
```

Genera el secreto ejecutando en PowerShell (si tienes Node.js instalado):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Configura `BETTER_AUTH_URL` con la **URL HTTPS pública exacta** cuando despliegues,
por ejemplo `https://tu-proyecto.vercel.app`. No incluyas una barra final.

Las variables se deben introducir también en **Vercel → Proyecto → Settings →
Environment Variables**; luego despliega nuevamente la aplicación.

### 3. Ejecutar localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. Registra una cuenta de prueba y prueba cerrar/iniciar sesión.
**No funcionará el registro si todavía no conectaste PostgreSQL ni inicializaste sus tablas**.

### 4. Activar tu cuenta de administrador de manera segura

1. Registra tu cuenta normalmente desde `/`.
2. En el editor SQL de tu base de datos ejecuta:

   ```sql
   SELECT "id", "name", "email", "createdAt"
   FROM "user"
   ORDER BY "createdAt" DESC;
   ```

3. Copia **tu ID de usuario** y asígnalo a la variable privada `ADMIN_USER_IDS`
   (puede incluir varios IDs separados por comas).
4. Reinicia el servidor local o redepliega Vercel para cargar la variable.
5. Entra con esa cuenta a `/cuenta` y pulsa **Ver usuarios registrados**, o abre
   directamente `/admin/usuarios`.

**Nunca** actives admin automáticamente según un correo escrito durante el registro:
si un atacante registra ese correo antes que tú, podría ver todas las cuentas.
No pongas `ADMIN_USER_IDS` como variable `NEXT_PUBLIC_`.

### 5. Exportar y consultar registros

En `/admin/usuarios` hay un buscador, paginación y descarga CSV. Verás:
ID, nombre, correo, verificación y fecha de registro. **Las contraseñas no
se muestran ni se exportan** (tampoco sus hashes).

Puedes consultar también directamente los registros desde PostgreSQL:

```sql
SELECT "id", "name", "email", "emailVerified", "createdAt"
FROM "user" ORDER BY "createdAt" DESC;
```

### 6. Verificación de email y recuperación (opcional, recomendado para uso real)

Conecta un proveedor de correo como Resend, verifica un dominio remitente y
configura `RESEND_API_KEY` y `EMAIL_FROM` **en el servidor**. Con ambas variables,
el backend obliga a verificar el correo para poder iniciar sesión y habilita
recuperación mediante enlace de un solo uso. Sin esas dos variables, la creación
de cuentas y el login funcionan, pero no se verifica la propiedad del email
ni se permite recuperar contraseñas por correo.

Para una aplicación que recoja registros reales, también se aconseja
revisar la limitación de intentos persistente (ya configurada con PostgreSQL), políticas de privacidad,
consentimiento informado, supervisión de seguridad y copias de respaldo.

### 7. Publicación

La web publicada anteriormente en v0 **no cambia automáticamente** por tener un
ZIP editado. Para aplicar esta versión sube los archivos a tu repositorio y
despliega con Vercel. Conecta `DATABASE_URL` a una base de datos en la nube: no
uses una base instalada exclusivamente en tu computador.

Si tienes una integración GitHub-Vercel, sube estos archivos al repositorio y
se iniciará un nuevo despliegue según tu configuración. Si no, importa el
repositorio a Vercel. Antes de dar acceso a personas, prueba los permisos:

1. `/demo` abre sin cuenta.
2. `/panel`, `/cuenta` y `/admin/usuarios` no muestran datos privados sin sesión.
3. El registro persiste después de cerrar el navegador.
4. Usuarios normales no pueden abrir `/admin/usuarios` ni descargar CSV desde la API.
5. Solo tu ID listado en `ADMIN_USER_IDS` permite ver registros.

### Notas

- El panel de análisis del ZIP sigue utilizando datos ficticios en `/demo` y `/panel`.
- Los endpoints originales `/api/indicators`, `/api/reports`, etc. siguen
  requiriendo membresía de un organismo. **Crear una cuenta no asigna
  automáticamente membresía** y no habilita funciones privadas de organismos.
- El sistema de contraseñas se basa en Better Auth y PostgreSQL. Esta entrega
  requiere conectar tus propias credenciales: no podemos crear la base ni
  habilitar el entorno de Vercel desde un ZIP.
